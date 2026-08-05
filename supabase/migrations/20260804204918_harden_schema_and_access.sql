-- Capture live-only schema, align the application contract, and replace the
-- original permissive RLS policies with role- and ownership-aware policies.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;

-- Tables that existed in the linked project but were missing from migration
-- history. IF NOT EXISTS keeps this safe on live and on clean replays.
CREATE TABLE IF NOT EXISTS public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  department_id uuid REFERENCES public.departments(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id),
  referred_by uuid NOT NULL REFERENCES public.profiles(id),
  destination_hospital text NOT NULL,
  reason text NOT NULL,
  priority text DEFAULT 'NORMAL',
  status text DEFAULT 'PENDING',
  referral_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES public.inventory_items(id),
  quantity integer NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_by uuid REFERENCES public.profiles(id)
);

CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL,
  amount numeric NOT NULL,
  payment_method text,
  reference_number text,
  expense_date date DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.clinic_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  serial_number text,
  model_number text,
  location text,
  category text NOT NULL,
  purchase_date date,
  purchase_cost numeric,
  last_maintenance date,
  next_maintenance date,
  status text DEFAULT 'OPERATIONAL',
  condition text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.clinic_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  document_type text NOT NULL,
  issuer text,
  issue_date date,
  expiry_date date,
  status text DEFAULT 'VALID',
  file_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS staff_number text,
  ADD COLUMN IF NOT EXISTS file_number text,
  ADD COLUMN IF NOT EXISTS phone text;

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS unit_price numeric(12, 2) NOT NULL DEFAULT 0;

ALTER TABLE public.walkin_queue
  ADD COLUMN IF NOT EXISTS room_id uuid REFERENCES public.rooms(id),
  ADD COLUMN IF NOT EXISTS reason text;

ALTER TABLE public.admissions
  ADD COLUMN IF NOT EXISTS primary_diagnosis text;

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id);

UPDATE public.profiles AS profile
SET email = auth_user.email
FROM auth.users AS auth_user
WHERE profile.id = auth_user.id
  AND profile.email IS NULL;

