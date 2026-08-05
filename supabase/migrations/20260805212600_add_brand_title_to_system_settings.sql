-- Migration to add brand_title to system_settings
ALTER TABLE public.system_settings 
ADD COLUMN IF NOT EXISTS brand_title TEXT DEFAULT NULL;
