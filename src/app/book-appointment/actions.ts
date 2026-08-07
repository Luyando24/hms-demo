'use server';

import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { createAdminClient } from '@/utils/supabase/admin';

const publicBookingSchema = z.object({
  first_name: z.string().trim().min(1, 'First name is required.').max(100),
  last_name: z.string().trim().min(1, 'Last name is required.').max(100),
  phone: z.string().trim().min(5, 'Valid phone number is required.').max(40),
  email: z.union([z.string().trim().email().max(254), z.literal('')]).transform(val => val || null),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth is required in YYYY-MM-DD format.'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  provider_id: z.string().uuid().or(z.literal('')).transform(val => val || null),
  department_id: z.string().uuid().or(z.literal('')).transform(val => val || null),
  appointment_date: z.string().min(1, 'Appointment date and time are required.'),
  reason: z.string().trim().min(3, 'Please specify the reason for your visit.').max(500),
});

export type PublicBookingInput = z.infer<typeof publicBookingSchema>;

export async function bookPublicAppointmentAction(input: unknown) {
  try {
    const data = publicBookingSchema.parse(input);
    const appointmentDate = new Date(data.appointment_date);

    if (!Number.isFinite(appointmentDate.getTime()) || appointmentDate <= new Date()) {
      return { error: 'Please choose a future date and time for your appointment.' };
    }

    const admin = createAdminClient();

    // 1. Check if patient already exists by phone or email
    let patientId: string | null = null;
    let fileNumber: string | null = null;

    if (data.phone) {
      const { data: existingPatient } = await admin
        .from('patients')
        .select('id, file_number')
        .eq('phone', data.phone)
        .limit(1)
        .maybeSingle();

      if (existingPatient) {
        patientId = existingPatient.id;
        fileNumber = existingPatient.file_number;
      }
    }

    if (!patientId && data.email) {
      const { data: existingPatient } = await admin
        .from('patients')
        .select('id, file_number')
        .eq('email', data.email)
        .limit(1)
        .maybeSingle();

      if (existingPatient) {
        patientId = existingPatient.id;
        fileNumber = existingPatient.file_number;
      }
    }

    // 2. If patient does not exist, create new patient record
    if (!patientId) {
      const newFileNumber = `HMS-P-${randomUUID().slice(0, 8).toUpperCase()}`;
      const { data: newPatient, error: createPatientError } = await admin
        .from('patients')
        .insert({
          first_name: data.first_name,
          last_name: data.last_name,
          phone: data.phone,
          email: data.email,
          dob: data.dob,
          gender: data.gender,
          file_number: newFileNumber,
        })
        .select('id, file_number')
        .single();

      if (createPatientError) {
        return { error: `Failed to create patient record: ${createPatientError.message}` };
      }

      patientId = newPatient.id;
      fileNumber = newPatient.file_number;
    }

    // 3. Check if an active appointment already exists for this patient and time slot
    const { data: existingAppt } = await admin
      .from('appointments')
      .select('id, appointment_date, status')
      .eq('patient_id', patientId)
      .eq('appointment_date', appointmentDate.toISOString())
      .neq('status', 'CANCELLED')
      .limit(1)
      .maybeSingle();

    let appointment = existingAppt;

    if (!appointment) {
      const { data: newAppt, error: appointmentError } = await admin
        .from('appointments')
        .insert({
          patient_id: patientId,
          provider_id: data.provider_id,
          appointment_date: appointmentDate.toISOString(),
          reason: data.reason,
          status: 'SCHEDULED',
        })
        .select('id, appointment_date, status')
        .single();

      if (appointmentError) {
        return { error: `Failed to book appointment: ${appointmentError.message}` };
      }
      appointment = newAppt;
    }

    // Note: email_notification_jobs is enqueued automatically by the
    // queue_appointment_email_notifications Postgres trigger on appointment INSERT.

    // Fetch provider name if provider_id was selected
    let providerName: string | null = null;
    if (data.provider_id) {
      const { data: provider } = await admin
        .from('profiles')
        .select('first_name, last_name, role')
        .eq('id', data.provider_id)
        .maybeSingle();

      if (provider) {
        const title = provider.role === 'DOCTOR' ? 'Dr.' : '';
        providerName = `${title} ${provider.first_name || ''} ${provider.last_name || ''}`.trim();
      }
    }

    return {
      success: true,
      bookingReference: appointment.id.slice(0, 8).toUpperCase(),
      appointmentId: appointment.id,
      patientName: `${data.first_name} ${data.last_name}`,
      fileNumber,
      appointmentDate: appointment.appointment_date,
      providerName,
      email: data.email,
    };
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return { error: err.issues[0]?.message || 'Invalid booking details.' };
    }
    return { error: err instanceof Error ? err.message : 'Failed to complete appointment booking.' };
  }
}
