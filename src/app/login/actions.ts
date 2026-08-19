'use server';

import { redirect } from 'next/navigation';
import { authenticateLogin } from '@/lib/login';
import { getSubdomainUrl } from '@/utils/subdomain';
import { getRoleLandingDestination } from '@/utils/rbac';
import { createClient } from '@/utils/supabase/server';

function loginError(path: '/login/staff' | '/login/admin', message: string): never {
  redirect(path + '?error=' + encodeURIComponent(message));
}

async function signInWorkforce(
  formData: FormData,
  audience: 'staff' | 'admin',
  loginPath: '/login/staff' | '/login/admin',
) {
  const result = await authenticateLogin(formData, audience);

  if (!result.ok) {
    let message = 'Invalid sign-in credentials.';
    if (result.reason === 'invalid-input') {
      message = 'Enter a valid email or staff ID and password.';
    } else if (result.reason === 'location-required') {
      message = 'Location permission is required to verify system access within the hospital geo-fence zone. Please enable location access in your browser and try again.';
    } else if (result.reason === 'geofence-denied') {
      message = `Access Denied: You are outside the authorized hospital geo-fence zone (Current distance: ${result.distance ?? 'Unknown'}, Permitted radius: ${result.limit ?? 'Unknown'}).`;
    }
    loginError(loginPath, message);
  }

  const destination = getRoleLandingDestination(result.role);
  if (!destination) {
    loginError(loginPath, 'Your account does not have a valid access profile.');
  }

  redirect(getSubdomainUrl(destination.subdomain, destination.path));
}

export async function signInStaff(formData: FormData) {
  return signInWorkforce(formData, 'staff', '/login/staff');
}

export async function signInAdmin(formData: FormData) {
  return signInWorkforce(formData, 'admin', '/login/admin');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(getSubdomainUrl(null, '/login'));
}
