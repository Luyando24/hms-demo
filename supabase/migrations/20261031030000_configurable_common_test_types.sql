-- Migration: Configurable Common Medical Test Types
-- Enables Super Users and Administrators to configure commonly performed medical test types
-- so authorized clinicians and lab technicians can select standard tests instead of typing manually.

CREATE TABLE IF NOT EXISTS public.common_test_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'General',
    default_unit TEXT,
    default_reference_range TEXT,
    description TEXT,
    price NUMERIC(10, 2) DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique index to prevent duplicate test names (case-insensitive and trimmed)
CREATE UNIQUE INDEX IF NOT EXISTS common_test_types_name_unique_idx 
ON public.common_test_types (lower(trim(name)));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS common_test_types_is_active_idx ON public.common_test_types (is_active);
CREATE INDEX IF NOT EXISTS common_test_types_category_idx ON public.common_test_types (category);

-- Enable Row Level Security
ALTER TABLE public.common_test_types ENABLE ROW LEVEL SECURITY;

-- 1. All authenticated hospital staff can view active test types (and admins can view all)
DROP POLICY IF EXISTS "Authenticated staff can view common test types" ON public.common_test_types;
CREATE POLICY "Authenticated staff can view common test types"
ON public.common_test_types
FOR SELECT
TO authenticated
USING (
    is_active = true OR
    private.has_role(ARRAY['ADMIN', 'SUPER_USER'])
);

-- 2. Only Super Users and Administrators can insert common test types
DROP POLICY IF EXISTS "Admins and Super Users can insert common test types" ON public.common_test_types;
CREATE POLICY "Admins and Super Users can insert common test types"
ON public.common_test_types
FOR INSERT
TO authenticated
WITH CHECK (
    private.has_role(ARRAY['ADMIN', 'SUPER_USER'])
);

-- 3. Only Super Users and Administrators can update common test types
DROP POLICY IF EXISTS "Admins and Super Users can update common test types" ON public.common_test_types;
CREATE POLICY "Admins and Super Users can update common test types"
ON public.common_test_types
FOR UPDATE
TO authenticated
USING (
    private.has_role(ARRAY['ADMIN', 'SUPER_USER'])
)
WITH CHECK (
    private.has_role(ARRAY['ADMIN', 'SUPER_USER'])
);

-- 4. Only Super Users and Administrators can delete common test types
DROP POLICY IF EXISTS "Admins and Super Users can delete common test types" ON public.common_test_types;
CREATE POLICY "Admins and Super Users can delete common test types"
ON public.common_test_types
FOR DELETE
TO authenticated
USING (
    private.has_role(ARRAY['ADMIN', 'SUPER_USER'])
);

-- Seed initial standard medical test types if table is empty
INSERT INTO public.common_test_types (name, category, default_unit, default_reference_range, description)
VALUES
    ('Full Blood Count (FBC / CBC)', 'Hematology', '10^9/L', '4.0 - 11.0', 'Complete hematological analysis: WBC, RBC, Hemoglobin, Platelets'),
    ('Malaria Rapid Diagnostic Test (RDT)', 'Parasitology', 'Qualitative', 'Negative', 'Antigen detection for Plasmodium falciparum / pan-species'),
    ('Fasting Blood Glucose (FBS)', 'Biochemistry', 'mmol/L', '3.9 - 5.6', 'Evaluation of metabolic glucose homeostasis after 8h fasting'),
    ('Random Blood Sugar (RBS)', 'Biochemistry', 'mmol/L', '4.0 - 7.8', 'Point-of-care or laboratory random glycemic level evaluation'),
    ('Urinalysis (Complete Dipstick & Microscopy)', 'Urinalysis', 'Qualitative / Semi-quantitative', 'Negative', 'Assessment of pH, Protein, Glucose, Nitrites, Leukocytes, and Microscopic deposits'),
    ('Lipid Profile', 'Biochemistry', 'mmol/L', 'Total: < 5.2, LDL: < 3.4', 'Cardiovascular risk assessment: Total Cholesterol, HDL, LDL, Triglycerides'),
    ('Liver Function Tests (LFT)', 'Biochemistry', 'U/L', 'ALT: 7-56, AST: 10-40', 'Hepatic panel: ALT, AST, Alkaline Phosphatase, Total & Direct Bilirubin, Albumin'),
    ('Renal Function Tests (Urea & Creatinine)', 'Biochemistry', 'umol/L', 'Creatinine: 62-106, Urea: 2.5-7.1', 'Kidney function and electrolyte clearance panel'),
    ('HIV 1 & 2 Rapid Antibody Screen', 'Immunology', 'Qualitative', 'Non-Reactive', 'Voluntary counseling and testing rapid diagnostic test'),
    ('Blood Grouping & Crossmatch', 'Hematology', 'Qualitative', 'ABO / Rh(D)', 'ABO and Rhesus blood grouping with donor crossmatch compatibility'),
    ('Widal Test (Typhoid Serology)', 'Microbiology', 'Titer', '< 1:80', 'Serological agglutination screen for Salmonella enterica antibodies'),
    ('Stool Routine Examination & Microscopy', 'Parasitology', 'Qualitative', 'No ova or parasites', 'Direct wet mount examination for ova, cysts, and trophozoites'),
    ('Helicobacter Pylori Stool Antigen', 'Microbiology', 'Qualitative', 'Negative', 'Rapid chromatographic immunoassay for H. pylori detection'),
    ('Serum Uric Acid', 'Biochemistry', 'umol/L', '200 - 430', 'Evaluation for gout and hyperuricemia metabolic disorders'),
    ('Pregnancy Test (Urine hCG)', 'Urinalysis', 'Qualitative', 'Negative', 'Human chorionic gonadotropin qualitative screen for early pregnancy')
ON CONFLICT DO NOTHING;

