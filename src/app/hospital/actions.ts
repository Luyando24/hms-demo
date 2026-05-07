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
