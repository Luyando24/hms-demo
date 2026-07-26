-- Migration for System Settings & Currency Configuration

CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_name TEXT DEFAULT 'HMS Clinic',
    default_currency TEXT DEFAULT 'USD',
    currency_symbol TEXT DEFAULT '$',
    currency_position TEXT DEFAULT 'prefix',
    tax_rate NUMERIC DEFAULT 0,
    address TEXT,
    phone TEXT,
    email TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed initial default settings if empty
INSERT INTO public.system_settings (hospital_name, default_currency, currency_symbol, currency_position)
SELECT 'HMS Clinic', 'USD', '$', 'prefix'
WHERE NOT EXISTS (SELECT 1 FROM public.system_settings);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_settings_select" ON public.system_settings;
DROP POLICY IF EXISTS "system_settings_modify" ON public.system_settings;
DROP POLICY IF EXISTS "system_settings_select_all" ON public.system_settings;
DROP POLICY IF EXISTS "system_settings_insert_all" ON public.system_settings;
DROP POLICY IF EXISTS "system_settings_update_all" ON public.system_settings;
DROP POLICY IF EXISTS "system_settings_delete_all" ON public.system_settings;

CREATE POLICY "system_settings_select_all" ON public.system_settings FOR SELECT USING (true);
CREATE POLICY "system_settings_insert_all" ON public.system_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "system_settings_update_all" ON public.system_settings FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "system_settings_delete_all" ON public.system_settings FOR DELETE USING (true);
