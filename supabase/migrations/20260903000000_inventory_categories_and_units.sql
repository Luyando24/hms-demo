-- Migration: Inventory Categories and Units Management
-- Creates normalized category and unit tables with foreign key relationship and seeds all common medical categories/units

-- 1. Create inventory_categories table
CREATE TABLE IF NOT EXISTS public.inventory_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create inventory_units table
CREATE TABLE IF NOT EXISTS public.inventory_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES public.inventory_categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    abbreviation TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_category_unit_name UNIQUE (category_id, name)
);

-- 3. Indexes for fast category lookups and unit joining
CREATE INDEX IF NOT EXISTS idx_inventory_units_category_id ON public.inventory_units(category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_categories_name ON public.inventory_categories(name);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_units ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
-- Read access: All authenticated staff
DROP POLICY IF EXISTS inventory_categories_staff_read ON public.inventory_categories;
CREATE POLICY inventory_categories_staff_read
ON public.inventory_categories FOR SELECT TO authenticated
USING (private.is_staff());

DROP POLICY IF EXISTS inventory_units_staff_read ON public.inventory_units;
CREATE POLICY inventory_units_staff_read
ON public.inventory_units FOR SELECT TO authenticated
USING (private.is_staff());

-- Write access: Admin and Pharmacist roles
DROP POLICY IF EXISTS inventory_categories_pharmacy_write ON public.inventory_categories;
CREATE POLICY inventory_categories_pharmacy_write
ON public.inventory_categories FOR ALL TO authenticated
USING (private.has_role(ARRAY['ADMIN', 'PHARMACIST']))
WITH CHECK (private.has_role(ARRAY['ADMIN', 'PHARMACIST']));

DROP POLICY IF EXISTS inventory_units_pharmacy_write ON public.inventory_units;
CREATE POLICY inventory_units_pharmacy_write
ON public.inventory_units FOR ALL TO authenticated
USING (private.has_role(ARRAY['ADMIN', 'PHARMACIST']))
WITH CHECK (private.has_role(ARRAY['ADMIN', 'PHARMACIST']));

-- 6. Trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION public.set_inventory_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_inventory_categories_updated_at ON public.inventory_categories;
CREATE TRIGGER trg_inventory_categories_updated_at
BEFORE UPDATE ON public.inventory_categories
FOR EACH ROW EXECUTE FUNCTION public.set_inventory_timestamp();

DROP TRIGGER IF EXISTS trg_inventory_units_updated_at ON public.inventory_units;
CREATE TRIGGER trg_inventory_units_updated_at
BEFORE UPDATE ON public.inventory_units
FOR EACH ROW EXECUTE FUNCTION public.set_inventory_timestamp();

-- 7. Seed Common Medical & Hospital Categories and Units
DO $$
DECLARE
    v_cat_med_id UUID;
    v_cat_iv_id UUID;
    v_cat_consumables_id UUID;
    v_cat_lab_id UUID;
    v_cat_dressings_id UUID;
    v_cat_ppe_id UUID;
    v_cat_radiology_id UUID;
    v_cat_blood_id UUID;
    v_cat_sanitation_id UUID;
    v_cat_devices_id UUID;
BEGIN
    -- 1. Medication / Pharmaceuticals
    INSERT INTO public.inventory_categories (name, description)
    VALUES ('Medication', 'Oral, parenteral, topical, and inhalable pharmaceutical drugs and medications')
    ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
    RETURNING id INTO v_cat_med_id;

    -- 2. IV Fluids & Injectables
    INSERT INTO public.inventory_categories (name, description)
    VALUES ('IV Fluid', 'Intravenous infusion solutions, electrolytes, and liquid injectables')
    ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
    RETURNING id INTO v_cat_iv_id;

    -- 3. Medical & Surgical Consumables
    INSERT INTO public.inventory_categories (name, description)
    VALUES ('Consumable', 'Single-use clinical and surgical items like syringes, needles, catheters, and cannulas')
    ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
    RETURNING id INTO v_cat_consumables_id;

    -- 4. Laboratory Reagents & Supplies
    INSERT INTO public.inventory_categories (name, description)
    VALUES ('Lab Test', 'Diagnostic test kits, chemical reagents, vacutainers, and specimen containers')
    ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
    RETURNING id INTO v_cat_lab_id;

    -- 5. Dressings & Wound Care
    INSERT INTO public.inventory_categories (name, description)
    VALUES ('Dressings & Wound Care', 'Bandages, gauze pads, sterile dressings, surgical tapes, and wound treatments')
    ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
    RETURNING id INTO v_cat_dressings_id;

    -- 6. PPE & Infection Control
    INSERT INTO public.inventory_categories (name, description)
    VALUES ('PPE', 'Personal protective equipment including gloves, masks, gowns, and face shields')
    ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
    RETURNING id INTO v_cat_ppe_id;

    -- 7. Radiology & Imaging Supplies
    INSERT INTO public.inventory_categories (name, description)
    VALUES ('Radiology', 'X-Ray films, ultrasound transmission gels, contrast media, and imaging accessories')
    ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
    RETURNING id INTO v_cat_radiology_id;

    -- 8. Blood Bank & Transfusion Supplies
    INSERT INTO public.inventory_categories (name, description)
    VALUES ('Blood Bank Supplies', 'Blood collection bags, blood grouping reagents, and transfusion administration sets')
    ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
    RETURNING id INTO v_cat_blood_id;

    -- 9. Sanitation & Disinfection
    INSERT INTO public.inventory_categories (name, description)
    VALUES ('Sanitation & Disinfection', 'Hospital-grade antiseptics, surface disinfectants, hand rubs, and biohazard bags')
    ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
    RETURNING id INTO v_cat_sanitation_id;

    -- 10. Medical Devices & Equipment Spares
    INSERT INTO public.inventory_categories (name, description)
    VALUES ('Medical Devices & Spares', 'Sensors, cuffs, probes, oxygen masks, nebulizers, and medical equipment accessories')
    ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
    RETURNING id INTO v_cat_devices_id;

    -- Units for Medication
    INSERT INTO public.inventory_units (category_id, name, abbreviation) VALUES
        (v_cat_med_id, 'Tablet', 'tab'),
        (v_cat_med_id, 'Capsule', 'cap'),
        (v_cat_med_id, 'Syrup (Bottle)', 'btl'),
        (v_cat_med_id, 'Suspension (Bottle)', 'btl'),
        (v_cat_med_id, 'Ampoule', 'amp'),
        (v_cat_med_id, 'Vial', 'vial'),
        (v_cat_med_id, 'Tube / Ointment', 'tube'),
        (v_cat_med_id, 'Suppository', 'supp'),
        (v_cat_med_id, 'Sachet', 'sachet'),
        (v_cat_med_id, 'Eye/Ear Drops (Bottle)', 'drp'),
        (v_cat_med_id, 'Inhaler', 'inh'),
        (v_cat_med_id, 'Transdermal Patch', 'patch')
    ON CONFLICT (category_id, name) DO NOTHING;

    -- Units for IV Fluids
    INSERT INTO public.inventory_units (category_id, name, abbreviation) VALUES
        (v_cat_iv_id, 'Infusion Bag 500ml', 'bag'),
        (v_cat_iv_id, 'Infusion Bag 1000ml', 'bag'),
        (v_cat_iv_id, 'Bottle 100ml', 'btl'),
        (v_cat_iv_id, 'Bottle 250ml', 'btl'),
        (v_cat_iv_id, 'Bottle 500ml', 'btl'),
        (v_cat_iv_id, 'Vial 10ml', 'vial'),
        (v_cat_iv_id, 'Ampoule 2ml', 'amp'),
        (v_cat_iv_id, 'Ampoule 5ml', 'amp'),
        (v_cat_iv_id, 'Infusion Giving Set', 'set'),
        (v_cat_iv_id, 'Blood Giving Set', 'set')
    ON CONFLICT (category_id, name) DO NOTHING;

    -- Units for Consumables
    INSERT INTO public.inventory_units (category_id, name, abbreviation) VALUES
        (v_cat_consumables_id, 'Piece', 'pc'),
        (v_cat_consumables_id, 'Pack', 'pkg'),
        (v_cat_consumables_id, 'Box', 'box'),
        (v_cat_consumables_id, 'Syringe 2ml', 'pc'),
        (v_cat_consumables_id, 'Syringe 5ml', 'pc'),
        (v_cat_consumables_id, 'Syringe 10ml', 'pc'),
        (v_cat_consumables_id, 'IV Cannula 18G', 'pc'),
        (v_cat_consumables_id, 'IV Cannula 20G', 'pc'),
        (v_cat_consumables_id, 'IV Cannula 22G', 'pc'),
        (v_cat_consumables_id, 'Foley Catheter', 'pc'),
        (v_cat_consumables_id, 'Surgical Blade', 'pc'),
        (v_cat_consumables_id, 'Suture Pack', 'pack'),
        (v_cat_consumables_id, 'Gauze Swab Pack', 'pack'),
        (v_cat_consumables_id, 'Urine Bag', 'pc')
    ON CONFLICT (category_id, name) DO NOTHING;

    -- Units for Lab Test
    INSERT INTO public.inventory_units (category_id, name, abbreviation) VALUES
        (v_cat_lab_id, 'Test Kit (25 tests)', 'kit'),
        (v_cat_lab_id, 'Test Kit (50 tests)', 'kit'),
        (v_cat_lab_id, 'Rapid Test Cassette', 'cass'),
        (v_cat_lab_id, 'Reagent Bottle (500ml)', 'btl'),
        (v_cat_lab_id, 'Reagent Bottle (1000ml)', 'btl'),
        (v_cat_lab_id, 'Vacutainer Tube (EDTA)', 'tube'),
        (v_cat_lab_id, 'Vacutainer Tube (Serum)', 'tube'),
        (v_cat_lab_id, 'Specimen Container', 'pc'),
        (v_cat_lab_id, 'Test Strip (Box)', 'box'),
        (v_cat_lab_id, 'Microscope Slide (Box)', 'box')
    ON CONFLICT (category_id, name) DO NOTHING;

    -- Units for Dressings & Wound Care
    INSERT INTO public.inventory_units (category_id, name, abbreviation) VALUES
        (v_cat_dressings_id, 'Crepe Bandage (Roll)', 'roll'),
        (v_cat_dressings_id, 'Gauze Bandage (Roll)', 'roll'),
        (v_cat_dressings_id, 'Adhesive Plaster (Roll)', 'roll'),
        (v_cat_dressings_id, 'Cotton Wool 500g (Roll)', 'roll'),
        (v_cat_dressings_id, 'Sterile Dressing Pad', 'pad'),
        (v_cat_dressings_id, 'Hydrogel Dressing', 'pc'),
        (v_cat_dressings_id, 'Micropore Tape (Roll)', 'roll')
    ON CONFLICT (category_id, name) DO NOTHING;

    -- Units for PPE
    INSERT INTO public.inventory_units (category_id, name, abbreviation) VALUES
        (v_cat_ppe_id, 'Examination Gloves (Box/100)', 'box'),
        (v_cat_ppe_id, 'Surgical Gloves Sterile (Pair)', 'pair'),
        (v_cat_ppe_id, 'N95 Respirator Mask (Box/20)', 'box'),
        (v_cat_ppe_id, '3-Ply Surgical Mask (Box/50)', 'box'),
        (v_cat_ppe_id, 'Disposable Isolation Gown', 'pc'),
        (v_cat_ppe_id, 'Protective Face Shield', 'pc'),
        (v_cat_ppe_id, 'Shoe Covers (Box/100)', 'box'),
        (v_cat_ppe_id, 'Surgical Cap (Pack/100)', 'pack')
    ON CONFLICT (category_id, name) DO NOTHING;

    -- Units for Radiology
    INSERT INTO public.inventory_units (category_id, name, abbreviation) VALUES
        (v_cat_radiology_id, 'X-Ray Film (Sheet)', 'sheet'),
        (v_cat_radiology_id, 'Ultrasound Gel (5L Container)', 'can'),
        (v_cat_radiology_id, 'Ultrasound Gel (250ml Bottle)', 'btl'),
        (v_cat_radiology_id, 'Contrast Media 50ml (Vial)', 'vial'),
        (v_cat_radiology_id, 'Contrast Media 100ml (Vial)', 'vial'),
        (v_cat_radiology_id, 'Developer Solution (5L)', 'can'),
        (v_cat_radiology_id, 'Fixer Solution (5L)', 'can')
    ON CONFLICT (category_id, name) DO NOTHING;

    -- Units for Blood Bank Supplies
    INSERT INTO public.inventory_units (category_id, name, abbreviation) VALUES
        (v_cat_blood_id, 'Blood Bag Single 450ml', 'bag'),
        (v_cat_blood_id, 'Blood Bag Double 450ml', 'bag'),
        (v_cat_blood_id, 'Blood Bag Triple 450ml', 'bag'),
        (v_cat_blood_id, 'Anti-A Blood Grouping Reagent (10ml)', 'vial'),
        (v_cat_blood_id, 'Anti-B Blood Grouping Reagent (10ml)', 'vial'),
        (v_cat_blood_id, 'Anti-D (Rh) Reagent (10ml)', 'vial'),
        (v_cat_blood_id, 'Blood Transfusion Filter Set', 'set')
    ON CONFLICT (category_id, name) DO NOTHING;

    -- Units for Sanitation & Disinfection
    INSERT INTO public.inventory_units (category_id, name, abbreviation) VALUES
        (v_cat_sanitation_id, 'Povidone Iodine 10% (500ml)', 'btl'),
        (v_cat_sanitation_id, 'Chlorhexidine 4% (500ml)', 'btl'),
        (v_cat_sanitation_id, 'Hand Sanitizer Gel (500ml)', 'btl'),
        (v_cat_sanitation_id, 'Surface Disinfectant 5L', 'can'),
        (v_cat_sanitation_id, 'Bleach Solution 5% (1L)', 'btl'),
        (v_cat_sanitation_id, 'Biohazard Yellow Bags (Pack/50)', 'pack'),
        (v_cat_sanitation_id, 'Autoclave Indicator Tape (Roll)', 'roll')
    ON CONFLICT (category_id, name) DO NOTHING;

    -- Units for Medical Devices & Spares
    INSERT INTO public.inventory_units (category_id, name, abbreviation) VALUES
        (v_cat_devices_id, 'Unit', 'unit'),
        (v_cat_devices_id, 'Set', 'set'),
        (v_cat_devices_id, 'Adult BP Cuff', 'unit'),
        (v_cat_devices_id, 'Paediatric BP Cuff', 'unit'),
        (v_cat_devices_id, 'SpO2 Sensor Cable (Reusable)', 'unit'),
        (v_cat_devices_id, 'ECG Electrodes (Pack/50)', 'pack'),
        (v_cat_devices_id, 'Adult Oxygen Mask with Tubing', 'pc'),
        (v_cat_devices_id, 'Paediatric Oxygen Mask with Tubing', 'pc'),
        (v_cat_devices_id, 'Nebulizer Kit with Mask', 'kit'),
        (v_cat_devices_id, 'Suction Catheter Tubing', 'pc'),
        (v_cat_devices_id, 'Digital Thermometer Probe Covers (Box/200)', 'box')
    ON CONFLICT (category_id, name) DO NOTHING;

END $$;
