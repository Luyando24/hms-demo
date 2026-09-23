import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getClientIp, isClientOnHospitalNetwork, DEFAULT_HOSPITAL_SUBNETS } from '@/utils/network-check';
import { verifyWorkstationToken, WORKSTATION_COOKIE_NAME } from '@/utils/workstation';

export const dynamic = 'force-dynamic';

/**
 * GET /api/geofence-config
 *
 * Public endpoint used by the staff/admin login form to perform a
 * pre-check BEFORE submitting credentials.
 *
 * Checks:
 * 1. Is the device an authorized Trusted Workstation (token provided)?
 * 2. Is the device connected to the Hospital LAN / Wi-Fi subnet?
 * 3. If neither, provides GPS center coordinates & radius for browser geolocation fallback.
 */
export async function GET(req: NextRequest) {
  try {
    const adminSupabase = createAdminClient();

    const { data: settings } = await adminSupabase
      .from('system_settings')
      .select(
        'geofence_enabled, geofence_latitude, geofence_longitude, geofence_radius_meters, geofence_enforce_roles, geofence_allow_admin_bypass, geofence_network_check_enabled, geofence_allowed_subnets, geofence_allowed_ips, geofence_trusted_workstations_enabled'
      )
      .limit(1)
      .maybeSingle();

    const isGeofenceEnabled = settings?.geofence_enabled ?? false;

    if (!settings || !isGeofenceEnabled) {
      // Geofencing is completely disabled globally
      return NextResponse.json({
        enabled: false,
        verified: true,
        method: 'disabled',
      });
    }

    const networkCheckEnabled = (settings as any).geofence_network_check_enabled ?? true;
    const workstationsEnabled = (settings as any).geofence_trusted_workstations_enabled ?? true;
    const allowedSubnets = (settings as any).geofence_allowed_subnets ?? DEFAULT_HOSPITAL_SUBNETS;
    const allowedIps = (settings as any).geofence_allowed_ips ?? [];

    const clientIp = getClientIp(req.headers);

    // 1. Check for Trusted Workstation token
    const tokenFromHeader = req.headers.get('x-workstation-token');
    const tokenFromCookie = req.cookies.get(WORKSTATION_COOKIE_NAME)?.value;
    const tokenFromQuery = req.nextUrl.searchParams.get('workstation_token');
    const rawToken = tokenFromHeader || tokenFromCookie || tokenFromQuery;

    if (workstationsEnabled && rawToken) {
      const { valid, workstation } = await verifyWorkstationToken(rawToken);
      if (valid && workstation) {
        return NextResponse.json({
          enabled: true,
          verified: true,
          method: 'trusted_workstation',
          workstationName: workstation.name,
          clientIp,
          allowAdminBypass: settings.geofence_allow_admin_bypass ?? true,
          enforceRoles: (settings.geofence_enforce_roles as string[]) ?? [],
        });
      }
    }

    // 2. Check for Hospital Network (LAN / Subnet / Static IP)
    if (networkCheckEnabled) {
      const isOnHospitalNetwork = isClientOnHospitalNetwork(clientIp, allowedSubnets, allowedIps);
      if (isOnHospitalNetwork) {
        return NextResponse.json({
          enabled: true,
          verified: true,
          method: 'hospital_network',
          clientIp,
          allowAdminBypass: settings.geofence_allow_admin_bypass ?? true,
          enforceRoles: (settings.geofence_enforce_roles as string[]) ?? [],
        });
      }
    }

    // 3. Neither matched — Fallback to GPS Geofence check
    return NextResponse.json({
      enabled: true,
      verified: false,
      method: 'gps',
      clientIp,
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
      networkCheckEnabled,
      workstationsEnabled,
    });
  } catch (err) {
    console.error('Error checking geofence config:', err);
    // Fail open on unexpected errors so critical hospital care is not blocked
    return NextResponse.json({ enabled: false, verified: true });
  }
}
