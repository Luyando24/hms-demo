-- Migration: System-Wide Audit Logging
-- Implements audit tracking table and policies ensuring immutability and administrative security

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_name TEXT,
    actor_role TEXT,
    action TEXT NOT NULL,
    module TEXT NOT NULL,
    record_id TEXT,
    record_type TEXT,
    old_values JSONB,
    new_values JSONB,
    ip_address TEXT,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_module_idx ON public.audit_logs (module);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON public.audit_logs (action);
CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx ON public.audit_logs (user_id);
CREATE INDEX IF NOT EXISTS audit_logs_record_type_idx ON public.audit_logs (record_type);

-- Row Level Security
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. Only Super Users and Administrators can view audit records
DROP POLICY IF EXISTS "Admins and Super Users can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins and Super Users can view audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
    private.has_role(ARRAY['ADMIN', 'SUPER_USER'])
);

-- 2. Authenticated users can insert audit logs (for their own activities)
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated users can insert audit logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 3. Audit logs are strictly immutable: NO UPDATE allowed under any circumstances
DROP POLICY IF EXISTS "Audit logs cannot be updated" ON public.audit_logs;
CREATE POLICY "Audit logs cannot be updated"
ON public.audit_logs
FOR UPDATE
TO authenticated
USING (false);

-- 4. Audit logs are strictly immutable: NO DELETE allowed
DROP POLICY IF EXISTS "Audit logs cannot be deleted" ON public.audit_logs;
CREATE POLICY "Audit logs cannot be deleted"
ON public.audit_logs
FOR DELETE
TO authenticated
USING (false);

