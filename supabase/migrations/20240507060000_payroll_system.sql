-- Migration for Enterprise HR Payroll Management System

CREATE TABLE IF NOT EXISTS public.payroll_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    pay_period TEXT NOT NULL, -- e.g. "July 2026"
    base_salary NUMERIC DEFAULT 0,
    allowances NUMERIC DEFAULT 0,
    deductions NUMERIC DEFAULT 0,
    net_salary NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'PROCESSED', -- 'DRAFT', 'PROCESSED', 'DISBURSED'
    processed_at TIMESTAMPTZ DEFAULT now(),
    payment_method TEXT DEFAULT 'BANK_TRANSFER',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payroll_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payroll_records_select_all" ON public.payroll_records;
DROP POLICY IF EXISTS "payroll_records_insert_all" ON public.payroll_records;
DROP POLICY IF EXISTS "payroll_records_update_all" ON public.payroll_records;
DROP POLICY IF EXISTS "payroll_records_delete_all" ON public.payroll_records;

CREATE POLICY "payroll_records_select_all" ON public.payroll_records FOR SELECT USING (true);
CREATE POLICY "payroll_records_insert_all" ON public.payroll_records FOR INSERT WITH CHECK (true);
CREATE POLICY "payroll_records_update_all" ON public.payroll_records FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "payroll_records_delete_all" ON public.payroll_records FOR DELETE USING (true);
