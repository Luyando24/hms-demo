-- Resolve the remaining live database advisor findings and consolidate each
-- table to one permissive policy per role/action.

DROP TRIGGER IF EXISTS tr_generate_patient_file_number ON public.patients;
DROP FUNCTION IF EXISTS public.generate_patient_file_number();

DROP TRIGGER IF EXISTS tr_generate_staff_number ON public.profiles;
DROP FUNCTION IF EXISTS public.generate_staff_number();

CREATE OR REPLACE FUNCTION private.assign_staff_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.role <> 'PATIENT'
    AND (NEW.staff_number IS NULL OR btrim(NEW.staff_number) = '') THEN
    NEW.staff_number := 'HMS-S-' || to_char(clock_timestamp(), 'YYMMDD') || '-'
      || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER assign_staff_number
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION private.assign_staff_number();
REVOKE ALL ON FUNCTION private.assign_staff_number() FROM PUBLIC, anon, authenticated;

DROP FUNCTION IF EXISTS public.get_my_role();

DO $$
BEGIN
  IF to_regprocedure('public.rls_auto_enable()') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
  END IF;
END
$$;

DO $$
DECLARE
  policy_record record;
BEGIN
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

CREATE OR REPLACE PROCEDURE private.install_table_policies(
  target_table text,
  select_expression text,
  insert_expression text,
  update_expression text,
  delete_expression text
)
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF select_expression IS NOT NULL THEN
    EXECUTE format(
      'CREATE POLICY select_access ON public.%I FOR SELECT TO authenticated USING (%s)',
      target_table,
      select_expression
    );
  END IF;
  IF insert_expression IS NOT NULL THEN
    EXECUTE format(
      'CREATE POLICY insert_access ON public.%I FOR INSERT TO authenticated WITH CHECK (%s)',
      target_table,
      insert_expression
    );
  END IF;
  IF update_expression IS NOT NULL THEN
    EXECUTE format(
      'CREATE POLICY update_access ON public.%I FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)',
      target_table,
      update_expression,
      update_expression
    );
  END IF;
  IF delete_expression IS NOT NULL THEN
    EXECUTE format(
      'CREATE POLICY delete_access ON public.%I FOR DELETE TO authenticated USING (%s)',
      target_table,
      delete_expression
    );
  END IF;
END;
$$;

-- Laboratory and radiology.
CALL private.install_table_policies(
  'lab_orders',
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE','LAB_TECH']) OR private.owns_patient(patient_id)$policy$,
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE','LAB_TECH'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE','LAB_TECH'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE','LAB_TECH'])$policy$
);
CALL private.install_table_policies(
  'lab_results',
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE','LAB_TECH']) OR private.owns_lab_order(order_id)$policy$,
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE','LAB_TECH'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE','LAB_TECH'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE','LAB_TECH'])$policy$
);
CALL private.install_table_policies(
  'radiology_orders',
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE','RADIOLOGIST']) OR private.owns_patient(patient_id)$policy$,
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE','RADIOLOGIST'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE','RADIOLOGIST'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE','RADIOLOGIST'])$policy$
);
CALL private.install_table_policies(
  'radiology_results',
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE','RADIOLOGIST']) OR private.owns_radiology_order(order_id)$policy$,
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE','RADIOLOGIST'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE','RADIOLOGIST'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE','RADIOLOGIST'])$policy$
);
CALL private.install_table_policies(
  'radiology_reports',
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE','RADIOLOGIST']) OR private.owns_radiology_order(order_id)$policy$,
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE','RADIOLOGIST'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE','RADIOLOGIST'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE','RADIOLOGIST'])$policy$
);

