export type AuditModule =
  | 'AUTH'
  | 'INVENTORY'
  | 'CAPITAL_ASSETS'
  | 'FINANCE'
  | 'CLINICAL_TESTS'
  | 'SYSTEM_SETTINGS'
  | 'PATIENTS'
  | 'ADMIN'
  | 'CLINICAL';

export type AuditAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'RECORD_CREATE'
  | 'RECORD_UPDATE'
  | 'RECORD_DELETE'
  | 'STOCK_ADJUSTMENT'
  | 'SETTINGS_UPDATE'
  | 'DATA_PURGE'
  | 'ROLE_CHANGE'
  | 'STATUS_CHANGE';

export interface AuditLogEntry {
  id: string;
  user_id: string | null;
  actor_name: string | null;
  actor_role: string | null;
  action: AuditAction | string;
  module: AuditModule | string;
  record_id: string | null;
  record_type: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface LogAuditOptions {
  userId?: string | null;
  actorName?: string | null;
  actorRole?: string | null;
  action: AuditAction | string;
  module: AuditModule | string;
  recordId?: string | null;
  recordType?: string | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

