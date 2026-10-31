-- Migration: Add SUPER_USER role, enforce role hierarchy and sensitive deletion permissions
-- Super User has supreme privileges (revenue analytics, sensitive deletions, system records purge).
-- System Administrator has standard administrative privileges with NO access to revenue analytics or sensitive deletions.

-- 1. Update profiles_role_check constraint to include SUPER_USER
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role = ANY (ARRAY[
    'SUPER_USER',
    'ADMIN',
    'DOCTOR',
    'NURSE',
    'PHARMACIST',
    'LAB_TECH',
    'RADIOLOGIST',
    'ACCOUNTANT',
    'RECEPTIONIST',
    'WAITING_ROOM',
    'PATIENT',
    'STAFF'
  ]));

-- 2. Update private.has_role helper to allow SUPER_USER for all ADMIN permissions
CREATE OR REPLACE FUNCTION private.has_role(allowed_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    private.current_user_role() = ANY (allowed_roles)
    OR (private.current_user_role() = 'SUPER_USER' AND 'ADMIN' = ANY (allowed_roles)),
    false
  );
$$;

-- 3. Restrict asset deletions to SUPER_USER
DROP POLICY IF EXISTS clinic_assets_delete_policy ON public.clinic_assets;
CREATE POLICY clinic_assets_delete_policy ON public.clinic_assets
  FOR DELETE
  TO authenticated
  USING (private.current_user_role() = 'SUPER_USER');

-- 4. Restrict document deletions to SUPER_USER
DROP POLICY IF EXISTS clinic_documents_delete_policy ON public.clinic_documents;
CREATE POLICY clinic_documents_delete_policy ON public.clinic_documents
  FOR DELETE
  TO authenticated
  USING (private.current_user_role() = 'SUPER_USER');

-- 5. Restrict patient record deletions to SUPER_USER
DROP POLICY IF EXISTS patients_delete_policy ON public.patients;
CREATE POLICY patients_delete_policy ON public.patients
  FOR DELETE
  TO authenticated
  USING (private.current_user_role() = 'SUPER_USER');