-- Billing and finance.
CALL private.install_table_policies(
  'insurance_providers',
  $policy$private.is_staff()$policy$,
  $policy$private.has_role(ARRAY['ADMIN','ACCOUNTANT','RECEPTIONIST'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','ACCOUNTANT','RECEPTIONIST'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','ACCOUNTANT','RECEPTIONIST'])$policy$
);
CALL private.install_table_policies(
  'invoices',
  $policy$private.has_role(ARRAY['ADMIN','ACCOUNTANT','RECEPTIONIST']) OR private.owns_patient(patient_id)$policy$,
  $policy$private.has_role(ARRAY['ADMIN','ACCOUNTANT','RECEPTIONIST'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','ACCOUNTANT','RECEPTIONIST'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','ACCOUNTANT','RECEPTIONIST'])$policy$
);
CALL private.install_table_policies(
  'invoice_items',
  $policy$private.has_role(ARRAY['ADMIN','ACCOUNTANT','RECEPTIONIST']) OR private.owns_invoice(invoice_id)$policy$,
  $policy$private.has_role(ARRAY['ADMIN','ACCOUNTANT','RECEPTIONIST'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','ACCOUNTANT','RECEPTIONIST'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','ACCOUNTANT','RECEPTIONIST'])$policy$
);
CALL private.install_table_policies(
  'insurance_claims',
  $policy$private.has_role(ARRAY['ADMIN','ACCOUNTANT','RECEPTIONIST']) OR private.owns_invoice(invoice_id)$policy$,
  $policy$private.has_role(ARRAY['ADMIN','ACCOUNTANT','RECEPTIONIST'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','ACCOUNTANT','RECEPTIONIST'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','ACCOUNTANT','RECEPTIONIST'])$policy$
);
CALL private.install_table_policies(
  'payments',
  $policy$private.has_role(ARRAY['ADMIN','ACCOUNTANT','RECEPTIONIST']) OR private.owns_invoice(invoice_id)$policy$,
  $policy$private.has_role(ARRAY['ADMIN','ACCOUNTANT','RECEPTIONIST'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','ACCOUNTANT','RECEPTIONIST'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','ACCOUNTANT','RECEPTIONIST'])$policy$
);
CALL private.install_table_policies(
  'expenses',
  $policy$private.has_role(ARRAY['ADMIN','ACCOUNTANT'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','ACCOUNTANT'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','ACCOUNTANT'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','ACCOUNTANT'])$policy$
);

-- Clinical records.
CALL private.install_table_policies(
  'vitals',
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE']) OR private.owns_patient(patient_id)$policy$,
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE'])$policy$
);
CALL private.install_table_policies(
  'clinical_notes',
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE']) OR private.owns_patient(patient_id)$policy$,
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE'])$policy$
);
CALL private.install_table_policies(
  'diagnosis',
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE']) OR private.owns_clinical_note(note_id)$policy$,
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE'])$policy$
);
CALL private.install_table_policies(
  'admissions',
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE']) OR private.owns_patient(patient_id)$policy$,
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE'])$policy$
);
CALL private.install_table_policies(
  'nurse_treatment_sheets',
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE']) OR private.owns_admission(admission_id)$policy$,
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE'])$policy$
);
CALL private.install_table_policies(
  'er_visits',
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE']) OR private.owns_patient(patient_id)$policy$,
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE'])$policy$
);
CALL private.install_table_policies(
  'referrals',
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE']) OR private.owns_patient(patient_id)$policy$,
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE'])$policy$
);

-- Pharmacy and inventory.
CALL private.install_table_policies(
  'inventory_items',
  $policy$private.is_staff()$policy$,
  $policy$private.has_role(ARRAY['ADMIN','PHARMACIST'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','PHARMACIST'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','PHARMACIST'])$policy$
);
CALL private.install_table_policies(
  'stock_movements',
  $policy$private.has_role(ARRAY['ADMIN','PHARMACIST'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','PHARMACIST'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','PHARMACIST'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','PHARMACIST'])$policy$
);
CALL private.install_table_policies(
  'inventory_movements',
  $policy$private.has_role(ARRAY['ADMIN','PHARMACIST'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','PHARMACIST'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','PHARMACIST'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','PHARMACIST'])$policy$
);
CALL private.install_table_policies(
  'prescriptions',
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','PHARMACIST']) OR private.owns_patient(patient_id)$policy$,
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','PHARMACIST'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','PHARMACIST'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','PHARMACIST'])$policy$
);
CALL private.install_table_policies(
  'prescription_items',
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','PHARMACIST']) OR private.owns_prescription(prescription_id)$policy$,
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','PHARMACIST'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','PHARMACIST'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','PHARMACIST'])$policy$
);

CALL private.install_table_policies(
  'profiles',
  $policy$private.is_staff() OR id = (SELECT auth.uid()) OR role = 'DOCTOR'$policy$,
  NULL,
  $policy$id = (SELECT auth.uid())$policy$,
  NULL
);

CALL private.install_table_policies(
  'patients',
  $policy$private.is_staff() OR auth_user_id = (SELECT auth.uid())$policy$,
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE','RECEPTIONIST'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE','RECEPTIONIST'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE','RECEPTIONIST'])$policy$
);

CALL private.install_table_policies(
  'appointments',
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE','RECEPTIONIST']) OR private.owns_patient(patient_id)$policy$,
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE','RECEPTIONIST']) OR private.owns_patient(patient_id)$policy$,
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE','RECEPTIONIST']) OR private.owns_patient(patient_id)$policy$,
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE','RECEPTIONIST'])$policy$
);

CALL private.install_table_policies(
  'walkin_queue',
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE','RECEPTIONIST'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE','RECEPTIONIST'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE','RECEPTIONIST'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE','RECEPTIONIST'])$policy$
);

DO $$
DECLARE
  table_name text;
  write_rule text := $rule$private.has_role(ARRAY['ADMIN','NURSE','RECEPTIONIST'])$rule$;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['departments','rooms','wards','beds']
  LOOP
    CALL private.install_table_policies(
      table_name,
      'private.is_staff()',
      write_rule,
      write_rule,
      write_rule
    );
  END LOOP;
END
$$;

-- Blood bank.
CALL private.install_table_policies(
  'blood_inventory',
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE','LAB_TECH'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE','LAB_TECH'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE','LAB_TECH'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE','LAB_TECH'])$policy$
);
CALL private.install_table_policies(
  'blood_donations',
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE','LAB_TECH'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE','LAB_TECH'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE','LAB_TECH'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE','LAB_TECH'])$policy$
);
CALL private.install_table_policies(
  'blood_transfusions',
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE','LAB_TECH']) OR private.owns_patient(patient_id)$policy$,
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE','LAB_TECH'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE','LAB_TECH'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','DOCTOR','NURSE','LAB_TECH'])$policy$
);

