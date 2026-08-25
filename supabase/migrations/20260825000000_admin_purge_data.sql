-- Migration: Admin Categorical Data Purge & System Wipe Functions
-- Provides atomic, foreign-key safe categorical deletion for pre-handover cleanup

-- 1. Helper function: Get Live Record Counts by Category
CREATE OR REPLACE FUNCTION public.admin_get_category_counts()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_counts JSONB;
  v_patients_cnt BIGINT := 0;
  v_appointments_cnt BIGINT := 0;
  v_queue_cnt BIGINT := 0;
  v_notes_cnt BIGINT := 0;
  v_vitals_cnt BIGINT := 0;
  v_prescriptions_cnt BIGINT := 0;
  v_labs_cnt BIGINT := 0;
  v_radiology_cnt BIGINT := 0;
  v_invoices_cnt BIGINT := 0;
  v_payments_cnt BIGINT := 0;
  v_expenses_cnt BIGINT := 0;
  v_admissions_cnt BIGINT := 0;
  v_blood_donations_cnt BIGINT := 0;
  v_blood_inventory_cnt BIGINT := 0;
  v_inventory_cnt BIGINT := 0;
  v_payroll_cnt BIGINT := 0;
  v_shifts_cnt BIGINT := 0;
  v_emails_cnt BIGINT := 0;
BEGIN
  -- Patients
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='patients') THEN
    SELECT count(*) INTO v_patients_cnt FROM public.patients;
  END IF;

  -- Appointments & Queue
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='appointments') THEN
    SELECT count(*) INTO v_appointments_cnt FROM public.appointments;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='walkin_queue') THEN
    SELECT count(*) INTO v_queue_cnt FROM public.walkin_queue;
  END IF;

  -- Clinical
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='clinical_notes') THEN
    SELECT count(*) INTO v_notes_cnt FROM public.clinical_notes;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='vitals') THEN
    SELECT count(*) INTO v_vitals_cnt FROM public.vitals;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='prescriptions') THEN
    SELECT count(*) INTO v_prescriptions_cnt FROM public.prescriptions;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='lab_orders') THEN
    SELECT count(*) INTO v_labs_cnt FROM public.lab_orders;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='radiology_orders') THEN
    SELECT count(*) INTO v_radiology_cnt FROM public.radiology_orders;
  END IF;

  -- Billing & Finance
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='invoices') THEN
    SELECT count(*) INTO v_invoices_cnt FROM public.invoices;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='payments') THEN
    SELECT count(*) INTO v_payments_cnt FROM public.payments;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='expenses') THEN
    SELECT count(*) INTO v_expenses_cnt FROM public.expenses;
  END IF;

  -- Inpatient
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='admissions') THEN
    SELECT count(*) INTO v_admissions_cnt FROM public.admissions;
  END IF;

  -- Blood Bank
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='blood_donations') THEN
    SELECT count(*) INTO v_blood_donations_cnt FROM public.blood_donations;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='blood_inventory') THEN
    SELECT count(*) INTO v_blood_inventory_cnt FROM public.blood_inventory;
  END IF;

  -- Inventory
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='inventory_items') THEN
    SELECT count(*) INTO v_inventory_cnt FROM public.inventory_items;
  END IF;

  -- HR & Payroll
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='payroll_records') THEN
    SELECT count(*) INTO v_payroll_cnt FROM public.payroll_records;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='staff_shifts') THEN
    SELECT count(*) INTO v_shifts_cnt FROM public.staff_shifts;
  END IF;

  -- Emails & Logs
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='email_deliveries') THEN
    SELECT count(*) INTO v_emails_cnt FROM public.email_deliveries;
  END IF;

  v_counts := jsonb_build_object(
    'patients', jsonb_build_object('patients', v_patients_cnt, 'total', v_patients_cnt),
    'appointments_queue', jsonb_build_object('appointments', v_appointments_cnt, 'queue', v_queue_cnt, 'total', v_appointments_cnt + v_queue_cnt),
    'clinical_records', jsonb_build_object('notes', v_notes_cnt, 'vitals', v_vitals_cnt, 'prescriptions', v_prescriptions_cnt, 'labs', v_labs_cnt, 'radiology', v_radiology_cnt, 'total', v_notes_cnt + v_vitals_cnt + v_prescriptions_cnt + v_labs_cnt + v_radiology_cnt),
    'billing_finance', jsonb_build_object('invoices', v_invoices_cnt, 'payments', v_payments_cnt, 'expenses', v_expenses_cnt, 'total', v_invoices_cnt + v_payments_cnt + v_expenses_cnt),
    'inpatient_admissions', jsonb_build_object('admissions', v_admissions_cnt, 'total', v_admissions_cnt),
    'blood_bank', jsonb_build_object('donations', v_blood_donations_cnt, 'inventory', v_blood_inventory_cnt, 'total', v_blood_donations_cnt + v_blood_inventory_cnt),
    'inventory_pharmacy', jsonb_build_object('items', v_inventory_cnt, 'total', v_inventory_cnt),
    'hr_payroll', jsonb_build_object('payroll', v_payroll_cnt, 'shifts', v_shifts_cnt, 'total', v_payroll_cnt + v_shifts_cnt),
    'notifications_logs', jsonb_build_object('emails', v_emails_cnt, 'total', v_emails_cnt)
  );

  RETURN v_counts;
