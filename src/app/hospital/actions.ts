"use server";

import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export async function registerPatientAction(patientData: any) {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  // 1. Insert patient record
  const { data: patient, error: patientError } = await supabase
    .from('patients')
    .insert(patientData)
    .select()
    .single();

  if (patientError) {
    return { error: patientError.message };
  }

  // 2. If email is provided, create an auth account
  if (patientData.email) {
    // Generate a default password (e.g., patient123 or similar)
    // In a real app, you'd send a reset link, but for this demo, we use a default
    const password = "password123"; 

    const { data: authUser, error: authError } = await adminSupabase.auth.admin.createUser({
      email: patientData.email,
      password: password,
      email_confirm: true,
      user_metadata: {
        role: 'PATIENT',
        first_name: patientData.first_name,
        last_name: patientData.last_name
      }
    });

    if (authError) {
      // If auth fails (e.g. user exists), we don't necessarily want to fail the whole thing,
      // but we should log it.
      console.error("Auth creation failed:", authError.message);
      return { 
        success: true, 
        patientId: patient.id,
        warning: "Patient record created, but login account creation failed: " + authError.message 
      };
    }

    // 3. Create profile linked to the auth user
    if (authUser?.user) {
      const { error: profileError } = await adminSupabase
        .from('profiles')
        .insert({
          id: authUser.user.id,
          first_name: patientData.first_name,
          last_name: patientData.last_name,
          email: patientData.email,
          file_number: patient.file_number,
          role: 'PATIENT'
        });
      
      if (profileError) {
        console.error("Profile creation failed:", profileError.message);
      }

      // 4. Update patient record with the auth user id if needed (optional)
      // For now, they are linked by email or just existing in the system.
    }
  }

  return { success: true, patientId: patient.id };
}

export async function updatePatientAction(id: string, patientData: any) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('patients')
    .update({ ...patientData, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function deletePatientAction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('patients')
    .delete()
    .eq('id', id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function updateStaffAction(id: string, staffData: any) {
  const adminSupabase = createAdminClient();
  const { error } = await adminSupabase
    .from('profiles')
    .update({ ...staffData, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function deleteStaffAction(id: string) {
  const adminSupabase = createAdminClient();
  const { error } = await adminSupabase
    .from('profiles')
    .delete()
    .eq('id', id);

  if (error) {
    // If delete profile fails due to auth or FK, try deleting auth user
    const { error: authError } = await adminSupabase.auth.admin.deleteUser(id);
    if (authError && error) return { error: error.message };
  }
  return { success: true };
}

export async function cancelInvoiceAction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('invoices')
    .update({ status: 'CANCELLED' })
    .eq('id', id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function updateSystemSettingsAction(settingsData: any) {
  const adminSupabase = createAdminClient();
  
  const { data: existing } = await adminSupabase
    .from('system_settings')
    .select('id')
    .limit(1)
    .maybeSingle();

  let error;
  if (existing?.id) {
    const res = await adminSupabase
      .from('system_settings')
      .update({ ...settingsData, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    error = res.error;
  } else {
    const res = await adminSupabase
      .from('system_settings')
      .insert([{ ...settingsData, updated_at: new Date().toISOString() }]);
    error = res.error;
  }

  if (error) return { error: error.message };
  return { success: true };
}


