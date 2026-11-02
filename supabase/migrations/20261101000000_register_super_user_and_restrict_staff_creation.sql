-- Migration: Register First Super User & Enforce Staff Creation Restrictions
-- 1. Updates handle_new_user trigger to recognize SUPER_USER role
-- 2. SQL procedure to promote an existing user or register the initial Super User account

-- Step 1: Ensure private.handle_new_user recognizes SUPER_USER
CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  requested_role text := upper(COALESCE(NEW.raw_app_meta_data ->> 'role', 'PATIENT'));
BEGIN
  IF NOT (requested_role = ANY (ARRAY[
    'SUPER_USER', 'ADMIN', 'DOCTOR', 'NURSE', 'PHARMACIST', 'LAB_TECH',
    'RADIOLOGIST', 'ACCOUNTANT', 'RECEPTIONIST', 'WAITING_ROOM', 'PATIENT', 'STAFF'
  ])) THEN
    requested_role := 'PATIENT';
  END IF;

  INSERT INTO public.profiles (
    id, first_name, last_name, role, email, staff_number, file_number
  ) VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    requested_role,
    NEW.email,
    NEW.raw_app_meta_data ->> 'staff_number',
    NEW.raw_app_meta_data ->> 'file_number'
  )
  ON CONFLICT (id) DO UPDATE SET
    first_name = COALESCE(EXCLUDED.first_name, public.profiles.first_name),
    last_name = COALESCE(EXCLUDED.last_name, public.profiles.last_name),
    role = EXCLUDED.role,
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    updated_at = now();

  RETURN NEW;
END;
$$;

-- Step 2: Register or Promote the First Super User
-- Change email and password to your preferred credentials:
DO $$
DECLARE
  v_user_id UUID;
  v_email TEXT := 'superuser@kunda.com';          -- CHANGE THIS to your email
  v_password TEXT := 'SuperUserPass2026!';       -- CHANGE THIS to your password
  v_first_name TEXT := 'Executive';
  v_last_name TEXT := 'Director';
  v_staff_number TEXT := 'SUP-ADM-0001';
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = lower(trim(v_email));

  IF v_user_id IS NOT NULL THEN
    -- If user already exists in auth.users, promote them to SUPER_USER and update password
    UPDATE auth.users
    SET 
      encrypted_password = crypt(v_password, gen_salt('bf', 10)),
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'role', 'SUPER_USER', 'staff_number', v_staff_number),
      raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('first_name', v_first_name, 'last_name', v_last_name),
      updated_at = now()
    WHERE id = v_user_id;

    -- Ensure identity exists in auth.identities
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      v_user_id::text,
      v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', lower(trim(v_email)), 'role', 'SUPER_USER'),
      'email',
      v_user_id::text,
      now(),
      now(),
      now()
    )
    ON CONFLICT (provider, provider_id) DO UPDATE SET
      identity_data = EXCLUDED.identity_data,
      updated_at = now();

    UPDATE public.profiles
    SET 
      role = 'SUPER_USER',
      staff_number = COALESCE(staff_number, v_staff_number),
      updated_at = now()
    WHERE id = v_user_id;

    RAISE NOTICE 'Existing user % promoted to SUPER_USER successfully.', v_email;
  ELSE
    -- If user does not exist, provision new SUPER_USER account
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      lower(trim(v_email)),
      crypt(v_password, gen_salt('bf', 10)),
      now(),
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'role', 'SUPER_USER', 'staff_number', v_staff_number),
      jsonb_build_object('first_name', v_first_name, 'last_name', v_last_name),
      now(),
      now(),
      '',
      ''
    );

    -- Insert corresponding auth.identities record required by Supabase Auth GoTrue
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      v_user_id::text,
      v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', lower(trim(v_email)), 'role', 'SUPER_USER'),
      'email',
      v_user_id::text,
      now(),
      now(),
      now()
    )
    ON CONFLICT (provider, provider_id) DO UPDATE SET
      identity_data = EXCLUDED.identity_data,
      updated_at = now();

    INSERT INTO public.profiles (
      id,
      email,
      first_name,
      last_name,
      role,
      staff_number,
      created_at,
      updated_at
    ) VALUES (
      v_user_id,
      lower(trim(v_email)),
      v_first_name,
      v_last_name,
      'SUPER_USER',
      v_staff_number,
      now(),
      now()
    )
    ON CONFLICT (id) DO UPDATE SET
      role = 'SUPER_USER',
      updated_at = now();

    RAISE NOTICE 'New SUPER_USER % created successfully with ID %', v_email, v_user_id;
  END IF;
END;
$$;

