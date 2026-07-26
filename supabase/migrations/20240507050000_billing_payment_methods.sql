-- Migration for Payment Methods & Insurance Providers Settings

ALTER TABLE public.system_settings 
ADD COLUMN IF NOT EXISTS payment_methods TEXT[] DEFAULT ARRAY['CASH', 'CARD', 'MOBILE_MONEY', 'INSURANCE', 'BANK_TRANSFER', 'CHEQUE'],
ADD COLUMN IF NOT EXISTS insurance_providers TEXT[] DEFAULT ARRAY['NHIMA', 'Prudential', 'Sanlam', 'Madison Health', 'Professional Life', 'Medland Direct'];

-- Ensure default values for existing rows
UPDATE public.system_settings 
SET payment_methods = ARRAY['CASH', 'CARD', 'MOBILE_MONEY', 'INSURANCE', 'BANK_TRANSFER', 'CHEQUE'] 
WHERE payment_methods IS NULL;

UPDATE public.system_settings 
SET insurance_providers = ARRAY['NHIMA', 'Prudential', 'Sanlam', 'Madison Health', 'Professional Life', 'Medland Direct'] 
WHERE insurance_providers IS NULL;
