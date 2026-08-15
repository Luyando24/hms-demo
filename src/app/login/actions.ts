'use server';

import { redirect } from 'next/navigation';
import { authenticateLogin } from '@/lib/login';
import { getSubdomainUrl } from '@/utils/subdomain';
import { getRoleLandingDestination } from '@/utils/rbac';
import { createClient } from '@/utils/supabase/server';

function loginError(message: string): never {
  redirect('/login?error=' + encodeURIComponent(message));
}

export async function signInWorkforce(formData: FormData) {
  const result = await authenticateLogin(formData, 'workforce');

  if (!result.ok) {
    let message = 'Invalid sign-in credentials.';
    if (result.reason === 'invalid-input') {
      message = 'Enter a valid email or staff ID and password.';
    } else if (result.reason === 'location-required') {
      message = 'Location permission is required to verify system access within the hospital geo-fence zone. Please enable location access in your browser and try again.';
    } else if (result.reason === 'geofence-denied') {
      message = `Access Denied: You are outside the authorized hospital geo-fence zone (Current distance: ${result.distance ?? 'Unknown'}, Permitted radius: ${result.limit ?? 'Unknown'}).`;
    }
    loginError(message);
  }

  const destination = getRoleLandingDestination(result.role);
  if (!destination) {
    loginError('Your account does not have a valid access profile.');
  }

  redirect(getSubdomainUrl(destination.subdomain, destination.path));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(getSubdomainUrl(null, '/login'));
}
