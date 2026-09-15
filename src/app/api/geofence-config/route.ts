import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/geofence-config
 *
 * Public endpoint used by the staff/admin login form to perform a
 * client-side geofence pre-check BEFORE submitting credentials.
 *
 * Only returns the fields needed for the distance calculation — no
 * credentials, tokens, or internal hospital data are exposed.
 */
export async function GET() {
  try {
    const adminSupabase = createAdminClient();

    const { data: settings, error } = await adminSupabase
      .from('system_settings')
      .select(
        'geofence_enabled, geofence_latitude, geofence_longitude, geofence_radius_meters, geofence_enforce_roles, geofence_allow_admin_bypass'
      )
      .limit(1)
      .maybeSingle();

    if (error || !settings) {
      // Fail open — if we can't read settings, don't block login
      return NextResponse.json({ enabled: false });
    }

    return NextResponse.json({
      enabled: settings.geofence_enabled ?? false,
      latitude:
        settings.geofence_latitude && settings.geofence_latitude !== 0
          ? settings.geofence_latitude
          : -15.3875,
      longitude:
        settings.geofence_longitude && settings.geofence_longitude !== 0
          ? settings.geofence_longitude
          : 28.3228,
      radiusMeters: settings.geofence_radius_meters ?? 500,
      enforceRoles: (settings.geofence_enforce_roles as string[]) ?? [],
      allowAdminBypass: settings.geofence_allow_admin_bypass ?? true,
    });
  } catch {
    // Fail open on unexpected errors
    return NextResponse.json({ enabled: false });
  }
}
