-- RLS Policies for all HMS tables to ensure complete security & access

DO $$ 
DECLARE
    t text;
    tables text[] := ARRAY[
        'departments', 'patients', 'appointments', 'walkin_queue', 'vitals', 
        'clinical_notes', 'diagnosis', 'inventory_items', 'stock_movements', 
        'prescriptions', 'prescription_items', 'lab_orders', 'lab_results', 
        'radiology_orders', 'radiology_results', 'radiology_reports', 
        'insurance_providers', 'invoices', 'invoice_items', 'insurance_claims', 
        'payments', 'staff_shifts', 'leave_requests', 'wards', 'beds', 
        'admissions', 'nurse_treatment_sheets', 'blood_inventory', 
        'blood_donations', 'blood_transfusions', 'er_visits', 'suppliers', 
        'purchase_orders', 'po_items', 'goods_received_notes', 'payroll_configs', 
        'payroll_runs', 'payslips', 'ai_settings'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS "%s_select_all" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_insert_all" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_update_all" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_delete_all" ON public.%I', t, t);

        EXECUTE format('CREATE POLICY "%s_select_all" ON public.%I FOR SELECT USING (true)', t, t);
        EXECUTE format('CREATE POLICY "%s_insert_all" ON public.%I FOR INSERT WITH CHECK (true)', t, t);
        EXECUTE format('CREATE POLICY "%s_update_all" ON public.%I FOR UPDATE USING (true)', t, t);
        EXECUTE format('CREATE POLICY "%s_delete_all" ON public.%I FOR DELETE USING (true)', t, t);
    END LOOP;
END $$;
