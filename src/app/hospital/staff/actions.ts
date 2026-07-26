'use server'

import { createClient } from '@supabase/supabase-js'

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

export async function generateSecureStaffId(role: string): Promise<string> {
  const rolePrefixes: Record<string, string> = {
    DOCTOR: 'MED-DOC',
    NURSE: 'CLN-NRS',
    PHARMACIST: 'PHM-PHR',
    LAB_TECH: 'LAB-TEC',
    RADIOLOGIST: 'RAD-IMG',
    ACCOUNTANT: 'FIN-ACC',
    RECEPTIONIST: 'ADM-RCP',
    ADMIN: 'SYS-ADM',
    STAFF: 'HMS-STF'
  };

  const prefix = rolePrefixes[role?.toUpperCase()] || 'HMS-STF';
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let hash = '';
  for (let i = 0; i < 6; i++) {
    hash += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${hash}`;
}

export async function createStaffMember(formData: {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  role: string;
  staffNumber?: string;
}) {
  try {
    const assignedStaffNumber = formData.staffNumber || (await generateSecureStaffId(formData.role));

    // 1. Create the user in Auth with admin privileges
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: formData.email,
      password: formData.password || 'password123',
      email_confirm: true,
      user_metadata: {
        first_name: formData.firstName,
        last_name: formData.lastName,
        role: formData.role,
        staff_number: assignedStaffNumber
      }
    });

    if (authError) throw authError;

    // 2. Explicitly update or set profile staff_number
    if (authData.user) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ 
          staff_number: assignedStaffNumber,
          role: formData.role
        })
        .eq('id', authData.user.id);
      
      if (profileError) throw profileError;
    }

    return { success: true, user: authData.user, staffNumber: assignedStaffNumber };
  } catch (error: any) {
    console.error('Error creating staff:', error);
    return { success: false, error: error.message };
  }
}
