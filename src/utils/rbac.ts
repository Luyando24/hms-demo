// Role-Based Access Control (RBAC) rules for Hospital Management System

export type UserRole = 
  | 'SUPER_USER'
  | 'ADMIN' 
  | 'DOCTOR' 
  | 'NURSE' 
  | 'PHARMACIST' 
  | 'LAB_TECH' 
  | 'RADIOLOGIST' 
  | 'ACCOUNTANT' 
  | 'RECEPTIONIST' 
  | 'WAITING_ROOM' 
  | 'STAFF' 
  | 'PATIENT';

export interface RoleLandingDestination {
  subdomain: 'patient' | 'staff' | 'admin';
  path: string;
}

export const ROLE_LANDING_DESTINATIONS: Record<UserRole, RoleLandingDestination> = {
  SUPER_USER: { subdomain: 'admin', path: '/hospital/dashboard' },
  ADMIN: { subdomain: 'admin', path: '/hospital/dashboard' },
  DOCTOR: { subdomain: 'staff', path: '/hospital/opd' },
  NURSE: { subdomain: 'staff', path: '/hospital/ipd' },
  PHARMACIST: { subdomain: 'staff', path: '/hospital/inventory' },
  LAB_TECH: { subdomain: 'staff', path: '/hospital/laboratory' },
  RADIOLOGIST: { subdomain: 'staff', path: '/hospital/radiology' },
  ACCOUNTANT: { subdomain: 'staff', path: '/hospital/billing' },
  RECEPTIONIST: { subdomain: 'staff', path: '/hospital/reception' },
  WAITING_ROOM: { subdomain: 'staff', path: '/hospital/queue-display' },
  STAFF: { subdomain: 'staff', path: '/hospital/dashboard' },
  PATIENT: { subdomain: 'patient', path: '/patient/portal' },
};

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_USER: [
    '/hospital/dashboard',
    '/hospital/reception',
    '/hospital/appointments',
    '/hospital/patients',
    '/hospital/er',
    '/hospital/ipd',
    '/hospital/opd',
    '/hospital/icu',
    '/hospital/radiology',
    '/hospital/laboratory',
    '/hospital/inventory',
    '/hospital/bloodbank',
    '/hospital/billing',
    '/hospital/finance',
    '/hospital/assets',
    '/hospital/management',
    '/hospital/staff',
    '/hospital/admin/departments',
    '/hospital/admin/rooms',
    '/hospital/admin/inventory-categories',
    '/hospital/admin/data-management',
    '/hospital/admin/audit',
    '/hospital/hr',
    '/hospital/reports',
    '/hospital/settings',
    '/hospital/queue-display',
  ],
  ADMIN: [
    '/hospital/dashboard',
    '/hospital/reception',
    '/hospital/appointments',
    '/hospital/patients',
    '/hospital/er',
    '/hospital/ipd',
    '/hospital/opd',
    '/hospital/icu',
    '/hospital/radiology',
    '/hospital/laboratory',
    '/hospital/inventory',
    '/hospital/bloodbank',
    '/hospital/billing',
    '/hospital/assets',
    '/hospital/management',
    '/hospital/staff',
    '/hospital/admin/departments',
    '/hospital/admin/rooms',
    '/hospital/admin/inventory-categories',
    '/hospital/admin/audit',
    '/hospital/hr',
    '/hospital/reports',
    '/hospital/settings',
    '/hospital/queue-display',
  ],
  DOCTOR: [
    '/hospital/dashboard',
    '/hospital/appointments',
    '/hospital/patients',
    '/hospital/er',
    '/hospital/ipd',
    '/hospital/opd',
    '/hospital/icu',
    '/hospital/radiology',
    '/hospital/laboratory',
    '/hospital/inventory',
    '/hospital/settings',
    '/hospital/queue-display',
  ],
  NURSE: [
    '/hospital/dashboard',
    '/hospital/reception',
    '/hospital/appointments',
    '/hospital/patients',
    '/hospital/er',
    '/hospital/ipd',
    '/hospital/opd',
    '/hospital/icu',
    '/hospital/laboratory',
    '/hospital/inventory',
    '/hospital/bloodbank',
    '/hospital/settings',
    '/hospital/queue-display',
  ],
  PHARMACIST: [
    '/hospital/dashboard',
    '/hospital/patients',
    '/hospital/inventory',
    '/hospital/admin/inventory-categories',
    '/hospital/settings',
  ],
  LAB_TECH: [
    '/hospital/dashboard',
    '/hospital/patients',
    '/hospital/laboratory',
    '/hospital/settings',
  ],
  RADIOLOGIST: [
    '/hospital/dashboard',
    '/hospital/patients',
    '/hospital/radiology',
    '/hospital/settings',
  ],
  ACCOUNTANT: [
    '/hospital/dashboard',
    '/hospital/reception',
    '/hospital/appointments',
    '/hospital/patients',
    '/hospital/billing',
    '/hospital/reports',
    '/hospital/settings',
  ],
  RECEPTIONIST: [
    '/hospital/dashboard',
    '/hospital/reception',
    '/hospital/appointments',
    '/hospital/patients',
    '/hospital/billing',
    '/hospital/settings',
    '/hospital/queue-display',
  ],
  WAITING_ROOM: [
    '/hospital/queue-display',
    '/hospital/settings',
  ],
  STAFF: [
    '/hospital/dashboard',
    '/hospital/appointments',
    '/hospital/patients',
    '/hospital/settings',
    '/hospital/queue-display',
  ]
};

export function isRouteAllowedForRole(role: string | undefined | null, pathname: string): boolean {
  const normalizedRole = (role ? role.toUpperCase() : 'ADMIN') as UserRole;
  const allowedRoutes = ROLE_PERMISSIONS[normalizedRole] || ROLE_PERMISSIONS.ADMIN;
  return allowedRoutes.some(route => pathname === route || pathname.startsWith(route + '/'));
}

export function getRoleLandingDestination(
  role: string | undefined | null,
): RoleLandingDestination | null {
  if (!role) return null;
  const normalizedRole = role.toUpperCase() as UserRole;
  return ROLE_LANDING_DESTINATIONS[normalizedRole] ?? null;
}

/**
 * Returns true if the user role is SUPER_USER.
 */
export function isSuperUser(role: string | undefined | null): boolean {
  if (!role) return false;
  return role.toUpperCase() === 'SUPER_USER';
}

/**
 * Checks whether a given role is permitted to view revenue analytics, EBITDA, and financial ledgers.
 * STRICT RULE: Only SUPER_USER has revenue analytics access.
 */
export function canAccessRevenueAnalytics(role: string | undefined | null): boolean {
  return isSuperUser(role);
}

/**
 * Checks whether a given role is permitted to execute sensitive deletions (e.g. data purge, assets, documents, patients).
 * STRICT RULE: Only SUPER_USER has sensitive deletion permissions.
 */
export function canPerformSensitiveDeletions(role: string | undefined | null): boolean {
  return isSuperUser(role);
}

/**
 * Checks whether a given role is permitted to view system audit logs.
 * Both SUPER_USER and ADMIN can review audit trails.
 */
export function canAccessAuditLogs(role: string | undefined | null): boolean {
  if (!role) return false;
  const upper = role.toUpperCase();
  return upper === 'SUPER_USER' || upper === 'ADMIN';
}
