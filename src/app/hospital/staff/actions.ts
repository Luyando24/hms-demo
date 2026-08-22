'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { AuthorizationError, requireRole } from '@/lib/auth';
import { createAdminClient } from '@/utils/supabase/admin';

const staffSchema = z
  .object({
    email: z.string().trim().email('Please enter a valid work email address').max(254),
    firstName: z.string().trim().min(1, 'First name is required').max(100),
    lastName: z.string().trim().min(1, 'Last name is required').max(100),
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
    ], {
      error: 'Please select a valid staff role',
    }),
    department: z.string().trim().max(150).optional().nullable(),
    staffNumber: z.string().trim().max(60).optional().nullable(),
    phone: z.string().trim().max(40).optional().nullable(),
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
  return `${prefix}-${suffix}`;
}

function generateSecurePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const randomPart = Array.from({ length: 6 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length)),
  ).join('');
  const numPart = Math.floor(10 + Math.random() * 90);
  return `Hms@${randomPart}${numPart}!`;
}

async function resolveDepartmentId(
  adminSupabase: ReturnType<typeof createAdminClient>,
  deptName?: string | null,
): Promise<string | null> {
  if (!deptName || !deptName.trim()) return null;

  try {
    const { data: depts } = await adminSupabase
      .from('departments')
      .select('id, name');

    if (!depts || depts.length === 0) return null;

    const normalized = deptName.toLowerCase().trim();

    // 1. Direct name match
    const exact = depts.find(
      (d) => d.name.toLowerCase() === normalized,
    );
    if (exact) return exact.id;

    // 2. Keyword / Alias match
    const match = depts.find((d) => {
      const dName = d.name.toLowerCase();
      if (normalized.includes(dName) || dName.includes(normalized)) return true;
      if (normalized.includes('opd') && dName === 'opd') return true;
      if (normalized.includes('er') && dName === 'er') return true;
      if (normalized.includes('ipd') && dName === 'ipd') return true;
      if (normalized.includes('lab') && dName === 'laboratory') return true;
      if (normalized.includes('pharmacy') && dName === 'pharmacy') return true;
      if (normalized.includes('radiology') && dName === 'radiology') return true;
      if (normalized.includes('billing') && dName === 'billing') return true;
      if (normalized.includes('reception') && dName === 'reception') return true;
      if (normalized.includes('nurs') && dName === 'nursing') return true;
      if (normalized.includes('admin') && dName === 'administration') return true;
      if (normalized.includes('hr') && dName === 'human resources') return true;
      return false;
    });

    return match?.id || null;
  } catch {
    return null;
  }
}

function actionError(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message || 'The submitted staff details are invalid.';
  }
  if (error instanceof AuthorizationError) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null) {
    const errObj = error as Record<string, unknown>;
    if (typeof errObj.message === 'string') {
      const msg = errObj.message;
      if (msg.includes('already been registered') || errObj.code === 'email_exists') {
        return 'A user account with this email address has already been registered.';
      }
      if (msg.toLowerCase().includes('fetch failed') || msg.toLowerCase().includes('failed to fetch')) {
        return 'Network request failed while contacting the authentication service. Please try again.';
      }
      return msg;
    }
  }
  if (typeof error === 'string') {
    return error;
  }
  return error instanceof Error ? error.message : 'The staff account could not be created.';
}

export async function createStaffMember(input: unknown) {
  try {
    await requireRole(['ADMIN']);
    const formData = staffSchema.parse(input);
    const assignedStaffNumber =
      (formData.staffNumber && formData.staffNumber.trim()) ||
      generateSecureStaffId(formData.role);

    const adminSupabase = createAdminClient();

    // 1. Pre-check if email already exists in profiles table
    const { data: existingProfile } = await adminSupabase
      .from('profiles')
      .select('id, email')
      .ilike('email', formData.email)
      .maybeSingle();

    if (existingProfile) {
      return {
        success: false,
        error: `A staff member or user with email ${formData.email} is already registered.`,
      };
    }

    // 2. Resolve department ID if department name was selected
    const departmentId = await resolveDepartmentId(adminSupabase, formData.department);

    // 3. Generate initial temporary password
    const tempPassword = generateSecurePassword();

    // 4. Provision user directly via Supabase Auth Admin API
    const { data: created, error: createError } = await adminSupabase.auth.admin.createUser({
      email: formData.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        first_name: formData.firstName,
        last_name: formData.lastName,
        department: formData.department || undefined,
      },
      app_metadata: {
        role: formData.role,
        staff_number: assignedStaffNumber,
      },
    });

    if (createError || !created?.user) {
      throw createError || new Error('Could not create staff authentication user account.');
    }

    const staffId = created.user.id;

    // 5. Ensure profile is properly updated with role, staff_number, and department_id
    const { error: profileError } = await adminSupabase
      .from('profiles')
      .upsert({
        id: staffId,
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        staff_number: assignedStaffNumber,
        role: formData.role,
        department_id: departmentId,
        phone: formData.phone || null,
        updated_at: new Date().toISOString(),
      });

    if (profileError) {
      // Clean up orphaned auth user if profile record creation fails
      await adminSupabase.auth.admin.deleteUser(staffId);
      throw profileError;
    }

    revalidatePath('/hospital/staff');
    revalidatePath('/hospital/hr');

    return {
      success: true,
      userId: staffId,
      staffNumber: assignedStaffNumber,
      tempPassword,
      role: formData.role,
      email: formData.email,
      firstName: formData.firstName,
      lastName: formData.lastName,
      department: formData.department || 'General Outpatient (OPD)',
    };
  } catch (error) {
    return { success: false, error: actionError(error) };
  }
}
