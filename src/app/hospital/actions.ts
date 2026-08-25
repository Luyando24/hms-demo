'use server';

import { revalidatePath } from 'next/cache';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { AuthorizationError, requireRole } from '@/lib/auth';
import { createAdminClient } from '@/utils/supabase/admin';
import { getSubdomainUrl } from '@/utils/subdomain';

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
    gender: z.preprocess(
      (val) => (typeof val === 'string' ? val.trim().toUpperCase() : val),
      z.enum(['MALE', 'FEMALE', 'OTHER']),
    ),
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
    room_id: optionalText(60),
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
    consultation_fee: z.coerce.number().min(0).optional().default(150.0),
    address: optionalText(500),
    phone: optionalText(40),
    email: optionalEmail,
    payment_methods: z
      .array(z.string().trim())
      .transform((arr) => arr.filter((i) => i.length > 0))
      .pipe(z.array(z.string().min(1).max(60)).min(1).max(30)),
    insurance_providers: z
      .array(z.string().trim())
      .transform((arr) => arr.filter((i) => i.length > 0))
      .pipe(z.array(z.string().min(1).max(150)).max(100)),
    geofence_enabled: z.boolean().optional().default(false),
    geofence_latitude: z.coerce.number().min(-90).max(90).optional().default(0),
    geofence_longitude: z.coerce.number().min(-180).max(180).optional().default(0),
    geofence_radius_meters: z.coerce.number().min(10).max(1000000).optional().default(500),
    geofence_enforce_roles: z
      .array(z.string().trim())
      .transform((arr) => arr.filter((i) => i.length > 0))
      .optional()
      .default([]),
    geofence_allow_admin_bypass: z.boolean().optional().default(true),
  })
  .strict();

function actionError(error: unknown): string {
  if (error instanceof z.ZodError) {
    const issue = error.issues[0];
    if (issue) {
      const field = issue.path.length > 0 ? issue.path.join('.') : 'field';
      return `Invalid ${field}: ${issue.message}`;
    }
    return 'The submitted data is invalid.';
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
      patientData.file_number || `HMS-P-${randomUUID().slice(0, 8).toUpperCase()}`;

    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .insert({ ...patientData, file_number: fileNumber })
      .select('id, file_number')
      .single();

    if (patientError) throw patientError;

    let warning: string | undefined;
    const portalEmail =
      patientData.email ||
      `${fileNumber.toLowerCase().replace(/[^a-z0-9]/g, '')}@patient.portal`;

    const adminSupabase = createAdminClient();

    try {
      // 1. Check if an auth user already exists for this email
      const { data: listRes } = await adminSupabase.auth.admin.listUsers();
      const existingUser = (listRes?.users || []).find(
        (u) => u.email?.toLowerCase() === portalEmail.toLowerCase(),
      );

      let authUserId = existingUser?.id;

      if (!authUserId) {
        // Create new auth user
        const { data: newUser, error: createError } =
          await adminSupabase.auth.admin.createUser({
            email: portalEmail,
            email_confirm: true,
            user_metadata: {
              first_name: patientData.first_name,
              last_name: patientData.last_name,
              file_number: patient.file_number,
            },
            app_metadata: {
              role: 'PATIENT',
              file_number: patient.file_number,
            },
          });

        if (createError) {
          warning = `Patient clinical record created. Portal account notice: ${createError.message}`;
        } else if (newUser?.user) {
          authUserId = newUser.user.id;
        }
      }

      if (authUserId) {
        // Update user app_metadata with PATIENT role and file_number
        await adminSupabase.auth.admin.updateUserById(authUserId, {
          app_metadata: {
            role: 'PATIENT',
            file_number: patient.file_number,
          },
        });

        // Upsert profile and link patient record
        await Promise.all([
          adminSupabase.from('profiles').upsert({
            id: authUserId,
            first_name: patientData.first_name,
            last_name: patientData.last_name,
            email: portalEmail,
            file_number: patient.file_number,
            role: 'PATIENT',
          }),
          adminSupabase
            .from('patients')
            .update({
              auth_user_id: authUserId,
              email: patientData.email || portalEmail,
            })
            .eq('id', patient.id),
        ]);
      }
    } catch (authErr: any) {
      console.warn('Patient auth provisioning note:', authErr);
    }

    revalidatePath('/hospital/patients');
    return {
      success: true,
      patientId: patient.id,
      fileNumber: patient.file_number,
      patientName: `${patientData.first_name} ${patientData.last_name}`,
      email: patientData.email || portalEmail,
      hasProvidedEmail: Boolean(patientData.email),
      portalUrl: getSubdomainUrl('patient', '/login'),
      warning,
    };
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

    const updatePayload: Record<string, any> = {
      first_name: staffData.first_name,
      last_name: staffData.last_name,
      role: staffData.role,
      staff_number: staffData.staff_number,
      email: staffData.email,
      phone: staffData.phone,
      updated_at: new Date().toISOString(),
    };

    if (staffData.room_id) {
      updatePayload.room_id = staffData.room_id;
    }

    let { error: profileError } = await adminSupabase
      .from('profiles')
      .update(updatePayload as any)
      .eq('id', staffId);

    // If update fails specifically due to missing room_id column in database schema cache, retry without room_id
    if (
      profileError &&
      (profileError.message?.includes('room_id') ||
        profileError.details?.includes('room_id') ||
        profileError.code === 'PGRST204')
    ) {
      console.warn('Retrying profile update without room_id column due to schema cache mismatch:', profileError.message);
      delete updatePayload.room_id;
      const retryResult = await adminSupabase
        .from('profiles')
        .update(updatePayload as any)
        .eq('id', staffId);
      profileError = retryResult.error;
    }

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

