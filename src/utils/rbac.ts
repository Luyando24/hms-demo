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
  | 'STAFF' 
  | 'PATIENT';

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
    '/hospital/staff',
    '/hospital/admin/departments',
    '/hospital/admin/rooms',
    '/hospital/hr',
    '/hospital/reports',
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
  ],
  PHARMACIST: [
    '/hospital/dashboard',
    '/hospital/patients',
    '/hospital/inventory',
  ],
  LAB_TECH: [
    '/hospital/dashboard',
    '/hospital/patients',
    '/hospital/laboratory',
  ],
  RADIOLOGIST: [
    '/hospital/dashboard',
    '/hospital/patients',
    '/hospital/radiology',
  ],
  ACCOUNTANT: [
    '/hospital/dashboard',
    '/hospital/reception',
    '/hospital/patients',
    '/hospital/billing',
    '/hospital/reports',
  ],
  RECEPTIONIST: [
    '/hospital/dashboard',
    '/hospital/reception',
    '/hospital/patients',
    '/hospital/billing',
  ],
  STAFF: [
    '/hospital/dashboard',
    '/hospital/patients',
  ]
};

export function isRouteAllowedForRole(role: string | undefined | null, pathname: string): boolean {
  if (!role) return true; // Default fallback while loading
  const normalizedRole = role.toUpperCase();
  const allowedRoutes = ROLE_PERMISSIONS[normalizedRole] || ROLE_PERMISSIONS['ADMIN'];
  return allowedRoutes.some(route => pathname === route || pathname.startsWith(route + '/'));
}
