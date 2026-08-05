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
    const message = result.reason === 'invalid-input'
      ? 'Enter a valid email or staff ID and password.'
      : 'Invalid sign-in credentials.';
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
