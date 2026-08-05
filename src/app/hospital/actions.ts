'use server';

import { revalidatePath } from 'next/cache';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { AuthorizationError, requireRole } from '@/lib/auth';
import { createAdminClient } from '@/utils/supabase/admin';

const uuidSchema = z.string().uuid();
const optionalText = (maxLength: number) =>
  z
    .union([z.string().trim().max(maxLength), z.null(), z.undefined()])
    .transform((value) => value || null);
const optionalEmail = z
  .union([z.string().trim().email().max(254), z.literal(''), z.null(), z.undefined()])
  .transform((value) => value || null);

const patientCreateSchema = z
  .object({
    file_number: z.string().trim().min(1).max(40).optional(),
    first_name: z.string().trim().min(1).max(100),
    last_name: z.string().trim().min(1).max(100),
    dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
    phone: optionalText(40),
    email: optionalEmail,
    address: optionalText(500),
    emergency_contact_name: optionalText(150),
    emergency_contact_phone: optionalText(40),
    insurance_provider: optionalText(150),
    insurance_policy_number: optionalText(100),
  })
  .strict();

const patientUpdateSchema = patientCreateSchema.omit({ file_number: true });

const staffUpdateSchema = z
  .object({
    first_name: z.string().trim().min(1).max(100),
    last_name: z.string().trim().min(1).max(100),
    role: z.enum([
      'ADMIN',
      'DOCTOR',
      'NURSE',
      'PHARMACIST',
      'LAB_TECH',
      'RADIOLOGIST',
      'ACCOUNTANT',
      'RECEPTIONIST',
      'STAFF',
    ]),
    staff_number: z.string().trim().min(1).max(60),
    email: z.string().trim().email().max(254),
    phone: optionalText(40),
  })
  .strict();

const systemSettingsSchema = z
  .object({
    hospital_name: z.string().trim().min(1).max(200),
    brand_title: optionalText(200),
    tagline: optionalText(300),
    logo_url: optionalText(1000),
    default_currency: z.string().trim().min(3).max(3),
    currency_symbol: z.string().trim().min(1).max(8),
    currency_position: z.enum(['prefix', 'suffix']),
    tax_rate: z.coerce.number().min(0).max(100),
    address: optionalText(500),
    phone: optionalText(40),
    email: optionalEmail,
    payment_methods: z.array(z.string().trim().min(1).max(60)).min(1).max(30),
    insurance_providers: z.array(z.string().trim().min(1).max(150)).max(100),
  })
  .strict();

function actionError(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message || 'The submitted data is invalid.';
  }
  if (error instanceof AuthorizationError) {
    return error.message;
  }
  return error instanceof Error ? error.message : 'The operation could not be completed.';
}

export async function registerPatientAction(input: unknown) {
  try {
    const { supabase } = await requireRole(['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST']);
    const patientData = patientCreateSchema.parse(input);
    const fileNumber =
      patientData.file_number || `HMS-P-${randomUUID().slice(0, 12).toUpperCase()}`;

    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .insert({ ...patientData, file_number: fileNumber })
      .select('id, file_number')
      .single();

    if (patientError) throw patientError;

    let warning: string | undefined;
    if (patientData.email) {
      const adminSupabase = createAdminClient();
      const { data: invitation, error: inviteError } =
        await adminSupabase.auth.admin.inviteUserByEmail(patientData.email, {
          data: {
            first_name: patientData.first_name,
            last_name: patientData.last_name,
          },
        });

      if (inviteError || !invitation.user) {
        warning =
          'The clinical record was created, but the portal invitation could not be sent. ' +
          (inviteError?.message || 'No auth user was returned.');
      } else {
        const authUserId = invitation.user.id;
        const { error: authMetadataError } = await adminSupabase.auth.admin.updateUserById(
          authUserId,
          {
            app_metadata: {
              role: 'PATIENT',
              file_number: patient.file_number,
            },
          },
        );

        const [{ error: profileError }, { error: linkError }] = await Promise.all([
          adminSupabase
            .from('profiles')
            .update({
              first_name: patientData.first_name,
              last_name: patientData.last_name,
              email: patientData.email,
              file_number: patient.file_number,
              role: 'PATIENT',
            })
            .eq('id', authUserId),
          adminSupabase
            .from('patients')
            .update({ auth_user_id: authUserId })
            .eq('id', patient.id),
        ]);

        if (authMetadataError || profileError || linkError) {
          warning =
            'The record was created and an invitation was sent, but the portal account link needs administrator review.';
        }
      }
    }

    revalidatePath('/hospital/patients');
    return { success: true, patientId: patient.id, fileNumber: patient.file_number, warning };
  } catch (error) {
    return { success: false, error: actionError(error) };
  }
}

