// Role-Based Access Control (RBAC) rules for Hospital Management System

export type UserRole = 
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
  ADMIN: { subdomain: 'admin', path: '/hospital/dashboard' },
  DOCTOR: { subdomain: 'staff', path: '/hospital/opd' },
  NURSE: { subdomain: 'staff', path: '/hospital/ipd' },
  PHARMACIST: { subdomain: 'staff', path: '/hospital/inventory' },
  LAB_TECH: { subdomain: 'staff', path: '/hospital/laboratory' },
  RADIOLOGIST: { subdomain: 'staff', path: '/hospital/radiology' },
  ACCOUNTANT: { subdomain: 'staff', path: '/hospital/finance' },
  RECEPTIONIST: { subdomain: 'staff', path: '/hospital/reception' },
  WAITING_ROOM: { subdomain: 'staff', path: '/hospital/queue-display' },
  STAFF: { subdomain: 'staff', path: '/hospital/dashboard' },
  PATIENT: { subdomain: 'patient', path: '/patient/portal' },
};

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: [
    '/hospital/dashboard',
    '/hospital/reception',
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
    '/hospital/hr',
    '/hospital/reports',
    '/hospital/settings',
    '/hospital/queue-display',
  ],
  DOCTOR: [
    '/hospital/dashboard',
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
    '/hospital/patients',
    '/hospital/billing',
    '/hospital/finance',
    '/hospital/reports',
    '/hospital/settings',
  ],
  RECEPTIONIST: [
    '/hospital/dashboard',
    '/hospital/reception',
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
    '/hospital/patients',
    '/hospital/settings',
    '/hospital/queue-display',
  ]
};

export function isRouteAllowedForRole(role: string | undefined | null, pathname: string): boolean {
  if (!role) return false;
  const normalizedRole = role.toUpperCase();
  const allowedRoutes = ROLE_PERMISSIONS[normalizedRole];
  if (!allowedRoutes) return false;
  return allowedRoutes.some(route => pathname === route || pathname.startsWith(route + '/'));
}

export function getRoleLandingDestination(
  role: string | undefined | null,
): RoleLandingDestination | null {
  if (!role) return null;
  const normalizedRole = role.toUpperCase() as UserRole;
  return ROLE_LANDING_DESTINATIONS[normalizedRole] ?? null;
}
