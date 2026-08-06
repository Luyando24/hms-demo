-- Update profiles_role_check constraint to include WAITING_ROOM role
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role = ANY (ARRAY[
    'ADMIN', 'DOCTOR', 'NURSE', 'PHARMACIST', 'LAB_TECH',
    'RADIOLOGIST', 'ACCOUNTANT', 'RECEPTIONIST', 'WAITING_ROOM', 'PATIENT', 'STAFF'
  ]));
