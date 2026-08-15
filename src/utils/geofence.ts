export interface GeofenceConfig {
  enabled: boolean;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  enforceRoles: string[];
  allowAdminBypass: boolean;
}

export interface GeofenceCheckResult {
  allowed: boolean;
  distanceMeters: number;
  formattedDistance: string;
  formattedLimit: string;
  reason?: 'out-of-bounds' | 'disabled' | 'role-exempt' | 'admin-bypassed';
}

/**
 * Calculates Great Circle distance between two GPS coordinates in meters
 * using the Haversine formula.
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (lat1 === lat2 && lon1 === lon2) {
    return 0;
  }

  const EARTH_RADIUS_METERS = 6371000;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const radLat1 = toRadians(lat1);
  const radLat2 = toRadians(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(radLat1) * Math.cos(radLat2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

/**
 * Formats a distance in meters into a human-readable string (m or km).
 */
export function formatDistance(distanceMeters: number): string {
  const rounded = Math.round(distanceMeters);
  if (rounded >= 1000) {
    return `${(rounded / 1000).toFixed(2)} km`;
  }
  return `${rounded} m`;
}

/**
 * Evaluates whether a user's current GPS location falls within the allowed geo-fence zone.
 */
export function isLocationWithinGeofence(
  userLat: number,
  userLng: number,
  userRole: string,
  config: GeofenceConfig
): GeofenceCheckResult {
  const roleUpper = userRole.toUpperCase();

  // 1. If geofence is disabled globally
  if (!config.enabled) {
    return {
      allowed: true,
      distanceMeters: 0,
      formattedDistance: '0 m',
      formattedLimit: formatDistance(config.radiusMeters),
      reason: 'disabled',
    };
  }

  // 2. Admin bypass check
  if (roleUpper === 'ADMIN' && config.allowAdminBypass) {
    return {
      allowed: true,
      distanceMeters: 0,
      formattedDistance: '0 m',
      formattedLimit: formatDistance(config.radiusMeters),
      reason: 'admin-bypassed',
    };
  }

  // 3. Role enforcement check
  const isEnforcedRole = config.enforceRoles.some(
    (r) => r.toUpperCase() === roleUpper
  );

  if (!isEnforcedRole) {
    return {
      allowed: true,
      distanceMeters: 0,
      formattedDistance: '0 m',
      formattedLimit: formatDistance(config.radiusMeters),
      reason: 'role-exempt',
    };
  }

  // 4. Resolve center coordinates (fallback to facility default if unconfigured 0,0)
  const centerLat = (config.latitude && config.latitude !== 0) ? config.latitude : -15.3875;
  const centerLng = (config.longitude && config.longitude !== 0) ? config.longitude : 28.3228;

  // 5. Calculate Haversine distance
  const distanceMeters = calculateHaversineDistance(
    userLat,
    userLng,
    centerLat,
    centerLng
  );

  const allowed = distanceMeters <= config.radiusMeters;

  return {
    allowed,
    distanceMeters: Math.round(distanceMeters),
    formattedDistance: formatDistance(distanceMeters),
    formattedLimit: formatDistance(config.radiusMeters),
    reason: allowed ? undefined : 'out-of-bounds',
  };
}
