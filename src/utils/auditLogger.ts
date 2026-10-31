import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';
import { LogAuditOptions } from '@/types/audit';

const SENSITIVE_KEY_PATTERN = /password|secret|token|hash|auth_key|credit_card|card_number|cvv|cookie|private_key/i;

/**
 * Recursively sanitizes data payloads before persisting to audit logs,
 * guaranteeing no passwords, credentials, or secrets leak into audit trails.
 */
function sanitizeAuditPayload(data: unknown): any {
  if (data === null || data === undefined) return null;
  if (typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeAuditPayload(item));
  }

  const sanitized: Record<string, any> = {};
  for (const [key, val] of Object.entries(data as Record<string, any>)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof val === 'object' && val !== null) {
      sanitized[key] = sanitizeAuditPayload(val);
    } else {
      sanitized[key] = val;
    }
  }
  return sanitized;
}

/**
 * System-Wide Audit Logging Helper.
 * Records important user activities, data modifications, deletions, and administrative operations.
 * Guaranteed safe: never throws to the primary workflow, strips credentials, and ensures record immutability.
 */
export async function logAuditEvent(options: LogAuditOptions): Promise<boolean> {
  try {
    let resolvedUserId = options.userId || null;
    let resolvedActorName = options.actorName || null;
    let resolvedActorRole = options.actorRole || null;

    // If actor details are omitted, attempt to resolve from current authenticated session
    if (!resolvedUserId) {
      try {
        const supabase = await createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          resolvedUserId = user.id;
          resolvedActorName =
            user.user_metadata?.first_name && user.user_metadata?.last_name
              ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
              : user.email || 'Authenticated User';

          const { data: profile } = await supabase
            .from('profiles')
            .select('role, first_name, last_name')
            .eq('id', user.id)
            .maybeSingle();

          if (profile) {
            resolvedActorRole = profile.role;
            if (profile.first_name && profile.last_name) {
              resolvedActorName = `${profile.first_name} ${profile.last_name}`;
            }
          }
        }
      } catch {
        // Fall back gracefully if session is unresolvable
      }
    }

    const adminClient = createAdminClient();

    const sanitizedOld = options.oldValues ? sanitizeAuditPayload(options.oldValues) : null;
    const sanitizedNew = options.newValues ? sanitizeAuditPayload(options.newValues) : null;
    const sanitizedMeta = options.metadata ? sanitizeAuditPayload(options.metadata) : {};

    const { error } = await adminClient.from('audit_logs').insert({
      user_id: resolvedUserId,
      actor_name: resolvedActorName || 'System Service',
      actor_role: resolvedActorRole || 'SYSTEM',
      action: options.action,
      module: options.module,
      record_id: options.recordId ? String(options.recordId) : null,
      record_type: options.recordType || null,
      old_values: sanitizedOld,
      new_values: sanitizedNew,
      ip_address: options.ipAddress || null,
      user_agent: options.userAgent || null,
      metadata: sanitizedMeta,
    });

    if (error) {
      console.error('[AuditLog] Insert failed:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[AuditLog] Unexpected error while recording audit log:', err);
    return false;
  }
}

