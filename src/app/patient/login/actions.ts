'use server';

import { redirect } from 'next/navigation';
import { authenticateLogin } from '@/lib/login';
import { getSubdomainUrl } from '@/utils/subdomain';
import { getRoleLandingDestination } from '@/utils/rbac';
import { createClient } from '@/utils/supabase/server';

import { createAdminClient } from '@/utils/supabase/admin';

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

export async function setupPatientFirstTimePasswordAction(formData: FormData): Promise<{
  success: boolean;
  error?: string;
  redirectTo?: string;
}> {
  try {
    const rawIdentifier = ((formData.get('identifier') as string) || '').trim();
    const rawDob = ((formData.get('dob') as string) || '').trim();
    const password = ((formData.get('password') as string) || '').trim();
    const confirmPassword = ((formData.get('confirm_password') as string) || '').trim();

    if (!rawIdentifier || !rawDob || !password) {
      return {
        success: false,
        error: 'Please enter your File Number or Email, Date of Birth, and your new password.',
      };
    }

    if (password.length < 8) {
      return {
        success: false,
        error: 'Password must be at least 8 characters long.',
      };
    }

    if (password !== confirmPassword) {
      return {
        success: false,
        error: 'Passwords do not match. Please verify and try again.',
      };
    }

    const adminSupabase = createAdminClient();

    // 1. Locate matching patient by File Number or Email
    let query = adminSupabase.from('patients').select('*');
    if (rawIdentifier.includes('@')) {
      query = query.ilike('email', rawIdentifier);
    } else {
      query = query.eq('file_number', rawIdentifier.toUpperCase());
    }

    const { data: patient, error: patientError } = await query.maybeSingle();

    if (patientError || !patient) {
      return {
        success: false,
        error:
          'No patient record found matching that File Number or Email. Please check with hospital reception.',
      };
    }

    // 2. Validate Date of Birth security challenge
    const patientDobStr = patient.dob ? new Date(patient.dob).toISOString().split('T')[0] : '';
    const inputDobStr = rawDob ? new Date(rawDob).toISOString().split('T')[0] : '';

    if (!patientDobStr || patientDobStr !== inputDobStr) {
      return {
        success: false,
        error:
          'Date of Birth does not match hospital census records for this patient. Please verify and try again.',
      };
    }

    // 3. Determine login email
    const portalEmail =
      patient.email ||
      `${patient.file_number.toLowerCase().replace(/[^a-z0-9]/g, '')}@patient.portal`;

    // 4. Ensure Supabase Auth user exists or create it
    let authUserId = patient.auth_user_id;

    if (!authUserId) {
      const {
        data: { users },
      } = await adminSupabase.auth.admin.listUsers();
      const existingUser = users.find(
        (u) => u.email?.toLowerCase() === portalEmail.toLowerCase(),
      );

      if (existingUser) {
        authUserId = existingUser.id;
      } else {
        const { data: newUser, error: createError } =
          await adminSupabase.auth.admin.createUser({
            email: portalEmail,
            password: password,
            email_confirm: true,
            user_metadata: {
              first_name: patient.first_name,
              last_name: patient.last_name,
              file_number: patient.file_number,
            },
            app_metadata: {
              role: 'PATIENT',
              file_number: patient.file_number,
            },
          });

        if (createError || !newUser?.user) {
          return {
            success: false,
            error:
              createError?.message ||
              'Failed to create portal authentication account.',
          };
        }

        authUserId = newUser.user.id;
      }
    }

    // Update password, metadata & confirm email
    const { error: updateAuthError } = await adminSupabase.auth.admin.updateUserById(
      authUserId,
      {
        password: password,
        email_confirm: true,
        app_metadata: {
          role: 'PATIENT',
          file_number: patient.file_number,
        },
      },
    );

    if (updateAuthError) {
      return {
        success: false,
        error: `Failed to set password: ${updateAuthError.message}`,
      };
    }

    // Upsert profiles record
    await adminSupabase.from('profiles').upsert({
      id: authUserId,
      first_name: patient.first_name,
      last_name: patient.last_name,
      email: portalEmail,
      file_number: patient.file_number,
      role: 'PATIENT',
    });

    // Ensure patient record is linked
    await adminSupabase
      .from('patients')
      .update({
        auth_user_id: authUserId,
        email: patient.email || portalEmail,
      })
      .eq('id', patient.id);

    // 5. Sign in the patient immediately
    const supabase = await createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: portalEmail,
      password: password,
    });

    if (signInError) {
      return {
        success: true,
        redirectTo:
          '/patient/login?success=' +
          encodeURIComponent('Password set successfully! Please sign in with your new password.'),
      };
    }

    return {
      success: true,
      redirectTo: '/patient/portal',
    };
  } catch (err: any) {
    return {
      success: false,
      error:
        err?.message || 'An unexpected error occurred while setting up your password.',
    };
  }
}

export async function patientSignOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(getSubdomainUrl(null, '/patient/login'));
}
