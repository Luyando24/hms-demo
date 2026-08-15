import {
  calculateHaversineDistance,
  formatDistance,
  isLocationWithinGeofence,
  type GeofenceConfig,
} from '../geofence';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

export function runGeofenceTests() {
  // 1. calculateHaversineDistance
  const dSame = calculateHaversineDistance(-15.3875, 28.3228, -15.3875, 28.3228);
  assert(dSame === 0, 'Distance to same point should be 0');

  const dNearby = calculateHaversineDistance(-15.3875, 28.3228, -15.389, 28.324);
  assert(dNearby > 150 && dNearby < 300, 'Distance should be roughly 200 meters');

  // 2. formatDistance
  assert(formatDistance(450) === '450 m', 'Should format 450 meters');
  assert(formatDistance(1500) === '1.50 km', 'Should format 1.5km');

  // 3. isLocationWithinGeofence
  const config: GeofenceConfig = {
    enabled: true,
    latitude: -15.3875,
    longitude: 28.3228,
    radiusMeters: 500,
    enforceRoles: ['DOCTOR', 'NURSE', 'RECEPTIONIST'],
    allowAdminBypass: true,
  };

  // Disabled check
  const disabledRes = isLocationWithinGeofence(-10, 10, 'DOCTOR', { ...config, enabled: false });
  assert(disabledRes.allowed === true && disabledRes.reason === 'disabled', 'Disabled geofence should allow access');

  // Admin bypass
  const adminRes = isLocationWithinGeofence(-10, 10, 'ADMIN', config);
  assert(adminRes.allowed === true && adminRes.reason === 'admin-bypassed', 'Admin bypass should allow access');

  // Exempt role
  const exemptRes = isLocationWithinGeofence(-10, 10, 'PATIENT', config);
  assert(exemptRes.allowed === true && exemptRes.reason === 'role-exempt', 'Exempt role should allow access');

  // Enforced role inside radius
  const insideRes = isLocationWithinGeofence(-15.3876, 28.3229, 'DOCTOR', config);
  assert(insideRes.allowed === true && insideRes.reason === undefined, 'Enforced role inside radius should be allowed');

  // Enforced role outside radius
  const outsideRes = isLocationWithinGeofence(-15.4875, 28.4228, 'DOCTOR', config);
  assert(outsideRes.allowed === false && outsideRes.reason === 'out-of-bounds', 'Enforced role outside radius should be denied');

  console.log('All Geofence unit tests passed successfully!');
}
