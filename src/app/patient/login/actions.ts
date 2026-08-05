'use server';

import { redirect } from 'next/navigation';
import { authenticateLogin } from '@/lib/login';
import { getSubdomainUrl } from '@/utils/subdomain';
import { getRoleLandingDestination } from '@/utils/rbac';
import { createClient } from '@/utils/supabase/server';

function loginError(message: string): never {
  redirect('/patient/login?error=' + encodeURIComponent(message));
}

export async function signInPatient(formData: FormData) {
  const result = await authenticateLogin(formData, 'patient');

  if (!result.ok) {
    const message = result.reason === 'invalid-input'
      ? 'Enter a valid email or file number and password.'
      : 'Invalid sign-in credentials.';
    loginError(message);
  }

  const destination = getRoleLandingDestination(result.role);
  if (!destination) {
    loginError('Your account does not have a valid access profile.');
  }

  redirect(getSubdomainUrl(destination.subdomain, destination.path));
}

export async function patientSignOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(getSubdomainUrl(null, '/patient/login'));
}
