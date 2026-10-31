-- Migration: Separate Inventory Types (Medical Stock vs Capital Items)
-- Distinct data model, categories, and attributes for durable assets vs consumables.

-- 1. Enhance inventory_items with medical-specific fields and explicit inventory_type discriminator
ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS inventory_type TEXT NOT NULL DEFAULT 'MEDICAL',
  ADD COLUMN IF NOT EXISTS batch_number TEXT,
  ADD COLUMN IF NOT EXISTS expiry_date DATE,
  ADD COLUMN IF NOT EXISTS manufacturer TEXT,
  ADD COLUMN IF NOT EXISTS dosage_form TEXT,
  ADD COLUMN IF NOT EXISTS strength TEXT,
  ADD COLUMN IF NOT EXISTS storage_condition TEXT;

-- Enforce inventory_type constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_inventory_items_type'
  ) THEN
    ALTER TABLE public.inventory_items
      ADD CONSTRAINT chk_inventory_items_type CHECK (inventory_type IN ('MEDICAL', 'CAPITAL'));
  END IF;
END $$;

-- 2. Create capital_item_categories table for durable equipment categorization
CREATE TABLE IF NOT EXISTS public.capital_item_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on capital_item_categories
ALTER TABLE public.capital_item_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS capital_item_categories_staff_read ON public.capital_item_categories;
CREATE POLICY capital_item_categories_staff_read
ON public.capital_item_categories FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS capital_item_categories_admin_write ON public.capital_item_categories;
CREATE POLICY capital_item_categories_admin_write
ON public.capital_item_categories FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('ADMIN', 'SUPER_USER')
    )
);

-- Seed initial capital item categories if empty
INSERT INTO public.capital_item_categories (name, description) VALUES
('IT & Computers', 'Desktops, laptops, tablets, server hardware, and network switches'),
('Office Equipment & Machinery', 'Printers, copiers, scanners, shredders, and office peripherals'),
('Furniture & Fixtures', 'Office chairs, consultation desks, examination couches, and ward beds'),
('Medical Devices & Machinery', 'Autoclaves, centrifuges, vital signs monitors, infusion pumps, and ultrasound'),
('Audio/Visual & Displays', 'Smart TVs, waiting room display panels, public address systems'),
('Facility & Power Equipment', 'Standby generators, inverter power systems, air conditioning units')
ON CONFLICT (name) DO NOTHING;

-- 3. Enhance clinic_assets (Capital Items) with asset tagging, warranty, and department assignment
ALTER TABLE public.clinic_assets
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS assigned_to TEXT,
  ADD COLUMN IF NOT EXISTS warranty_expiry DATE,
  ADD COLUMN IF NOT EXISTS asset_tag TEXT;

-- 4. Create capital_items view for seamless interoperability
CREATE OR REPLACE VIEW public.capital_items AS
  SELECT * FROM public.clinic_assets;

GRANT SELECT ON public.capital_items TO authenticated;

