-- Migration: Clean legacy TV connection codes from system_settings and ensure tv_broadcast_codes table
-- Ensures insurance_providers column holds exclusively valid insurance company names.

-- 1. Ensure tv_broadcast_codes table exists with all required columns and constraints
CREATE TABLE IF NOT EXISTS public.tv_broadcast_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL DEFAULT 'Smart TV Display',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_connected_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.tv_broadcast_codes ENABLE ROW LEVEL SECURITY;

-- Policies for tv_broadcast_codes
DROP POLICY IF EXISTS "Allow public read for active TV codes" ON public.tv_broadcast_codes;
CREATE POLICY "Allow public read for active TV codes"
    ON public.tv_broadcast_codes
    FOR SELECT
    USING (is_active = true);

DROP POLICY IF EXISTS "Allow admin full access to TV codes" ON public.tv_broadcast_codes;
CREATE POLICY "Allow admin full access to TV codes"
    ON public.tv_broadcast_codes
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'ADMIN'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'ADMIN'
        )
    );

-- 2. Clean up any existing TVCODE entries from system_settings.insurance_providers
DO $$
DECLARE
    r RECORD;
    clean_providers TEXT[];
    item TEXT;
BEGIN
    FOR r IN SELECT id, insurance_providers FROM public.system_settings WHERE insurance_providers IS NOT NULL LOOP
        clean_providers := ARRAY[]::TEXT[];
        FOREACH item IN ARRAY r.insurance_providers LOOP
            IF item NOT LIKE 'TVCODE:%' AND item NOT LIKE '{%' AND trim(item) <> '' THEN
                clean_providers := array_append(clean_providers, trim(item));
            END IF;
        END LOOP;

        -- If array is empty after cleaning, set default valid insurance providers
        IF clean_providers = ARRAY[]::TEXT[] OR array_length(clean_providers, 1) IS NULL THEN
            clean_providers := ARRAY['NHIMA', 'Prudential', 'Sanlam', 'Madison Health', 'Professional Life', 'Medland Direct'];
        END IF;

        UPDATE public.system_settings
        SET insurance_providers = clean_providers
        WHERE id = r.id;
    END LOOP;
END $$;

