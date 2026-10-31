'use server';

import { redirect } from 'next/navigation';
import { authenticateLogin } from '@/lib/login';
import { getSubdomainUrl } from '@/utils/subdomain';
import { getRoleLandingDestination } from '@/utils/rbac';
import { createClient } from '@/utils/supabase/server';
import { logAuditEvent } from '@/utils/auditLogger';

function loginError(audience: 'staff' | 'admin', message: string): never {
  const targetUrl = getSubdomainUrl(audience, '/login?error=' + encodeURIComponent(message));
  redirect(targetUrl);
}

async function signInWorkforce(
  formData: FormData,
  audience: 'staff' | 'admin',
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
    loginError(audience, message);
  }

  const destination = getRoleLandingDestination(result.role);
  if (!destination) {
    loginError(audience, 'Your account does not have a valid access profile.');
  }

  // Record audit log entry for user login
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      void logAuditEvent({
        userId: user.id,
        actorName: user.email || 'Authenticated User',
        actorRole: result.role,
        action: 'LOGIN',
        module: 'AUTH',
        recordId: user.id,
        recordType: 'auth_user',
        metadata: { audience, role: result.role },
      });
    }
  } catch {
    // Non-blocking
  }

  redirect(getSubdomainUrl(destination.subdomain, destination.path));
}

export async function signInStaff(formData: FormData) {
  return signInWorkforce(formData, 'staff');
}

export async function signInAdmin(formData: FormData) {
  return signInWorkforce(formData, 'admin');
}

export async function signOut() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    void logAuditEvent({
      userId: user.id,
      actorName: user.email,
      action: 'LOGOUT',
      module: 'AUTH',
      recordId: user.id,
      recordType: 'auth_user',
    });
  }
  await supabase.auth.signOut({ scope: 'local' });
  redirect(getSubdomainUrl(null, '/login'));
}