END;
$$;


-- 2. Master Categorical Purge Procedure
CREATE OR REPLACE FUNCTION public.admin_purge_category(p_category TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_category TEXT := UPPER(TRIM(p_category));
  v_deleted_count INTEGER := 0;
BEGIN
  -- Perform categorical deletion within transaction
  CASE v_category
    WHEN 'PATIENTS' THEN
      -- Delete all patient records and cascades
      DELETE FROM public.referrals;
      DELETE FROM public.nurse_treatment_sheets;
      DELETE FROM public.admissions;
      UPDATE public.beds SET status = 'VACANT';
      DELETE FROM public.er_visits;
      DELETE FROM public.blood_transfusions;
      DELETE FROM public.diagnosis;
      DELETE FROM public.clinical_notes;
      DELETE FROM public.vitals;
      DELETE FROM public.prescription_items;
      DELETE FROM public.prescriptions;
      DELETE FROM public.lab_results;
      DELETE FROM public.lab_orders;
      DELETE FROM public.radiology_reports;
      DELETE FROM public.radiology_results;
      DELETE FROM public.radiology_orders;
      DELETE FROM public.payments;
      DELETE FROM public.insurance_claims;
      DELETE FROM public.invoice_items;
      DELETE FROM public.invoices;
      DELETE FROM public.walkin_queue;
      DELETE FROM public.appointments;
      DELETE FROM public.patients;
      v_result := jsonb_build_object('success', true, 'category', 'PATIENTS', 'message', 'All patient profiles and related clinical, billing, and queue records were permanently deleted.');

    WHEN 'APPOINTMENTS_QUEUE' THEN
      DELETE FROM public.walkin_queue;
      DELETE FROM public.appointments;
      v_result := jsonb_build_object('success', true, 'category', 'APPOINTMENTS_QUEUE', 'message', 'All walk-in queues and scheduled appointments were cleared.');

    WHEN 'CLINICAL_RECORDS' THEN
      DELETE FROM public.diagnosis;
      DELETE FROM public.clinical_notes;
      DELETE FROM public.vitals;
      DELETE FROM public.prescription_items;
      DELETE FROM public.prescriptions;
      DELETE FROM public.lab_results;
      DELETE FROM public.lab_orders;
      DELETE FROM public.radiology_reports;
      DELETE FROM public.radiology_results;
      DELETE FROM public.radiology_orders;
      DELETE FROM public.er_visits;
      DELETE FROM public.referrals;
      v_result := jsonb_build_object('success', true, 'category', 'CLINICAL_RECORDS', 'message', 'All clinical SOAP notes, vitals, prescriptions, lab results, and radiology reports were permanently deleted.');

    WHEN 'BILLING_FINANCE' THEN
      DELETE FROM public.payments;
      DELETE FROM public.insurance_claims;
      DELETE FROM public.invoice_items;
      DELETE FROM public.invoices;
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='expenses') THEN
        DELETE FROM public.expenses;
      END IF;
      v_result := jsonb_build_object('success', true, 'category', 'BILLING_FINANCE', 'message', 'All invoices, line items, payment transactions, insurance claims, and expenses were permanently cleared.');

    WHEN 'INPATIENT_ADMISSIONS' THEN
      DELETE FROM public.nurse_treatment_sheets;
      DELETE FROM public.admissions;
      UPDATE public.beds SET status = 'VACANT';
      v_result := jsonb_build_object('success', true, 'category', 'INPATIENT_ADMISSIONS', 'message', 'All inpatient admissions and nurse treatment sheets were cleared, and all ward beds were set to VACANT.');

    WHEN 'BLOOD_BANK' THEN
      DELETE FROM public.blood_transfusions;
      DELETE FROM public.blood_donations;
      DELETE FROM public.blood_inventory;
      v_result := jsonb_build_object('success', true, 'category', 'BLOOD_BANK', 'message', 'All blood donations, transfusion logs, and blood unit inventory were permanently cleared.');

    WHEN 'INVENTORY_PHARMACY' THEN
      DELETE FROM public.stock_movements;
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='inventory_movements') THEN
        DELETE FROM public.inventory_movements;
      END IF;
      DELETE FROM public.po_items;
      DELETE FROM public.goods_received_notes;
      DELETE FROM public.purchase_orders;
      DELETE FROM public.prescription_items;
      DELETE FROM public.inventory_items;
      DELETE FROM public.suppliers;
      v_result := jsonb_build_object('success', true, 'category', 'INVENTORY_PHARMACY', 'message', 'All pharmacy inventory, stock movements, purchase orders, and supplier catalogs were permanently cleared.');

    WHEN 'HR_PAYROLL' THEN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='payslips') THEN
        DELETE FROM public.payslips;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='payroll_runs') THEN
        DELETE FROM public.payroll_runs;
      END IF;
      DELETE FROM public.payroll_records;
      DELETE FROM public.staff_shifts;
      DELETE FROM public.leave_requests;
      v_result := jsonb_build_object('success', true, 'category', 'HR_PAYROLL', 'message', 'All payroll disbursement records, payslips, staff shift rosters, and leave requests were permanently cleared.');

    WHEN 'NOTIFICATIONS_LOGS' THEN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='email_webhook_events') THEN
        DELETE FROM public.email_webhook_events;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='email_deliveries') THEN
        DELETE FROM public.email_deliveries;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='email_notification_jobs') THEN
        DELETE FROM public.email_notification_jobs;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='tv_broadcast_codes') THEN
        DELETE FROM public.tv_broadcast_codes;
      END IF;
      v_result := jsonb_build_object('success', true, 'category', 'NOTIFICATIONS_LOGS', 'message', 'All notification queues, email delivery histories, and TV pairing broadcast codes were cleared.');

    WHEN 'ALL_TRANSACTIONAL_DATA' THEN
      -- Full transactional wipe
      DELETE FROM public.referrals;
      DELETE FROM public.nurse_treatment_sheets;
      DELETE FROM public.admissions;
      UPDATE public.beds SET status = 'VACANT';
      DELETE FROM public.er_visits;
      DELETE FROM public.blood_transfusions;
      DELETE FROM public.blood_donations;
      DELETE FROM public.blood_inventory;
      DELETE FROM public.diagnosis;
      DELETE FROM public.clinical_notes;
      DELETE FROM public.vitals;
      DELETE FROM public.prescription_items;
      DELETE FROM public.prescriptions;
      DELETE FROM public.lab_results;
      DELETE FROM public.lab_orders;
      DELETE FROM public.radiology_reports;
      DELETE FROM public.radiology_results;
      DELETE FROM public.radiology_orders;
      DELETE FROM public.payments;
      DELETE FROM public.insurance_claims;
      DELETE FROM public.invoice_items;
      DELETE FROM public.invoices;
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='expenses') THEN
        DELETE FROM public.expenses;
      END IF;
      DELETE FROM public.walkin_queue;
      DELETE FROM public.appointments;
      DELETE FROM public.patients;
      DELETE FROM public.stock_movements;
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='inventory_movements') THEN
        DELETE FROM public.inventory_movements;
      END IF;
      DELETE FROM public.po_items;
      DELETE FROM public.goods_received_notes;
      DELETE FROM public.purchase_orders;
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='payslips') THEN
        DELETE FROM public.payslips;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='payroll_runs') THEN
        DELETE FROM public.payroll_runs;
      END IF;
      DELETE FROM public.payroll_records;
      DELETE FROM public.staff_shifts;
      DELETE FROM public.leave_requests;
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='email_webhook_events') THEN
        DELETE FROM public.email_webhook_events;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='email_deliveries') THEN
        DELETE FROM public.email_deliveries;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='email_notification_jobs') THEN
        DELETE FROM public.email_notification_jobs;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='tv_broadcast_codes') THEN
        DELETE FROM public.tv_broadcast_codes;
      END IF;

      v_result := jsonb_build_object('success', true, 'category', 'ALL_TRANSACTIONAL_DATA', 'message', 'Full System Handover Reset Complete: All test patients, queues, clinical charts, billing transactions, inpatient records, and notification logs were permanently erased. Master settings, departments, wards, and admin accounts have been preserved.');

    ELSE
      RAISE EXCEPTION 'Invalid data purge category: %', p_category;
  END CASE;

  RETURN v_result;
END;
$$;

-- Grant execution to authenticated users (admin checks are verified in security definer or server action)
GRANT EXECUTE ON FUNCTION public.admin_get_category_counts() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_purge_category(TEXT) TO authenticated, service_role;
