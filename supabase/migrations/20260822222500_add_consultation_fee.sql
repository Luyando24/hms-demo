-- Migration: Add consultation_fee configuration to system_settings
ALTER TABLE public.system_settings 
ADD COLUMN IF NOT EXISTS consultation_fee NUMERIC DEFAULT 150.00;
