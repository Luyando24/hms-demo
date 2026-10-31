'use server';

import { revalidatePath } from 'next/cache';
import { requireRole, AuthorizationError } from '@/lib/auth';
import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';
import { logAuditEvent } from '@/utils/auditLogger';
import {
  CommonTestType,
  CreateCommonTestTypeInput,
  UpdateCommonTestTypeInput,
} from '@/types/clinical';
import type { Database } from '@/types/database';

type CommonTestTypeUpdate = Database['public']['Tables']['common_test_types']['Update'];

/**
 * Lists common medical test types.
 * Open to all authenticated staff so clinicians and lab techs can view and select tests.
 */
export async function listCommonTestTypesAction(options?: {
  activeOnly?: boolean;
  category?: string;
  search?: string;
}) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Unauthorized: User session required.', data: [] };
    }

    let query = supabase.from('common_test_types').select('*');

    if (options?.activeOnly !== false) {
      query = query.eq('is_active', true);
    }

    if (options?.category && options.category !== 'ALL') {
      query = query.eq('category', options.category);
    }

    if (options?.search && options.search.trim() !== '') {
      query = query.ilike('name', `%${options.search.trim()}%`);
    }

    query = query.order('category', { ascending: true }).order('name', { ascending: true });

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message, data: [] };
    }

    return { success: true, data: (data as CommonTestType[]) || [] };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch common test types.', data: [] };
  }
}

/**
 * Creates a new common medical test type.
 * Restricted strictly to SUPER_USER and ADMIN.
 * Validates test name length and prevents duplicate entries (case-insensitive).
 */
export async function createCommonTestTypeAction(input: CreateCommonTestTypeInput) {
  try {
    const { user } = await requireRole(['SUPER_USER', 'ADMIN']);
    const cleanName = input.name?.trim();

    if (!cleanName || cleanName.length < 2) {
      return { success: false, error: 'Test name must be at least 2 characters long.' };
    }

    const adminClient = createAdminClient();

    // Check for duplicate test name (case-insensitive)
    const { data: existing, error: checkError } = await adminClient
      .from('common_test_types')
      .select('id, name')
      .ilike('name', cleanName)
      .maybeSingle();

    if (checkError) {
      return { success: false, error: checkError.message };
    }

    if (existing) {
      return {
        success: false,
        error: `A common test type with the name "${existing.name}" already exists.`,
      };
    }

    const cleanCategory = input.category?.trim() || 'General';
    const cleanUnit = input.default_unit?.trim() || null;
    const cleanRefRange = input.default_reference_range?.trim() || null;
    const cleanDescription = input.description?.trim() || null;
    const price = typeof input.price === 'number' && !isNaN(input.price) ? Math.max(0, input.price) : 0;
    const isActive = input.is_active !== undefined ? Boolean(input.is_active) : true;

    const { data, error: insertError } = await adminClient
      .from('common_test_types')
      .insert({
        name: cleanName,
        category: cleanCategory,
        default_unit: cleanUnit,
        default_reference_range: cleanRefRange,
        description: cleanDescription,
        price,
        is_active: isActive,
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    void logAuditEvent({
      userId: user.id,
      action: 'RECORD_CREATE',
      module: 'CLINICAL_TESTS',
      recordId: data.id,
      recordType: 'common_test_types',
      newValues: data as any,
    });

    revalidatePath('/hospital/settings');
    revalidatePath('/hospital/laboratory');

    return { success: true, data: data as CommonTestType };
  } catch (err: any) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: 'Unauthorized: Only Administrators and Super Users can add common test types.' };
    }
    return { success: false, error: err?.message || 'Failed to create common test type.' };
  }
}

/**
 * Updates an existing common medical test type.
 * Restricted strictly to SUPER_USER and ADMIN.
 */
export async function updateCommonTestTypeAction(
  id: string,
  input: UpdateCommonTestTypeInput,
) {
  try {
    await requireRole(['SUPER_USER', 'ADMIN']);

    if (!id || typeof id !== 'string') {
      return { success: false, error: 'Valid Test Type ID is required.' };
    }

    const adminClient = createAdminClient();

    const updates: CommonTestTypeUpdate = {
      updated_at: new Date().toISOString(),
    };

    if (input.name !== undefined) {
      const cleanName = input.name.trim();
      if (!cleanName || cleanName.length < 2) {
        return { success: false, error: 'Test name must be at least 2 characters long.' };
      }

      // Check for duplicate with different ID
      const { data: existing, error: checkError } = await adminClient
        .from('common_test_types')
        .select('id, name')
        .ilike('name', cleanName)
        .neq('id', id)
        .maybeSingle();

      if (checkError) {
        return { success: false, error: checkError.message };
      }

      if (existing) {
        return {
          success: false,
          error: `Another common test type with the name "${existing.name}" already exists.`,
        };
      }

      updates.name = cleanName;
    }

    if (input.category !== undefined) {
      updates.category = input.category.trim() || 'General';
    }

    if (input.default_unit !== undefined) {
      updates.default_unit = input.default_unit?.trim() || null;
    }

    if (input.default_reference_range !== undefined) {
      updates.default_reference_range = input.default_reference_range?.trim() || null;
    }

    if (input.description !== undefined) {
      updates.description = input.description?.trim() || null;
    }

    if (input.price !== undefined) {
      updates.price = typeof input.price === 'number' && !isNaN(input.price) ? Math.max(0, input.price) : 0;
    }

    if (input.is_active !== undefined) {
      updates.is_active = Boolean(input.is_active);
    }

    const { data, error } = await adminClient
      .from('common_test_types')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    void logAuditEvent({
      action: 'RECORD_UPDATE',
      module: 'CLINICAL_TESTS',
      recordId: id,
      recordType: 'common_test_types',
      newValues: updates as any,
    });

    revalidatePath('/hospital/settings');
    revalidatePath('/hospital/laboratory');

    return { success: true, data: data as CommonTestType };
  } catch (err: any) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: 'Unauthorized: Only Administrators and Super Users can update common test types.' };
    }
    return { success: false, error: err?.message || 'Failed to update common test type.' };
  }
}

/**
 * Toggles a test type active/inactive status.
 * Restricted to SUPER_USER and ADMIN.
 */
export async function toggleCommonTestTypeStatusAction(id: string, isActive: boolean) {
  try {
    await requireRole(['SUPER_USER', 'ADMIN']);

    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from('common_test_types')
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    void logAuditEvent({
      action: 'STATUS_CHANGE',
      module: 'CLINICAL_TESTS',
      recordId: id,
      recordType: 'common_test_types',
      metadata: { is_active: isActive },
    });

    revalidatePath('/hospital/settings');
    revalidatePath('/hospital/laboratory');

    return { success: true };
  } catch (err: any) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: 'Unauthorized: Only Administrators and Super Users can modify test status.' };
    }
    return { success: false, error: err?.message || 'Failed to update test status.' };
  }
}

/**
 * Permanently deletes a common test type configuration.
 * Restricted to SUPER_USER and ADMIN.
 */
export async function deleteCommonTestTypeAction(id: string) {
  try {
    await requireRole(['SUPER_USER', 'ADMIN']);

    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from('common_test_types')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    void logAuditEvent({
      action: 'RECORD_DELETE',
      module: 'CLINICAL_TESTS',
      recordId: id,
      recordType: 'common_test_types',
    });

    revalidatePath('/hospital/settings');
    revalidatePath('/hospital/laboratory');

    return { success: true };
  } catch (err: any) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: 'Unauthorized: Only Administrators and Super Users can delete test types.' };
    }
    return { success: false, error: err?.message || 'Failed to delete common test type.' };
  }
}
