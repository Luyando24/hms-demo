-- Initial schema for Hospital Management System

-- 1. Departments
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Profiles (Staff)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    first_name TEXT,
    last_name TEXT,
    role TEXT NOT NULL DEFAULT 'STAFF',
    department_id UUID REFERENCES public.departments(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Patients
CREATE TABLE IF NOT EXISTS public.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_number TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    dob DATE NOT NULL,
    gender TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    insurance_provider TEXT,
    insurance_policy_number TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Appointments
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id),
    provider_id UUID REFERENCES public.profiles(id),
    appointment_date TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'SCHEDULED',
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Walk-in Queue
CREATE TABLE IF NOT EXISTS public.walkin_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id),
    department_id UUID REFERENCES public.departments(id),
    status TEXT NOT NULL DEFAULT 'WAITING',
    priority TEXT NOT NULL DEFAULT 'NORMAL',
    check_in_time TIMESTAMPTZ DEFAULT now(),
    token_number TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Vitals
CREATE TABLE IF NOT EXISTS public.vitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id),
    recorded_by UUID REFERENCES public.profiles(id),
    bp_systolic INTEGER,
    bp_diastolic INTEGER,
    heart_rate INTEGER,
    temperature NUMERIC,
    sp_o2 INTEGER,
    weight NUMERIC,
    height NUMERIC,
    bmi NUMERIC,
    recorded_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Clinical Notes
CREATE TABLE IF NOT EXISTS public.clinical_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id),
    provider_id UUID REFERENCES public.profiles(id),
    subjective TEXT,
    objective TEXT,
    assessment TEXT,
    plan TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Diagnosis
CREATE TABLE IF NOT EXISTS public.diagnosis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID REFERENCES public.clinical_notes(id),
    icd10_code TEXT NOT NULL,
    description TEXT,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Inventory Items
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    unit TEXT NOT NULL,
    stock_level INTEGER DEFAULT 0,
    reorder_level INTEGER DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Stock Movements
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES public.inventory_items(id),
    type TEXT NOT NULL, -- IN, OUT, ADJUST
    quantity INTEGER NOT NULL,
    source_destination TEXT,
    recorded_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. Prescriptions
CREATE TABLE IF NOT EXISTS public.prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id),
    provider_id UUID REFERENCES public.profiles(id),
    status TEXT NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 12. Prescription Items
CREATE TABLE IF NOT EXISTS public.prescription_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id UUID REFERENCES public.prescriptions(id),
    drug_id UUID REFERENCES public.inventory_items(id),
    dosage TEXT NOT NULL,
    frequency TEXT NOT NULL,
    duration TEXT NOT NULL,
    instructions TEXT,
    quantity_prescribed INTEGER NOT NULL,
    quantity_dispensed INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 13. Lab Orders
CREATE TABLE IF NOT EXISTS public.lab_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id),
    provider_id UUID REFERENCES public.profiles(id),
    status TEXT NOT NULL DEFAULT 'ORDERED',
    priority TEXT NOT NULL DEFAULT 'NORMAL',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 14. Lab Results
CREATE TABLE IF NOT EXISTS public.lab_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.lab_orders(id),
    test_name TEXT NOT NULL,
    result_value TEXT,
    unit TEXT,
    reference_range TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING',
    validated_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 15. Radiology Orders
CREATE TABLE IF NOT EXISTS public.radiology_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id),
    provider_id UUID REFERENCES public.profiles(id),
    modality TEXT NOT NULL,
    body_part TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ORDERED',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 16. Radiology Results
CREATE TABLE IF NOT EXISTS public.radiology_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.radiology_orders(id),
    radiologist_id UUID REFERENCES public.profiles(id),
    findings TEXT,
    conclusion TEXT,
    image_urls TEXT[],
    signature_data TEXT,
    signed_at TIMESTAMPTZ,
    is_finalized BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 17. Radiology Reports (Extra table from old project)
CREATE TABLE IF NOT EXISTS public.radiology_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.radiology_orders(id),
    findings TEXT,
    impression TEXT,
    radiologist_id UUID REFERENCES public.profiles(id),
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 18. Insurance Providers
CREATE TABLE IF NOT EXISTS public.insurance_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT UNIQUE,
    contact_details JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 19. Invoices
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id),
    total_amount NUMERIC NOT NULL,
    paid_amount NUMERIC DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'UNPAID',
    insurance_provider_id UUID REFERENCES public.insurance_providers(id),
    insurance_claim_id UUID, -- Will link to insurance_claims later
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 20. Invoice Items
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES public.invoices(id),
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price NUMERIC NOT NULL,
    total_price NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 21. Insurance Claims
CREATE TABLE IF NOT EXISTS public.insurance_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES public.invoices(id),
    provider_id UUID REFERENCES public.insurance_providers(id),
    claim_number TEXT UNIQUE,
    status TEXT DEFAULT 'PENDING',
    amount_claimed NUMERIC NOT NULL,
    amount_approved NUMERIC DEFAULT 0,
    rejection_reason TEXT,
    submitted_at TIMESTAMPTZ,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add backlink for invoices
ALTER TABLE public.invoices ADD CONSTRAINT invoices_insurance_claim_id_fkey FOREIGN KEY (insurance_claim_id) REFERENCES public.insurance_claims(id);

