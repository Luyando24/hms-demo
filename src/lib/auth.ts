import 'server-only';

import type { User } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/server';
import type { UserRole } from '@/utils/rbac';

const KNOWN_ROLES: readonly UserRole[] = [
  'ADMIN',
  'DOCTOR',
  'NURSE',
  'PHARMACIST',
  'LAB_TECH',
  'RADIOLOGIST',
  'ACCOUNTANT',
  'RECEPTIONIST',
  'WAITING_ROOM',
  'STAFF',
  'PATIENT',
];

// Authorization failures are safe to return to callers.

export class AuthorizationError extends Error {
  constructor(message = 'You are not authorized to perform this action.') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

function isKnownRole(value: string): value is UserRole {
  return KNOWN_ROLES.includes(value as UserRole);
}

export async function requireAuthenticatedUser(): Promise<{
  user: User;
  role: UserRole;
  supabase: Awaited<ReturnType<typeof createClient>>;
}> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new AuthorizationError('Please sign in to continue.');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const normalizedRole = profile?.role?.toUpperCase();
  if (profileError || !normalizedRole || !isKnownRole(normalizedRole)) {
    throw new AuthorizationError('Your account does not have a valid access profile.');
  }

  return { user, role: normalizedRole, supabase };
}

export async function requireRole(
  allowedRoles: readonly UserRole[],
): Promise<{
  user: User;
  role: UserRole;
  supabase: Awaited<ReturnType<typeof createClient>>;
}> {
  const actor = await requireAuthenticatedUser();
  if (!allowedRoles.includes(actor.role)) {
    throw new AuthorizationError();
  }
  return actor;
}