export async function updatePatientAction(id: string, input: unknown) {
  try {
    const { supabase } = await requireRole(['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST']);
    const patientId = uuidSchema.parse(id);
    const patientData = patientUpdateSchema.parse(input);
    const { error } = await supabase
      .from('patients')
      .update({ ...patientData, updated_at: new Date().toISOString() })
      .eq('id', patientId);

    if (error) throw error;
    revalidatePath('/hospital/patients');
    return { success: true };
  } catch (error) {
    return { success: false, error: actionError(error) };
  }
}

export async function deletePatientAction(id: string) {
  try {
    const { supabase } = await requireRole(['ADMIN']);
    const patientId = uuidSchema.parse(id);
    const { data: patient, error: lookupError } = await supabase
      .from('patients')
      .select('auth_user_id')
      .eq('id', patientId)
      .maybeSingle();
    if (lookupError) throw lookupError;

    const { error } = await supabase.from('patients').delete().eq('id', patientId);
    if (error) throw error;

    if (patient?.auth_user_id) {
      const { error: authError } = await createAdminClient().auth.admin.deleteUser(
        patient.auth_user_id,
      );
      if (authError) {
        return {
          success: true,
          warning: 'Patient record deleted, but the portal login requires administrator cleanup.',
        };
      }
    }

    revalidatePath('/hospital/patients');
    return { success: true };
  } catch (error) {
    return { success: false, error: actionError(error) };
  }
}

export async function updateStaffAction(id: string, input: unknown) {
  try {
    await requireRole(['ADMIN']);
    const staffId = uuidSchema.parse(id);
    const staffData = staffUpdateSchema.parse(input);
    const adminSupabase = createAdminClient();

    const { error: profileError } = await adminSupabase
      .from('profiles')
      .update({ ...staffData, updated_at: new Date().toISOString() })
      .eq('id', staffId);
    if (profileError) throw profileError;

    const { error: authError } = await adminSupabase.auth.admin.updateUserById(staffId, {
      email: staffData.email,
      app_metadata: { role: staffData.role, staff_number: staffData.staff_number },
      user_metadata: {
        first_name: staffData.first_name,
        last_name: staffData.last_name,
      },
    });
    if (authError) throw authError;

    revalidatePath('/hospital/staff');
    return { success: true };
  } catch (error) {
    return { success: false, error: actionError(error) };
  }
}

export async function deleteStaffAction(id: string) {
  try {
    const { user } = await requireRole(['ADMIN']);
    const staffId = uuidSchema.parse(id);
    if (staffId === user.id) {
      throw new Error('You cannot delete your own administrator account.');
    }

    const { error } = await createAdminClient().auth.admin.deleteUser(staffId);
    if (error) throw error;

    revalidatePath('/hospital/staff');
    return { success: true };
  } catch (error) {
    return { success: false, error: actionError(error) };
  }
}

export async function cancelInvoiceAction(id: string) {
  try {
    const { supabase } = await requireRole(['ADMIN', 'ACCOUNTANT', 'RECEPTIONIST']);
    const invoiceId = uuidSchema.parse(id);
    const { error } = await supabase
      .from('invoices')
      .update({ status: 'CANCELLED' })
      .eq('id', invoiceId);
    if (error) throw error;

    revalidatePath('/hospital/billing');
    return { success: true };
  } catch (error) {
    return { success: false, error: actionError(error) };
  }
}

export async function updateSystemSettingsAction(input: unknown) {
  try {
    await requireRole(['ADMIN']);
    const settingsData = systemSettingsSchema.parse(input);
    const adminSupabase = createAdminClient();
    const { data: existing, error: lookupError } = await adminSupabase
      .from('system_settings')
      .select('id')
      .limit(1)
      .maybeSingle();
    if (lookupError) throw lookupError;

    const operation = existing?.id
      ? adminSupabase
          .from('system_settings')
          .update({ ...settingsData, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
      : adminSupabase
          .from('system_settings')
          .insert({ ...settingsData, updated_at: new Date().toISOString() });
    const { error } = await operation;
    if (error) throw error;

    revalidatePath('/hospital/settings');
    return { success: true };
  } catch (error) {
    return { success: false, error: actionError(error) };
  }
}
