'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireRole } from '@/lib/auth';
import {
  DEFAULT_APPOINTMENT_TIMEZONE,
  localDateTimeToUtc,
} from '@/lib/date-time';
import { createAdminClient } from '@/utils/supabase/admin';

const appointmentSchema = z.object({
  provider_id: z.string().uuid().or(z.literal('')),
  appointment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
  reason: z.string().trim().min(3).max(500),
});

const profileSchema = z.object({
  first_name: z.string().trim().min(1).max(100),
  last_name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(40),
  address: z.string().trim().max(500),
});

function withMessage(path: string, key: 'success' | 'error', message: string): never {
  redirect(path + '?' + key + '=' + encodeURIComponent(message));
}

export async function bookAppointmentAction(formData: FormData) {
  const parsed = appointmentSchema.safeParse({
    provider_id: formData.get('provider_id'),
    appointment_date: formData.get('appointment_date'),
    reason: formData.get('reason'),
  });
  if (!parsed.success) {
    withMessage('/patient/portal/appointments', 'error', 'Enter a valid date and reason.');
  }

  const { user, supabase } = await requireRole(['PATIENT']);
  const admin = createAdminClient();
  const [
    { data: patient, error: patientError },
    { data: notificationSettings, error: settingsError },
  ] = await Promise.all([
    supabase
      .from('patients')
      .select('id, email')
      .eq('auth_user_id', user.id)
      .maybeSingle(),
    admin
      .from('email_notification_settings')
      .select('timezone')
      .eq('singleton_key', true)
      .maybeSingle(),
  ]);
  if (patientError || !patient) {
    withMessage('/patient/portal/appointments', 'error', 'No patient record is linked to this login.');
  }
  if (settingsError) {
    withMessage('/patient/portal/appointments', 'error', 'The appointment timezone could not be loaded.');
  }

  const appointmentDate = localDateTimeToUtc(
    parsed.data.appointment_date,
    notificationSettings?.timezone || DEFAULT_APPOINTMENT_TIMEZONE,
  );
  if (appointmentDate <= new Date()) {
    withMessage('/patient/portal/appointments', 'error', 'Choose a future appointment time.');
  }

  const { error } = await supabase.from('appointments').insert({
    patient_id: patient.id,
    provider_id: parsed.data.provider_id || null,
    appointment_date: appointmentDate.toISOString(),
    reason: parsed.data.reason,
    status: 'SCHEDULED',
  });
  if (error) {
    withMessage('/patient/portal/appointments', 'error', error.message);
  }
    notification_email: patient.email,

  revalidatePath('/patient/portal');
  revalidatePath('/patient/portal/appointments');
  withMessage('/patient/portal/appointments', 'success', 'Appointment request submitted.');
}

export async function cancelAppointmentAction(formData: FormData) {
  const appointmentId = z.string().uuid().safeParse(formData.get('appointment_id'));
  if (!appointmentId.success) {
    withMessage('/patient/portal/appointments', 'error', 'Invalid appointment.');
  }

  const { supabase } = await requireRole(['PATIENT']);
  const { error } = await supabase
    .from('appointments')
    .update({ status: 'CANCELLED' })
    .eq('id', appointmentId.data);
  if (error) {
    withMessage('/patient/portal/appointments', 'error', error.message);
  }

  revalidatePath('/patient/portal/appointments');
  withMessage('/patient/portal/appointments', 'success', 'Appointment cancelled.');
}

export async function updatePatientProfileAction(formData: FormData) {
  const parsed = profileSchema.safeParse({
    first_name: formData.get('first_name'),
    last_name: formData.get('last_name'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    address: formData.get('address'),
  });
  if (!parsed.success) {
    withMessage('/patient/portal/settings', 'error', 'Check the profile fields and try again.');
  }

  const { user } = await requireRole(['PATIENT']);
  const admin = createAdminClient();
  const [{ error: profileError }, { error: patientError }, { error: authError }] =
    await Promise.all([
      admin
        .from('profiles')
        .update({
          first_name: parsed.data.first_name,
          last_name: parsed.data.last_name,
          email: parsed.data.email,
          phone: parsed.data.phone || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id),
      admin
        .from('patients')
        .update({
          first_name: parsed.data.first_name,
          last_name: parsed.data.last_name,
          email: parsed.data.email,
          phone: parsed.data.phone || null,
          address: parsed.data.address || null,
          updated_at: new Date().toISOString(),
        })
        .eq('auth_user_id', user.id),
      admin.auth.admin.updateUserById(user.id, {
        email: parsed.data.email,
        user_metadata: {
          first_name: parsed.data.first_name,
          last_name: parsed.data.last_name,
        },
      }),
    ]);

  const error = profileError || patientError || authError;
  if (error) {
    withMessage('/patient/portal/settings', 'error', error.message);
  }

  revalidatePath('/patient/portal');
  revalidatePath('/patient/portal/settings');
  withMessage('/patient/portal/settings', 'success', 'Profile updated.');
}
