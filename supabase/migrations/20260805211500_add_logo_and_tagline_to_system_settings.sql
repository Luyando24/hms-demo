-- Migration to add logo_url and tagline to system_settings
ALTER TABLE public.system_settings 
ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS tagline TEXT DEFAULT 'Integrated Healthcare & Clinical Operations System';