-- 22. Payments
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES public.invoices(id),
    amount NUMERIC NOT NULL,
    payment_method TEXT NOT NULL,
    reference_number TEXT,
    recorded_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 23. Staff Shifts
CREATE TABLE IF NOT EXISTS public.staff_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID REFERENCES public.profiles(id),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    shift_type TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 24. Leave Requests
CREATE TABLE IF NOT EXISTS public.leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID REFERENCES public.profiles(id),
    leave_type TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 25. Wards
CREATE TABLE IF NOT EXISTS public.wards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    floor TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 26. Beds
CREATE TABLE IF NOT EXISTS public.beds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ward_id UUID REFERENCES public.wards(id),
    bed_number TEXT NOT NULL,
    status TEXT DEFAULT 'VACANT',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 27. Admissions
CREATE TABLE IF NOT EXISTS public.admissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id),
    bed_id UUID REFERENCES public.beds(id),
    admission_date TIMESTAMPTZ DEFAULT now(),
    discharge_date TIMESTAMPTZ,
    reason TEXT,
    admitting_doctor_id UUID REFERENCES public.profiles(id),
    status TEXT DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 28. Nurse Treatment Sheets
CREATE TABLE IF NOT EXISTS public.nurse_treatment_sheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admission_id UUID REFERENCES public.admissions(id),
    nurse_id UUID REFERENCES public.profiles(id),
    medication_administered TEXT,
    fluid_intake NUMERIC,
    fluid_output NUMERIC,
    observations TEXT,
    vitals_captured JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 29. Blood Inventory
CREATE TABLE IF NOT EXISTS public.blood_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blood_group TEXT NOT NULL,
    component_type TEXT NOT NULL,
    quantity_units INTEGER DEFAULT 0,
    expiry_date DATE NOT NULL,
    status TEXT DEFAULT 'AVAILABLE',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 30. Blood Donations
CREATE TABLE IF NOT EXISTS public.blood_donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donor_name TEXT NOT NULL,
    donor_contact TEXT,
    blood_group TEXT NOT NULL,
    quantity_ml INTEGER NOT NULL,
    donation_date DATE DEFAULT CURRENT_DATE,
    screened BOOLEAN DEFAULT false,
    result TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 31. Blood Transfusions
CREATE TABLE IF NOT EXISTS public.blood_transfusions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id),
    doctor_id UUID REFERENCES public.profiles(id),
    blood_group_required TEXT NOT NULL,
    component_required TEXT NOT NULL,
    quantity_units INTEGER NOT NULL,
    urgency TEXT DEFAULT 'ROUTINE',
    status TEXT DEFAULT 'PENDING',
    crossmatch_result TEXT,
    transfused_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 32. Emergency Visits (ER)
CREATE TABLE IF NOT EXISTS public.er_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id),
    arrival_mode TEXT,
    chief_complaint TEXT NOT NULL,
    triage_level TEXT NOT NULL,
    vitals_snapshot JSONB,
    assigned_doctor_id UUID REFERENCES public.profiles(id),
    status TEXT DEFAULT 'TRIAGE',
    disposition TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 33. Suppliers
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT UNIQUE,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    category TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 34. Purchase Orders
CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES public.suppliers(id),
    po_number TEXT UNIQUE,
    status TEXT DEFAULT 'DRAFT',
    total_amount NUMERIC DEFAULT 0,
    expected_delivery_date DATE,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 35. PO Items
CREATE TABLE IF NOT EXISTS public.po_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id UUID REFERENCES public.purchase_orders(id),
    item_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price NUMERIC NOT NULL,
    total_price NUMERIC GENERATED ALWAYS AS (quantity::NUMERIC * unit_price) STORED,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 36. Goods Received Notes (GRN)
CREATE TABLE IF NOT EXISTS public.goods_received_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id UUID REFERENCES public.purchase_orders(id),
    grn_number TEXT UNIQUE,
    received_date TIMESTAMPTZ DEFAULT now(),
    received_by UUID REFERENCES public.profiles(id),
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 37. Payroll Configs
CREATE TABLE IF NOT EXISTS public.payroll_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID UNIQUE REFERENCES public.profiles(id),
    basic_salary NUMERIC DEFAULT 0,
    housing_allowance NUMERIC DEFAULT 0,
    transport_allowance NUMERIC DEFAULT 0,
    medical_allowance NUMERIC DEFAULT 0,
    pension_id TEXT,
    tax_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 38. Payroll Runs
CREATE TABLE IF NOT EXISTS public.payroll_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    status TEXT DEFAULT 'DRAFT',
    total_payout NUMERIC DEFAULT 0,
    processed_by UUID REFERENCES public.profiles(id),
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 39. Payslips
CREATE TABLE IF NOT EXISTS public.payslips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_run_id UUID REFERENCES public.payroll_runs(id),
    profile_id UUID REFERENCES public.profiles(id),
    basic_salary NUMERIC NOT NULL,
    allowances_json JSONB,
    deductions_json JSONB,
    net_pay NUMERIC NOT NULL,
    status TEXT DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 40. AI Settings
CREATE TABLE IF NOT EXISTS public.ai_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    default_model TEXT DEFAULT 'openai',
    available_models TEXT[] DEFAULT ARRAY['openai', 'gemini', 'groq'],
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS for all tables
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.walkin_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnosis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.radiology_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.radiology_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.radiology_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nurse_treatment_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_transfusions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.er_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.po_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goods_received_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;
