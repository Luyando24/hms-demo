-- Create hospital manual incomes ledger table
CREATE TABLE IF NOT EXISTS public.incomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL DEFAULT 'DIRECT_PAYMENT',
  amount numeric NOT NULL CHECK (amount > 0),
  payment_method text DEFAULT 'CASH',
  reference_number text,
  income_date date DEFAULT CURRENT_DATE,
  notes text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- Enable RLS
ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;

-- Allow authenticated staff with roles to view incomes
CREATE POLICY "Allow authenticated staff to read incomes"
ON public.incomes FOR SELECT
TO authenticated
USING (true);

-- Allow admin, accountant, receptionist, cashier to insert incomes
CREATE POLICY "Allow staff to insert incomes"
ON public.incomes FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE role IN ('ADMIN', 'ACCOUNTANT', 'RECEPTIONIST', 'CASHIER', 'NURSE', 'DOCTOR')
  )
);

-- Allow admin and accountant to update incomes
CREATE POLICY "Allow admin and accountant to update incomes"
ON public.incomes FOR UPDATE
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE role IN ('ADMIN', 'ACCOUNTANT')
  )
);

-- Allow admin to delete incomes
CREATE POLICY "Allow admin to delete incomes"
ON public.incomes FOR DELETE
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE role = 'ADMIN'
  )
);
