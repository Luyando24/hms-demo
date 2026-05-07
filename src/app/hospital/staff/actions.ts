'use server'

import { createClient } from '@supabase/supabase-js'

// Create a Supabase client with the service role key for administrative tasks
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function createStaffMember(formData: {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  role: string;
  staffNumber?: string;
}) {
  try {
    // 1. Create the user in Auth with admin privileges
    // This bypasses email confirmation and public rate limits
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: formData.email,
      password: formData.password || 'password123',
      email_confirm: true, // Automatically confirm the email
      user_metadata: {
        first_name: formData.firstName,
        last_name: formData.lastName,
        role: formData.role
      }
    });

    if (authError) throw authError;

    // 2. The trigger in the database handles the profile creation and staff_number generation
    // But we can explicitly update it if a custom staff number was provided
    if (formData.staffNumber && authData.user) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ staff_number: formData.staffNumber })
        .eq('id', authData.user.id);
      
      if (profileError) throw profileError;
    }

    return { success: true, user: authData.user };
  } catch (error: any) {
    console.error('Error creating staff:', error);
    return { success: false, error: error.message };
  }
}
