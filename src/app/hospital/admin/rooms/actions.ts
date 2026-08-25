'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireRole } from '@/lib/auth';
import { createAdminClient } from '@/utils/supabase/admin';

const bulkDeleteSchema = z.object({
  roomIds: z.array(z.string().uuid()).min(1, 'Please select at least one room to delete.'),
});

const saveRoomSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, 'Room name is required').max(100),
  departmentId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().default(true),
});

function actionError(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message || 'Invalid input provided.';
  }
  return error instanceof Error ? error.message : 'An unexpected error occurred.';
}

export async function bulkDeleteRoomsAction(input: unknown) {
  try {
    await requireRole(['ADMIN']);
    const { roomIds } = bulkDeleteSchema.parse(input);
    const adminSupabase = createAdminClient();

    // 1. Unassign staff linked to these rooms to prevent foreign key errors
    const { error: profileUnlinkError } = await adminSupabase
      .from('profiles')
      .update({ room_id: null })
      .in('room_id', roomIds);

    if (profileUnlinkError) {
      console.warn('Could not unlink profiles from deleting rooms:', profileUnlinkError);
    }

    // 2. Unlink any active walkin queue tickets assigned to these rooms
    const { error: queueUnlinkError } = await adminSupabase
      .from('walkin_queue')
      .update({ room_id: null })
      .in('room_id', roomIds);

    if (queueUnlinkError) {
      console.warn('Could not unlink queue tickets from deleting rooms:', queueUnlinkError);
    }

    // 3. Delete the rooms
    const { error, count } = await adminSupabase
      .from('rooms')
      .delete({ count: 'exact' })
      .in('id', roomIds);

    if (error) {
      throw error;
    }

    revalidatePath('/hospital/admin/rooms');
    revalidatePath('/hospital/queue-display');
    revalidatePath('/hospital/staff');
    revalidatePath('/hospital/opd');

    return {
      success: true,
      deletedCount: count ?? roomIds.length,
    };
  } catch (error) {
    return {
      success: false,
      error: actionError(error),
    };
  }
}

export async function deleteSingleRoomAction(roomId: string) {
  return bulkDeleteRoomsAction({ roomIds: [roomId] });
}

export async function saveRoomAction(input: unknown) {
  try {
    await requireRole(['ADMIN']);
    const data = saveRoomSchema.parse(input);
    const adminSupabase = createAdminClient();

    const roomPayload = {
      name: data.name,
      department_id: data.departmentId || null,
      is_active: data.isActive,
    };

    if (data.id) {
      const { data: updated, error } = await adminSupabase
        .from('rooms')
        .update(roomPayload)
        .eq('id', data.id)
        .select('*, departments(*)')
        .single();

      if (error) throw error;

      revalidatePath('/hospital/admin/rooms');
      return { success: true, room: updated, isNew: false };
    } else {
      const { data: inserted, error } = await adminSupabase
        .from('rooms')
        .insert(roomPayload)
        .select('*, departments(*)')
        .single();

      if (error) throw error;

      revalidatePath('/hospital/admin/rooms');
      return { success: true, room: inserted, isNew: true };
    }
  } catch (error) {
    return {
      success: false,
      error: actionError(error),
    };
  }
}
