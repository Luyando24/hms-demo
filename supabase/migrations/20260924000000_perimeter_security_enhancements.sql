-- Migration: Perimeter Security Enhancements (Hospital Network & Trusted Workstations)

-- 1. Add Network & Workstation configuration columns to system_settings
ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS geofence_network_check_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS geofence_allowed_subnets TEXT[] DEFAULT ARRAY['192.168.0.0/16', '10.0.0.0/8', '172.16.0.0/12', '127.0.0.1/32', '::1/128'],
  ADD COLUMN IF NOT EXISTS geofence_allowed_ips TEXT[] DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS geofence_trusted_workstations_enabled BOOLEAN DEFAULT true;

-- Update existing row if columns were added with nulls
UPDATE public.system_settings
SET
  geofence_network_check_enabled = COALESCE(geofence_network_check_enabled, true),
  geofence_allowed_subnets = COALESCE(geofence_allowed_subnets, ARRAY['192.168.0.0/16', '10.0.0.0/8', '172.16.0.0/12', '127.0.0.1/32', '::1/128']),
  geofence_allowed_ips = COALESCE(geofence_allowed_ips, ARRAY[]::text[]),
  geofence_trusted_workstations_enabled = COALESCE(geofence_trusted_workstations_enabled, true);

-- 2. Create trusted_workstations table for stationary hospital terminals
CREATE TABLE IF NOT EXISTS public.trusted_workstations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  authorized_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address TEXT,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast token validation
CREATE INDEX IF NOT EXISTS idx_trusted_workstations_token_hash ON public.trusted_workstations(token_hash) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.trusted_workstations ENABLE ROW LEVEL SECURITY;

-- Drop any conflicting policies
DROP POLICY IF EXISTS "trusted_workstations_admin_all" ON public.trusted_workstations;
DROP POLICY IF EXISTS "trusted_workstations_read_active" ON public.trusted_workstations;

-- Admins can do everything
CREATE POLICY "trusted_workstations_admin_all" ON public.trusted_workstations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
    )
  );

-- Service role has full access by default.
