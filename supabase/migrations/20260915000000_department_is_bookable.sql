-- Migration: Add is_bookable to departments table
-- Purpose: Filter administrative and non-outpatient departments from the public appointment booking form

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'departments' 
      AND column_name = 'is_bookable'
  ) THEN
    ALTER TABLE public.departments 
    ADD COLUMN is_bookable BOOLEAN NOT NULL DEFAULT true;
  END IF;
END $$;

-- Mark administrative, back-office, and non-outpatient departments as non-bookable
UPDATE public.departments
SET is_bookable = false
WHERE LOWER(TRIM(name)) IN (
  'administration',
  'human resources',
  'billing',
  'maintenance',
  'reception',
  'er',
  'ipd',
  'nursing',
  'pharmacy'
);

-- Ensure clinical consultation departments remain bookable
UPDATE public.departments
SET is_bookable = true
WHERE LOWER(TRIM(name)) IN (
  'opd',
  'laboratory',
  'radiology'
);

-- Index for performant filtering on bookable departments
CREATE INDEX IF NOT EXISTS idx_departments_is_bookable ON public.departments (is_bookable);
