'use server';

import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';

export interface AppointmentRecord {
  id: string;
  patient_id: string;
  provider_id: string | null;
  appointment_date: string;
  reason: string | null;
  status: 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | string;
  created_at: string;
  updated_at: string;
  patients: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string | null;
    email: string | null;
    file_number: string;
    gender: string | null;
    dob: string | null;
  } | null;
  provider: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    role: string;
    department_id?: string | null;
    departments?: { name: string } | null;
  } | null;
}

export async function getHospitalAppointmentsAction() {
  try {
    const admin = createAdminClient();

    const { data, error } = await admin
      .from('appointments')
      .select(`
        *,
        patients (
          id,
          first_name,
          last_name,
          phone,
          email,
          file_number,
          gender,
          dob
        )
      `)
      .order('appointment_date', { ascending: false });

    if (error) {
      return { success: false, error: error.message, data: [] };
    }

    // Fetch providers separately to ensure robust profile mapping
    const providerIds = Array.from(
      new Set((data || []).map((a: any) => a.provider_id).filter(Boolean))
    );

    let providerMap: Record<string, any> = {};
    if (providerIds.length > 0) {
      const { data: providers } = await admin
        .from('profiles')
        .select('id, first_name, last_name, role, department_id, departments(name)')
        .in('id', providerIds);

      (providers || []).forEach((p: any) => {
        providerMap[p.id] = p;
      });
    }

    const appointments: AppointmentRecord[] = (data || []).map((item: any) => ({
      ...item,
      provider: item.provider_id ? providerMap[item.provider_id] || null : null,
    }));

    return { success: true, data: appointments };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch appointments.', data: [] };
  }
}

export async function updateAppointmentStatusAction(id: string, status: string) {
  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from('appointments')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/hospital/appointments');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update appointment status.' };
  }
}

export async function assignAppointmentDoctorAction(id: string, provider_id: string | null) {
  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from('appointments')
      .update({ provider_id, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/hospital/appointments');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to assign doctor.' };
  }
}

export async function checkInAppointmentToOpdAction(appointmentId: string, patientId: string, reason: string | null) {
  try {
    const admin = createAdminClient();

    // 1. Insert into walkin_queue for OPD triage/consultation
    const { error: queueError } = await admin
      .from('walkin_queue')
      .insert({
        patient_id: patientId,
        status: 'WAITING',
        priority: 'NORMAL',
        reason: reason || 'Scheduled Appointment Check-in',
        check_in_time: new Date().toISOString(),
      });

    if (queueError) {
      return { success: false, error: `Failed to check-in to OPD: ${queueError.message}` };
    }

    // 2. Mark appointment as CONFIRMED or COMPLETED
    await admin
      .from('appointments')
      .update({ status: 'CONFIRMED', updated_at: new Date().toISOString() })
      .eq('id', appointmentId);

    revalidatePath('/hospital/appointments');
    revalidatePath('/hospital/opd');
    revalidatePath('/hospital/reception');

    return { success: true, message: 'Patient checked into OPD queue successfully!' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to check-in patient to OPD.' };
  }
}

export async function getDoctorProfilesAction() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('profiles')
      .select('id, first_name, last_name, role, department_id, departments(name)')
      .eq('role', 'DOCTOR')
      .order('first_name');

    if (error) return { success: false, error: error.message, doctors: [] };
    return { success: true, doctors: data || [] };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch doctors.', doctors: [] };
  }
}
