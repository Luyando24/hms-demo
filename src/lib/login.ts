import 'server-only';

import { z } from 'zod';
import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';
import { ROLE_PERMISSIONS, type UserRole } from '@/utils/rbac';

import { isLocationWithinGeofence } from '@/utils/geofence';

export type LoginAudience = 'patient' | 'staff' | 'admin';

export type LoginResult =
  | { ok: true; role: UserRole }
  | {
      ok: false;
      reason:
        | 'invalid-input'
        | 'invalid-credentials'
        | 'location-required'
        | 'geofence-denied';
      distance?: string;
      limit?: string;
    };

function parseCoordinate(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  const num = Number(val);
  if (isNaN(num) || !isFinite(num) || num === 0) return null;
  return num;
}

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

  if (audience === 'admin') {
    return role === 'ADMIN';
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
  const latitude = parseCoordinate(formData.get('latitude'));
  const longitude = parseCoordinate(formData.get('longitude'));
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

    if (profile?.email) {
      effectiveEmail = profile.email;
    } else if (audience === 'patient') {
      // Fallback: Check patients table directly by file_number
      const { data: patient } = await adminSupabase
        .from('patients')
        .select('email, file_number')
        .eq('file_number', identifier.toUpperCase())
        .maybeSingle();

      if (patient) {
        effectiveEmail =
          patient.email ||
          `${patient.file_number.toLowerCase().replace(/[^a-z0-9]/g, '')}@patient.portal`;
      } else {
        return { ok: false, reason: 'invalid-credentials' };
      }
    } else {
      return { ok: false, reason: 'invalid-credentials' };
    }
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

  // Ensure patient record is linked to auth_user_id
  if (role === 'PATIENT') {
    const adminSupabase = createAdminClient();
    if (!identifier.includes('@')) {
      await adminSupabase
        .from('patients')
        .update({ auth_user_id: user.id })
        .eq('file_number', identifier.toUpperCase());
    } else {
      await adminSupabase
        .from('patients')
        .update({ auth_user_id: user.id })
        .ilike('email', identifier);
    }
  }

  // Geofence check for staff and administrator sign-in.
  if (audience !== 'patient') {
    const adminSupabase = createAdminClient();
    const { data: settings } = await adminSupabase
      .from('system_settings')
      .select(
        'geofence_enabled, geofence_latitude, geofence_longitude, geofence_radius_meters, geofence_enforce_roles, geofence_allow_admin_bypass'
      )
      .limit(1)
      .maybeSingle();

    if (settings && settings.geofence_enabled) {
      const geofenceConfig = {
        enabled: settings.geofence_enabled,
        latitude: (settings.geofence_latitude && settings.geofence_latitude !== 0) ? settings.geofence_latitude : -15.3875,
        longitude: (settings.geofence_longitude && settings.geofence_longitude !== 0) ? settings.geofence_longitude : 28.3228,
        radiusMeters: settings.geofence_radius_meters ?? 500,
        enforceRoles: (settings.geofence_enforce_roles as string[]) || [],
        allowAdminBypass: settings.geofence_allow_admin_bypass ?? true,
      };

      const isEnforced =
        role !== 'ADMIN' || !geofenceConfig.allowAdminBypass;
      const isRoleTargeted = geofenceConfig.enforceRoles.some(
        (r) => r.toUpperCase() === role
      );

      if (isEnforced && isRoleTargeted) {
        if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
          await supabase.auth.signOut();
          return { ok: false, reason: 'location-required' };
        }

        const check = isLocationWithinGeofence(latitude, longitude, role, geofenceConfig);
        if (!check.allowed) {
          await supabase.auth.signOut();
          return {
            ok: false,
            reason: 'geofence-denied',
            distance: check.formattedDistance,
            limit: check.formattedLimit,
          };
        }
      }
    }
  }

  return { ok: true, role };
}