-- Procurement.
DO $$
DECLARE
  table_name text;
  access_rule text := $rule$private.has_role(ARRAY['ADMIN','PHARMACIST','ACCOUNTANT'])$rule$;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['suppliers','purchase_orders','po_items','goods_received_notes']
  LOOP
    CALL private.install_table_policies(
      table_name,
      access_rule,
      access_rule,
      access_rule,
      access_rule
    );
  END LOOP;
END
$$;

-- Staff self-service and payroll.
CALL private.install_table_policies(
  'staff_shifts',
  $policy$staff_id = (SELECT auth.uid()) OR private.has_role(ARRAY['ADMIN'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN'])$policy$
);
CALL private.install_table_policies(
  'leave_requests',
  $policy$staff_id = (SELECT auth.uid()) OR private.has_role(ARRAY['ADMIN'])$policy$,
  $policy$(staff_id = (SELECT auth.uid()) AND private.is_staff()) OR private.has_role(ARRAY['ADMIN'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN'])$policy$
);
CALL private.install_table_policies(
  'payroll_configs',
  $policy$profile_id = (SELECT auth.uid()) OR private.has_role(ARRAY['ADMIN','ACCOUNTANT'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','ACCOUNTANT'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','ACCOUNTANT'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','ACCOUNTANT'])$policy$
);
CALL private.install_table_policies(
  'payroll_runs',
  $policy$private.has_role(ARRAY['ADMIN','ACCOUNTANT'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','ACCOUNTANT'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','ACCOUNTANT'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','ACCOUNTANT'])$policy$
);
CALL private.install_table_policies(
  'payslips',
  $policy$profile_id = (SELECT auth.uid()) OR private.has_role(ARRAY['ADMIN','ACCOUNTANT'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','ACCOUNTANT'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','ACCOUNTANT'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','ACCOUNTANT'])$policy$
);
CALL private.install_table_policies(
  'payroll_records',
  $policy$staff_id = (SELECT auth.uid()) OR private.has_role(ARRAY['ADMIN','ACCOUNTANT'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','ACCOUNTANT'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','ACCOUNTANT'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN','ACCOUNTANT'])$policy$
);

-- Administrative records.
CALL private.install_table_policies(
  'clinic_assets',
  $policy$private.is_staff()$policy$,
  $policy$private.has_role(ARRAY['ADMIN'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN'])$policy$
);
CALL private.install_table_policies(
  'clinic_documents',
  $policy$private.is_staff()$policy$,
  $policy$private.has_role(ARRAY['ADMIN'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN'])$policy$
);
CALL private.install_table_policies(
  'ai_settings',
  $policy$private.has_role(ARRAY['ADMIN'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN'])$policy$
);

CALL private.install_table_policies(
  'system_settings',
  'true',
  $policy$private.has_role(ARRAY['ADMIN'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN'])$policy$,
  $policy$private.has_role(ARRAY['ADMIN'])$policy$
);
CREATE POLICY system_settings_anon_select
ON public.system_settings FOR SELECT TO anon
USING (true);

DROP PROCEDURE private.install_table_policies(text, text, text, text, text);
