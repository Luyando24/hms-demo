'use server';

import { requireRole, AuthorizationError } from '@/lib/auth';
import { createAdminClient } from '@/utils/supabase/admin';
import { AuditLogEntry } from '@/types/audit';

export interface AuditQueryFilters {
  module?: string;
  action?: string;
  search?: string;
  period?: 'TODAY' | '7_DAYS' | '30_DAYS' | 'ALL';
  page?: number;
  pageSize?: number;
}

export interface AuditSummaryMetrics {
  totalLogs: number;
  todayLogs: number;
  deletionLogs: number;
  adminActionLogs: number;
}

/**
 * Server action to retrieve paginated audit logs with search, filtering, and summary metrics.
 * Strictly restricted to SUPER_USER and ADMIN.
 */
export async function listAuditLogsAction(filters?: AuditQueryFilters) {
  try {
    await requireRole(['SUPER_USER', 'ADMIN']);

    const adminClient = createAdminClient();
    const page = Math.max(1, filters?.page || 1);
    const pageSize = Math.min(100, Math.max(5, filters?.pageSize || 20));
    const offset = (page - 1) * pageSize;

    // Calculate period start ISO
    let periodStartIso: string | null = null;
    const now = new Date();

    if (filters?.period === 'TODAY') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      periodStartIso = today.toISOString();
    } else if (filters?.period === '7_DAYS') {
      const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      periodStartIso = past7.toISOString();
    } else if (filters?.period === '30_DAYS') {
      const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      periodStartIso = past30.toISOString();
    }

    // Build main query
    let query = adminClient
      .from('audit_logs')
      .select('*', { count: 'exact' });

    if (filters?.module && filters.module !== 'ALL') {
      query = query.eq('module', filters.module);
    }

    if (filters?.action && filters.action !== 'ALL') {
      query = query.eq('action', filters.action);
    }

    if (periodStartIso) {
      query = query.gte('created_at', periodStartIso);
    }

    if (filters?.search && filters.search.trim() !== '') {
      const q = filters.search.trim();
      query = query.or(`actor_name.ilike.%${q}%,record_id.ilike.%${q}%,action.ilike.%${q}%,module.ilike.%${q}%`);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();

    const [mainResult, todayResult, deletionResult, adminResult] = await Promise.all([
      query,
      adminClient
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStart),
      adminClient
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .or('action.eq.RECORD_DELETE,action.eq.DATA_PURGE'),
      adminClient
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .or('module.eq.ADMIN,module.eq.SYSTEM_SETTINGS,action.eq.ROLE_CHANGE'),
    ]);

    if (mainResult.error) {
      return { success: false, error: mainResult.error.message, data: [], total: 0, metrics: null };
    }

    const metrics: AuditSummaryMetrics = {
      totalLogs: mainResult.count || 0,
      todayLogs: todayResult.count || 0,
      deletionLogs: deletionResult.count || 0,
      adminActionLogs: adminResult.count || 0,
    };

    return {
      success: true,
      data: (mainResult.data as unknown as AuditLogEntry[]) || [],
      total: mainResult.count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((mainResult.count || 0) / pageSize),
      metrics,
    };
  } catch (err: any) {
    if (err instanceof AuthorizationError) {
      return {
        success: false,
        error: 'Unauthorized: Only Administrators and Super Users can access system audit logs.',
        data: [],
        total: 0,
        metrics: null,
      };
    }
    return {
      success: false,
      error: err?.message || 'Failed to retrieve audit log entries.',
      data: [],
      total: 0,
      metrics: null,
    };
  }
}

/**
 * Server action to retrieve a specific audit log entry by ID.
 */
export async function getAuditLogDetailsAction(id: string) {
  try {
    await requireRole(['SUPER_USER', 'ADMIN']);

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('audit_logs')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: 'Audit log entry not found.' };
    }

    return { success: true, data: data as unknown as AuditLogEntry };
  } catch (err: any) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: 'Unauthorized.' };
    }
    return { success: false, error: err?.message || 'Failed to load audit entry.' };
  }
}

