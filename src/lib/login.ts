import 'server-only';

import { z } from 'zod';
import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';
import { ROLE_PERMISSIONS, type UserRole } from '@/utils/rbac';

export type LoginAudience = 'patient' | 'workforce';

export type LoginResult =
  | { ok: true; role: UserRole }
  | { ok: false; reason: 'invalid-input' | 'invalid-credentials' };

const loginSchema = z.object({
  identifier: z.string().trim().min(3).max(254),
  password: z.string().min(8).max(256),
});

function isRoleAllowedForAudience(
  role: string,
  audience: LoginAudience,
): role is UserRole {
  if (audience === 'patient') {
    return role === 'PATIENT';
  }

  return role !== 'PATIENT' && Boolean(ROLE_PERMISSIONS[role]);
}

export async function authenticateLogin(
  formData: FormData,
  audience: LoginAudience,
): Promise<LoginResult> {
  const parsed = loginSchema.safeParse({
    identifier: formData.get('identifier'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { ok: false, reason: 'invalid-input' };
  }

  const { identifier, password } = parsed.data;
  let effectiveEmail = identifier;

  if (!identifier.includes('@')) {
    if (!/^[A-Za-z0-9-]+$/.test(identifier)) {
      return { ok: false, reason: 'invalid-credentials' };
    }

    const identifierColumn = audience === 'patient' ? 'file_number' : 'staff_number';
    const adminSupabase = createAdminClient();
    const { data: profile, error: profileError } = await adminSupabase
      .from('profiles')
      .select('email')
      .eq(identifierColumn, identifier.toUpperCase())
      .maybeSingle();

    if (profileError || !profile?.email) {
      return { ok: false, reason: 'invalid-credentials' };
    }

    effectiveEmail = profile.email;
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: effectiveEmail,
    password,
  });

  if (signInError) {
    return { ok: false, reason: 'invalid-credentials' };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    await supabase.auth.signOut();
    return { ok: false, reason: 'invalid-credentials' };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  const role = profile?.role?.toUpperCase() ?? '';

  if (profileError || !isRoleAllowedForAudience(role, audience)) {
    await supabase.auth.signOut();
    return { ok: false, reason: 'invalid-credentials' };
  }

  return { ok: true, role };
}
