'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { AuthorizationError, requireRole } from '@/lib/auth';
import { createAdminClient } from '@/utils/supabase/admin';

const staffSchema = z
  .object({
    email: z.string().trim().email().max(254),
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
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
    staffNumber: z.string().trim().max(60).optional(),
  })
  .strict();

function generateSecureStaffId(role: string): string {
  const rolePrefixes: Record<string, string> = {
    DOCTOR: 'MED-DOC',
    NURSE: 'CLN-NRS',
    PHARMACIST: 'PHM-PHR',
    LAB_TECH: 'LAB-TEC',
    RADIOLOGIST: 'RAD-IMG',
    ACCOUNTANT: 'FIN-ACC',
    RECEPTIONIST: 'ADM-RCP',
    ADMIN: 'SYS-ADM',
    STAFF: 'HMS-STF',
  };
  const prefix = rolePrefixes[role] || 'HMS-STF';
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const suffix = Array.from({ length: 8 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length)),
  ).join('');
  return prefix + '-' + suffix;
}

function actionError(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message || 'The submitted staff details are invalid.';
  }
  if (error instanceof AuthorizationError) {
    return error.message;
  }
  return error instanceof Error ? error.message : 'The staff account could not be created.';
}

export async function createStaffMember(input: unknown) {
  try {
    await requireRole(['ADMIN']);
    const formData = staffSchema.parse(input);
    const assignedStaffNumber =
      formData.staffNumber || generateSecureStaffId(formData.role);
    const adminSupabase = createAdminClient();

    const { data: invitation, error: inviteError } =
      await adminSupabase.auth.admin.inviteUserByEmail(formData.email, {
        data: {
          first_name: formData.firstName,
          last_name: formData.lastName,
        },
      });
    if (inviteError || !invitation.user) {
      throw inviteError || new Error('Supabase did not return the invited staff user.');
    }

    const staffId = invitation.user.id;
    const { error: metadataError } = await adminSupabase.auth.admin.updateUserById(staffId, {
      app_metadata: {
        role: formData.role,
        staff_number: assignedStaffNumber,
      },
      user_metadata: {
        first_name: formData.firstName,
        last_name: formData.lastName,
      },
    });

    const { error: profileError } = await adminSupabase
      .from('profiles')
      .update({
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        staff_number: assignedStaffNumber,
        role: formData.role,
      })
      .eq('id', staffId);

    if (metadataError || profileError) {
      await adminSupabase.auth.admin.deleteUser(staffId);
      throw metadataError || profileError;
    }

    revalidatePath('/hospital/staff');
    return {
      success: true,
      userId: staffId,
      staffNumber: assignedStaffNumber,
    };
  } catch (error) {
    return { success: false, error: actionError(error) };
  }
}