UPDATE public.patients AS patient
SET auth_user_id = profile.id
FROM public.profiles AS profile
WHERE patient.auth_user_id IS NULL
  AND profile.role = 'PATIENT'
  AND (
    (profile.file_number IS NOT NULL AND profile.file_number = patient.file_number)
    OR (
      profile.email IS NOT NULL
      AND patient.email IS NOT NULL
      AND lower(profile.email) = lower(patient.email)
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_lower_key
  ON public.profiles (lower(email)) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_staff_number_key_idx
  ON public.profiles (staff_number) WHERE staff_number IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_file_number_key_idx
  ON public.profiles (file_number) WHERE file_number IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS patients_auth_user_id_key
  ON public.patients (auth_user_id) WHERE auth_user_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_role_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_role_check
      CHECK (role = ANY (ARRAY[
        'ADMIN', 'DOCTOR', 'NURSE', 'PHARMACIST', 'LAB_TECH',
        'RADIOLOGIST', 'ACCOUNTANT', 'RECEPTIONIST', 'PATIENT', 'STAFF'
      ])) NOT VALID;
    ALTER TABLE public.profiles VALIDATE CONSTRAINT profiles_role_check;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION private.assign_patient_file_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.file_number IS NULL OR btrim(NEW.file_number) = '' THEN
    NEW.file_number := 'HMS-P-' || to_char(clock_timestamp(), 'YYMMDD') || '-'
      || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assign_patient_file_number ON public.patients;
CREATE TRIGGER assign_patient_file_number
BEFORE INSERT ON public.patients
FOR EACH ROW EXECUTE FUNCTION private.assign_patient_file_number();

-- Authorization helpers live outside the API-exposed public schema.
CREATE OR REPLACE FUNCTION private.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT profile.role
  FROM public.profiles AS profile
  WHERE profile.id = (SELECT auth.uid())
$$;

CREATE OR REPLACE FUNCTION private.has_role(allowed_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(private.current_user_role() = ANY (allowed_roles), false)
$$;

CREATE OR REPLACE FUNCTION private.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(private.current_user_role() <> 'PATIENT', false)
$$;

CREATE OR REPLACE FUNCTION private.owns_patient(target_patient_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.patients AS patient
    WHERE patient.id = target_patient_id
      AND patient.auth_user_id = (SELECT auth.uid())
  )
$$;

CREATE OR REPLACE FUNCTION private.owns_clinical_note(target_note_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.clinical_notes AS note
    JOIN public.patients AS patient ON patient.id = note.patient_id
    WHERE note.id = target_note_id
      AND patient.auth_user_id = (SELECT auth.uid())
  )
$$;

CREATE OR REPLACE FUNCTION private.owns_prescription(target_prescription_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.prescriptions AS prescription
    JOIN public.patients AS patient ON patient.id = prescription.patient_id
    WHERE prescription.id = target_prescription_id
      AND patient.auth_user_id = (SELECT auth.uid())
  )
$$;

CREATE OR REPLACE FUNCTION private.owns_lab_order(target_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.lab_orders AS lab_order
    JOIN public.patients AS patient ON patient.id = lab_order.patient_id
    WHERE lab_order.id = target_order_id
      AND patient.auth_user_id = (SELECT auth.uid())
  )
$$;

CREATE OR REPLACE FUNCTION private.owns_radiology_order(target_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.radiology_orders AS radiology_order
    JOIN public.patients AS patient ON patient.id = radiology_order.patient_id
    WHERE radiology_order.id = target_order_id
      AND patient.auth_user_id = (SELECT auth.uid())
  )
$$;

CREATE OR REPLACE FUNCTION private.owns_invoice(target_invoice_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.invoices AS invoice
    JOIN public.patients AS patient ON patient.id = invoice.patient_id
    WHERE invoice.id = target_invoice_id
      AND patient.auth_user_id = (SELECT auth.uid())
  )
$$;

CREATE OR REPLACE FUNCTION private.owns_admission(target_admission_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admissions AS admission
    JOIN public.patients AS patient ON patient.id = admission.patient_id
    WHERE admission.id = target_admission_id
      AND patient.auth_user_id = (SELECT auth.uid())
  )
$$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO authenticated;

-- New users default to PATIENT unless a trusted Admin API call sets a valid role
-- in app_metadata. raw_user_meta_data is intentionally never trusted for roles.
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
    'ADMIN', 'DOCTOR', 'NURSE', 'PHARMACIST', 'LAB_TECH',
    'RADIOLOGIST', 'ACCOUNTANT', 'RECEPTIONIST', 'PATIENT', 'STAFF'
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
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION private.handle_new_user();
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Drop every legacy policy before installing the explicit policy set below.
DO $$
DECLARE
  policy_record record;
  table_record record;
BEGIN
  FOR table_record IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_record.tablename);
  END LOOP;

  FOR policy_record IN
    SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      policy_record.policyname,
      policy_record.tablename
    );
  END LOOP;
END
$$;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (first_name, last_name, email, phone) ON public.profiles TO authenticated;
GRANT SELECT ON public.system_settings TO anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

CREATE POLICY system_settings_public_read
ON public.system_settings FOR SELECT TO anon, authenticated
USING (true);
CREATE POLICY system_settings_admin_write
ON public.system_settings FOR ALL TO authenticated
USING (private.has_role(ARRAY['ADMIN']))
WITH CHECK (private.has_role(ARRAY['ADMIN']));

CREATE POLICY profiles_authenticated_read
ON public.profiles FOR SELECT TO authenticated
USING (
  private.is_staff()
  OR id = (SELECT auth.uid())
  OR role = 'DOCTOR'
);
CREATE POLICY profiles_own_safe_update
ON public.profiles FOR UPDATE TO authenticated
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY patients_staff_read
ON public.patients FOR SELECT TO authenticated
USING (private.is_staff());
CREATE POLICY patients_clinical_write
ON public.patients FOR ALL TO authenticated
USING (private.has_role(ARRAY['ADMIN','DOCTOR','NURSE','RECEPTIONIST']))
WITH CHECK (private.has_role(ARRAY['ADMIN','DOCTOR','NURSE','RECEPTIONIST']));
CREATE POLICY patients_own_read
ON public.patients FOR SELECT TO authenticated
USING (auth_user_id = (SELECT auth.uid()));

-- Reference/location data: all staff may read; operational owners may change it.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['departments','rooms','wards','beds']
  LOOP
    EXECUTE format(
      'CREATE POLICY staff_read ON public.%I FOR SELECT TO authenticated USING (private.is_staff())',
      table_name
    );
    EXECUTE format(
      'CREATE POLICY operations_write ON public.%I FOR ALL TO authenticated USING (private.has_role(ARRAY[''ADMIN'',''NURSE'',''RECEPTIONIST''])) WITH CHECK (private.has_role(ARRAY[''ADMIN'',''NURSE'',''RECEPTIONIST'']))',
      table_name
    );
  END LOOP;
END
$$;

-- Front-desk and clinical operations.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['appointments','walkin_queue']
  LOOP
    EXECUTE format(
      'CREATE POLICY staff_access ON public.%I FOR ALL TO authenticated USING (private.has_role(ARRAY[''ADMIN'',''DOCTOR'',''NURSE'',''RECEPTIONIST''])) WITH CHECK (private.has_role(ARRAY[''ADMIN'',''DOCTOR'',''NURSE'',''RECEPTIONIST'']))',
      table_name
    );
  END LOOP;

  FOREACH table_name IN ARRAY ARRAY['vitals','clinical_notes','diagnosis','admissions','nurse_treatment_sheets','er_visits','referrals']
  LOOP
    EXECUTE format(
      'CREATE POLICY clinical_access ON public.%I FOR ALL TO authenticated USING (private.has_role(ARRAY[''ADMIN'',''DOCTOR'',''NURSE''])) WITH CHECK (private.has_role(ARRAY[''ADMIN'',''DOCTOR'',''NURSE'']))',
      table_name
    );
  END LOOP;
END
$$;

-- Patient-owned reads. Appointments also allow patients to create and manage
-- only rows tied to their own patient record.
CREATE POLICY appointments_patient_read
ON public.appointments FOR SELECT TO authenticated
USING (private.owns_patient(patient_id));
CREATE POLICY appointments_patient_insert
ON public.appointments FOR INSERT TO authenticated
WITH CHECK (private.owns_patient(patient_id));
CREATE POLICY appointments_patient_update
ON public.appointments FOR UPDATE TO authenticated
USING (private.owns_patient(patient_id))
WITH CHECK (private.owns_patient(patient_id));
CREATE POLICY vitals_patient_read
ON public.vitals FOR SELECT TO authenticated
USING (private.owns_patient(patient_id));
CREATE POLICY clinical_notes_patient_read
ON public.clinical_notes FOR SELECT TO authenticated
USING (private.owns_patient(patient_id));
CREATE POLICY diagnosis_patient_read
ON public.diagnosis FOR SELECT TO authenticated
USING (private.owns_clinical_note(note_id));
CREATE POLICY admissions_patient_read
ON public.admissions FOR SELECT TO authenticated
USING (private.owns_patient(patient_id));
CREATE POLICY nurse_sheets_patient_read
ON public.nurse_treatment_sheets FOR SELECT TO authenticated
USING (private.owns_admission(admission_id));
CREATE POLICY referrals_patient_read
ON public.referrals FOR SELECT TO authenticated
USING (private.owns_patient(patient_id));
CREATE POLICY er_visits_patient_read
ON public.er_visits FOR SELECT TO authenticated
USING (private.owns_patient(patient_id));

-- Pharmacy and inventory.
CREATE POLICY inventory_staff_read
ON public.inventory_items FOR SELECT TO authenticated
USING (private.is_staff());
CREATE POLICY inventory_pharmacy_write
ON public.inventory_items FOR ALL TO authenticated
USING (private.has_role(ARRAY['ADMIN','PHARMACIST']))
WITH CHECK (private.has_role(ARRAY['ADMIN','PHARMACIST']));

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['stock_movements','inventory_movements']
  LOOP
    EXECUTE format(
      'CREATE POLICY pharmacy_access ON public.%I FOR ALL TO authenticated USING (private.has_role(ARRAY[''ADMIN'',''PHARMACIST''])) WITH CHECK (private.has_role(ARRAY[''ADMIN'',''PHARMACIST'']))',
      table_name
    );
  END LOOP;
  FOREACH table_name IN ARRAY ARRAY['prescriptions','prescription_items']
  LOOP
    EXECUTE format(
      'CREATE POLICY prescribing_access ON public.%I FOR ALL TO authenticated USING (private.has_role(ARRAY[''ADMIN'',''DOCTOR'',''PHARMACIST''])) WITH CHECK (private.has_role(ARRAY[''ADMIN'',''DOCTOR'',''PHARMACIST'']))',
      table_name
    );
  END LOOP;
END
$$;

CREATE POLICY prescriptions_patient_read
ON public.prescriptions FOR SELECT TO authenticated
USING (private.owns_patient(patient_id));
CREATE POLICY prescription_items_patient_read
ON public.prescription_items FOR SELECT TO authenticated
USING (private.owns_prescription(prescription_id));

-- Laboratory and radiology.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['lab_orders','lab_results']
  LOOP
    EXECUTE format(
      'CREATE POLICY laboratory_access ON public.%I FOR ALL TO authenticated USING (private.has_role(ARRAY[''ADMIN'',''DOCTOR'',''NURSE'',''LAB_TECH''])) WITH CHECK (private.has_role(ARRAY[''ADMIN'',''DOCTOR'',''NURSE'',''LAB_TECH'']))',
      table_name
    );
  END LOOP;
  FOREACH table_name IN ARRAY ARRAY['radiology_orders','radiology_results','radiology_reports']
  LOOP
    EXECUTE format(
      'CREATE POLICY radiology_access ON public.%I FOR ALL TO authenticated USING (private.has_role(ARRAY[''ADMIN'',''DOCTOR'',''NURSE'',''RADIOLOGIST''])) WITH CHECK (private.has_role(ARRAY[''ADMIN'',''DOCTOR'',''NURSE'',''RADIOLOGIST'']))',
      table_name
    );
  END LOOP;
END
$$;

CREATE POLICY lab_orders_patient_read
ON public.lab_orders FOR SELECT TO authenticated
USING (private.owns_patient(patient_id));
CREATE POLICY lab_results_patient_read
ON public.lab_results FOR SELECT TO authenticated
USING (private.owns_lab_order(order_id));
CREATE POLICY radiology_orders_patient_read
ON public.radiology_orders FOR SELECT TO authenticated
USING (private.owns_patient(patient_id));
CREATE POLICY radiology_results_patient_read
ON public.radiology_results FOR SELECT TO authenticated
USING (private.owns_radiology_order(order_id));
CREATE POLICY radiology_reports_patient_read
ON public.radiology_reports FOR SELECT TO authenticated
USING (private.owns_radiology_order(order_id));

-- Billing and finance.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['insurance_providers','invoices','invoice_items','insurance_claims','payments','expenses']
  LOOP
    EXECUTE format(
      'CREATE POLICY billing_access ON public.%I FOR ALL TO authenticated USING (private.has_role(ARRAY[''ADMIN'',''ACCOUNTANT'',''RECEPTIONIST''])) WITH CHECK (private.has_role(ARRAY[''ADMIN'',''ACCOUNTANT'',''RECEPTIONIST'']))',
      table_name
    );
  END LOOP;
END
$$;

CREATE POLICY insurance_providers_staff_read
ON public.insurance_providers FOR SELECT TO authenticated
USING (private.is_staff());
CREATE POLICY invoices_patient_read
ON public.invoices FOR SELECT TO authenticated
USING (private.owns_patient(patient_id));
CREATE POLICY invoice_items_patient_read
ON public.invoice_items FOR SELECT TO authenticated
USING (private.owns_invoice(invoice_id));
CREATE POLICY insurance_claims_patient_read
ON public.insurance_claims FOR SELECT TO authenticated
USING (private.owns_invoice(invoice_id));
CREATE POLICY payments_patient_read
ON public.payments FOR SELECT TO authenticated
USING (private.owns_invoice(invoice_id));

-- Blood bank.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['blood_inventory','blood_donations','blood_transfusions']
  LOOP
    EXECUTE format(
      'CREATE POLICY blood_bank_access ON public.%I FOR ALL TO authenticated USING (private.has_role(ARRAY[''ADMIN'',''DOCTOR'',''NURSE'',''LAB_TECH''])) WITH CHECK (private.has_role(ARRAY[''ADMIN'',''DOCTOR'',''NURSE'',''LAB_TECH'']))',
      table_name
    );
  END LOOP;
END
$$;
CREATE POLICY blood_transfusions_patient_read
ON public.blood_transfusions FOR SELECT TO authenticated
USING (private.owns_patient(patient_id));

-- Procurement.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['suppliers','purchase_orders','po_items','goods_received_notes']
  LOOP
    EXECUTE format(
      'CREATE POLICY procurement_access ON public.%I FOR ALL TO authenticated USING (private.has_role(ARRAY[''ADMIN'',''PHARMACIST'',''ACCOUNTANT''])) WITH CHECK (private.has_role(ARRAY[''ADMIN'',''PHARMACIST'',''ACCOUNTANT'']))',
      table_name
    );
  END LOOP;
END
$$;

-- Staff self-service and payroll.
CREATE POLICY staff_shifts_own_read
ON public.staff_shifts FOR SELECT TO authenticated
USING (staff_id = (SELECT auth.uid()) OR private.has_role(ARRAY['ADMIN']));
CREATE POLICY staff_shifts_admin_write
ON public.staff_shifts FOR ALL TO authenticated
USING (private.has_role(ARRAY['ADMIN']))
WITH CHECK (private.has_role(ARRAY['ADMIN']));
CREATE POLICY leave_requests_own_read
ON public.leave_requests FOR SELECT TO authenticated
USING (staff_id = (SELECT auth.uid()) OR private.has_role(ARRAY['ADMIN']));
CREATE POLICY leave_requests_own_create
ON public.leave_requests FOR INSERT TO authenticated
WITH CHECK (staff_id = (SELECT auth.uid()) AND private.is_staff());
CREATE POLICY leave_requests_admin_write
ON public.leave_requests FOR ALL TO authenticated
USING (private.has_role(ARRAY['ADMIN']))
WITH CHECK (private.has_role(ARRAY['ADMIN']));

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['payroll_configs','payroll_runs','payslips','payroll_records']
  LOOP
    EXECUTE format(
      'CREATE POLICY payroll_management ON public.%I FOR ALL TO authenticated USING (private.has_role(ARRAY[''ADMIN'',''ACCOUNTANT''])) WITH CHECK (private.has_role(ARRAY[''ADMIN'',''ACCOUNTANT'']))',
      table_name
    );
  END LOOP;
END
$$;
CREATE POLICY payroll_configs_own_read
ON public.payroll_configs FOR SELECT TO authenticated
USING (profile_id = (SELECT auth.uid()));
CREATE POLICY payslips_own_read
ON public.payslips FOR SELECT TO authenticated
USING (profile_id = (SELECT auth.uid()));
CREATE POLICY payroll_records_own_read
ON public.payroll_records FOR SELECT TO authenticated
USING (staff_id = (SELECT auth.uid()));

-- Administrative records.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['clinic_assets','clinic_documents']
  LOOP
    EXECUTE format(
      'CREATE POLICY asset_staff_read ON public.%I FOR SELECT TO authenticated USING (private.is_staff())',
      table_name
    );
    EXECUTE format(
      'CREATE POLICY asset_admin_write ON public.%I FOR ALL TO authenticated USING (private.has_role(ARRAY[''ADMIN''])) WITH CHECK (private.has_role(ARRAY[''ADMIN'']))',
      table_name
    );
  END LOOP;
END
$$;
CREATE POLICY ai_settings_admin_access
ON public.ai_settings FOR ALL TO authenticated
USING (private.has_role(ARRAY['ADMIN']))
WITH CHECK (private.has_role(ARRAY['ADMIN']));

-- Foreign-key and policy predicate indexes.
CREATE INDEX IF NOT EXISTS profiles_department_id_idx ON public.profiles(department_id);
CREATE INDEX IF NOT EXISTS appointments_patient_id_idx ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS appointments_provider_id_idx ON public.appointments(provider_id);
CREATE INDEX IF NOT EXISTS walkin_queue_patient_id_idx ON public.walkin_queue(patient_id);
CREATE INDEX IF NOT EXISTS walkin_queue_department_id_idx ON public.walkin_queue(department_id);
CREATE INDEX IF NOT EXISTS walkin_queue_room_id_idx ON public.walkin_queue(room_id);
CREATE INDEX IF NOT EXISTS vitals_patient_id_idx ON public.vitals(patient_id);
CREATE INDEX IF NOT EXISTS clinical_notes_patient_id_idx ON public.clinical_notes(patient_id);
CREATE INDEX IF NOT EXISTS diagnosis_note_id_idx ON public.diagnosis(note_id);
CREATE INDEX IF NOT EXISTS prescriptions_patient_id_idx ON public.prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS prescription_items_prescription_id_idx ON public.prescription_items(prescription_id);
CREATE INDEX IF NOT EXISTS prescription_items_drug_id_idx ON public.prescription_items(drug_id);
CREATE INDEX IF NOT EXISTS lab_orders_patient_id_idx ON public.lab_orders(patient_id);
CREATE INDEX IF NOT EXISTS lab_results_order_id_idx ON public.lab_results(order_id);
CREATE INDEX IF NOT EXISTS radiology_orders_patient_id_idx ON public.radiology_orders(patient_id);
CREATE INDEX IF NOT EXISTS radiology_results_order_id_idx ON public.radiology_results(order_id);
CREATE INDEX IF NOT EXISTS invoices_patient_id_idx ON public.invoices(patient_id);
CREATE INDEX IF NOT EXISTS invoice_items_invoice_id_idx ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS payments_invoice_id_idx ON public.payments(invoice_id);
CREATE INDEX IF NOT EXISTS admissions_patient_id_idx ON public.admissions(patient_id);
CREATE INDEX IF NOT EXISTS nurse_treatment_sheets_admission_id_idx ON public.nurse_treatment_sheets(admission_id);
CREATE INDEX IF NOT EXISTS referrals_patient_id_idx ON public.referrals(patient_id);
CREATE INDEX IF NOT EXISTS blood_transfusions_patient_id_idx ON public.blood_transfusions(patient_id);
CREATE INDEX IF NOT EXISTS inventory_movements_item_id_idx ON public.inventory_movements(item_id);
CREATE INDEX IF NOT EXISTS stock_movements_item_id_idx ON public.stock_movements(item_id);

-- Transactional inventory adjustment. It prevents negative stock and guarantees
-- the audit movement and stock balance change commit together.
CREATE OR REPLACE FUNCTION public.adjust_inventory(
  target_item_id uuid,
  quantity_delta integer,
  movement_reason text DEFAULT 'Manual adjustment'
)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  current_stock integer;
  next_stock integer;
BEGIN
  IF NOT private.has_role(ARRAY['ADMIN','PHARMACIST']) THEN
    RAISE EXCEPTION 'Not authorized to adjust inventory';
  END IF;
  IF quantity_delta = 0 THEN
    RAISE EXCEPTION 'Quantity adjustment must not be zero';
  END IF;

  SELECT COALESCE(stock_level, 0)
  INTO current_stock
  FROM public.inventory_items
  WHERE id = target_item_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory item not found';
  END IF;

  next_stock := current_stock + quantity_delta;
  IF next_stock < 0 THEN
    RAISE EXCEPTION 'Insufficient stock';
  END IF;

  UPDATE public.inventory_items
  SET stock_level = next_stock, updated_at = now()
  WHERE id = target_item_id;

  INSERT INTO public.stock_movements (
    item_id, type, quantity, source_destination, recorded_by
  ) VALUES (
    target_item_id,
    CASE WHEN quantity_delta > 0 THEN 'IN' ELSE 'OUT' END,
    abs(quantity_delta),
    movement_reason,
    (SELECT auth.uid())
  );

  RETURN next_stock;
END;
$$;

-- Dispense all outstanding items in one transaction and lock inventory rows to
-- avoid overselling medication under concurrent requests.
CREATE OR REPLACE FUNCTION public.dispense_prescription(target_prescription_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  prescription_item record;
  remaining_quantity integer;
  has_items boolean := false;
BEGIN
  IF NOT private.has_role(ARRAY['ADMIN','PHARMACIST']) THEN
    RAISE EXCEPTION 'Not authorized to dispense prescriptions';
  END IF;

  PERFORM 1
  FROM public.prescriptions
  WHERE id = target_prescription_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prescription not found';
  END IF;

  FOR prescription_item IN
    SELECT item.id, item.drug_id, item.quantity_prescribed,
           COALESCE(item.quantity_dispensed, 0) AS quantity_dispensed,
           inventory.stock_level
    FROM public.prescription_items AS item
    JOIN public.inventory_items AS inventory ON inventory.id = item.drug_id
    WHERE item.prescription_id = target_prescription_id
    FOR UPDATE OF item, inventory
  LOOP
    has_items := true;
    remaining_quantity := prescription_item.quantity_prescribed - prescription_item.quantity_dispensed;

    IF remaining_quantity > 0 THEN
      IF COALESCE(prescription_item.stock_level, 0) < remaining_quantity THEN
        RAISE EXCEPTION 'Insufficient stock for prescription item %', prescription_item.id;
      END IF;

      UPDATE public.inventory_items
      SET stock_level = stock_level - remaining_quantity, updated_at = now()
      WHERE id = prescription_item.drug_id;

      UPDATE public.prescription_items
      SET quantity_dispensed = quantity_prescribed
      WHERE id = prescription_item.id;

      INSERT INTO public.stock_movements (
        item_id, type, quantity, source_destination, recorded_by
      ) VALUES (
        prescription_item.drug_id,
        'OUT',
        remaining_quantity,
        'Prescription ' || target_prescription_id::text,
        (SELECT auth.uid())
      );
    END IF;
  END LOOP;

  IF NOT has_items THEN
    RAISE EXCEPTION 'Prescription has no medication items';
  END IF;

  UPDATE public.prescriptions SET status = 'DISPENSED'
  WHERE id = target_prescription_id;
END;
$$;

-- Record a payment and update the invoice balance atomically.
CREATE OR REPLACE FUNCTION public.record_invoice_payment(
  target_invoice_id uuid,
  payment_amount numeric,
  method text,
  reference text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  invoice_total numeric;
  invoice_paid numeric;
  payment_id uuid;
  new_paid numeric;
BEGIN
  IF NOT private.has_role(ARRAY['ADMIN','ACCOUNTANT','RECEPTIONIST']) THEN
    RAISE EXCEPTION 'Not authorized to record payments';
  END IF;
  IF payment_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;

  SELECT total_amount, COALESCE(paid_amount, 0)
  INTO invoice_total, invoice_paid
  FROM public.invoices
  WHERE id = target_invoice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;
  IF payment_amount > invoice_total - invoice_paid THEN
    RAISE EXCEPTION 'Payment exceeds outstanding balance';
  END IF;

  INSERT INTO public.payments (
    invoice_id, amount, payment_method, reference_number, recorded_by
  ) VALUES (
    target_invoice_id, payment_amount, method, reference, (SELECT auth.uid())
  ) RETURNING id INTO payment_id;

  new_paid := invoice_paid + payment_amount;
  UPDATE public.invoices
  SET paid_amount = new_paid,
      status = CASE WHEN new_paid >= invoice_total THEN 'PAID' ELSE 'PARTIAL' END
  WHERE id = target_invoice_id;

  RETURN payment_id;
END;
$$;

-- Log a donation and its available blood stock in one transaction.
CREATE OR REPLACE FUNCTION public.log_blood_donation(
  p_donor_name text,
  p_donor_contact text,
  p_blood_group text,
  p_quantity_ml integer,
  p_component_type text DEFAULT 'WHOLE_BLOOD',
  p_expires_on date DEFAULT (CURRENT_DATE + 42)
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  donation_id uuid;
  inventory_id uuid;
  added_units integer;
BEGIN
  IF NOT private.has_role(ARRAY['ADMIN','NURSE','LAB_TECH']) THEN
    RAISE EXCEPTION 'Not authorized to log blood donations';
  END IF;
  IF p_quantity_ml <= 0 THEN
    RAISE EXCEPTION 'Donation quantity must be greater than zero';
  END IF;

  added_units := GREATEST(1, ceil(p_quantity_ml::numeric / 450)::integer);

  INSERT INTO public.blood_donations (
    donor_name, donor_contact, blood_group, quantity_ml
  ) VALUES (
    p_donor_name, p_donor_contact, p_blood_group, p_quantity_ml
  ) RETURNING id INTO donation_id;

  SELECT id INTO inventory_id
  FROM public.blood_inventory
  WHERE blood_inventory.blood_group = p_blood_group
    AND blood_inventory.component_type = p_component_type
    AND expiry_date = p_expires_on
    AND status = 'AVAILABLE'
  ORDER BY created_at
  LIMIT 1
  FOR UPDATE;

  IF inventory_id IS NULL THEN
    INSERT INTO public.blood_inventory (
      blood_group, component_type, quantity_units, expiry_date, status
    ) VALUES (
      p_blood_group, p_component_type, added_units, p_expires_on, 'AVAILABLE'
    );
  ELSE
    UPDATE public.blood_inventory
    SET quantity_units = COALESCE(quantity_units, 0) + added_units
    WHERE id = inventory_id;
  END IF;

  RETURN donation_id;
END;
$$;

REVOKE ALL ON FUNCTION private.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.adjust_inventory(uuid, integer, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.dispense_prescription(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_invoice_payment(uuid, numeric, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.log_blood_donation(text, text, text, integer, text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.adjust_inventory(uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dispense_prescription(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_invoice_payment(uuid, numeric, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_blood_donation(text, text, text, integer, text, date) TO authenticated;
