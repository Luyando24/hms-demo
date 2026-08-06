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
      'WAITING_ROOM',
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
    WAITING_ROOM: 'DISP-WR',
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

    let staffId: string | null = null;
    let tempPassword: string | undefined = undefined;

    // 1. Try sending invitation email first
    const { data: invitation, error: inviteError } =
      await adminSupabase.auth.admin.inviteUserByEmail(formData.email, {
        data: {
          first_name: formData.firstName,
          last_name: formData.lastName,
        },
      });

    if (inviteError || !invitation?.user) {
      // 2. Fallback to direct admin user creation if email rate limit is exceeded
      tempPassword = `Hms@${Math.random().toString(36).slice(-6)}${Math.floor(10 + Math.random() * 90)}!`;
      const { data: created, error: createError } = await adminSupabase.auth.admin.createUser({
        email: formData.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          first_name: formData.firstName,
          last_name: formData.lastName,
        },
        app_metadata: {
          role: formData.role,
          staff_number: assignedStaffNumber,
        },
      });

      if (createError || !created?.user) {
        throw createError || inviteError || new Error('Could not create staff user account.');
      }

      staffId = created.user.id;
    } else {
      staffId = invitation.user.id;
    }

    if (!staffId) {
      throw new Error('Could not determine staff user ID.');
    }

    // 3. Ensure app_metadata & user_metadata are updated
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

    // 4. Upsert profile record
    const { error: profileError } = await adminSupabase
      .from('profiles')
      .upsert({
        id: staffId,
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        staff_number: assignedStaffNumber,
        role: formData.role,
      });

    if (metadataError || profileError) {
      await adminSupabase.auth.admin.deleteUser(staffId);
      throw metadataError || profileError;
    }

    revalidatePath('/hospital/staff');
    return {
      success: true,
      userId: staffId,
      staffNumber: assignedStaffNumber,
      tempPassword,
    };
  } catch (error) {
    return { success: false, error: actionError(error) };
  }
}
