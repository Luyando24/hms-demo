-- Seed core departments
INSERT INTO public.departments (name, description) VALUES
('Reception', 'Front desk and patient registration'),
('OPD', 'Outpatient Department / General Consultations'),
('Laboratory', 'Diagnostic testing and pathology'),
('Pharmacy', 'Medication dispensing and inventory'),
('Billing', 'Accounts and payments'),
('ER', 'Emergency Room / Trauma'),
('IPD', 'Inpatient Department / Wards'),
('Radiology', 'X-Ray, CT, and Ultrasound services')
ON CONFLICT (name) DO NOTHING;

-- Seed inventory items (Medications)
INSERT INTO public.inventory_items (name, category, unit, stock_level, reorder_level) VALUES
('Paracetamol 500mg', 'Medication', 'Tablet', 5000, 500),
('Amoxicillin 250mg', 'Medication', 'Capsule', 2000, 200),
('Metformin 500mg', 'Medication', 'Tablet', 3000, 300),
('Ibuprofen 400mg', 'Medication', 'Tablet', 4000, 400),
('Ceftriaxone 1g', 'Medication', 'Vial', 100, 20),
('Normal Saline 500ml', 'IV Fluid', 'Bottle', 200, 50)
ON CONFLICT DO NOTHING;

-- Seed inventory items (Lab Tests as items for billing)
INSERT INTO public.inventory_items (name, category, unit, stock_level, reorder_level) VALUES
('Full Blood Count (FBC)', 'Lab Test', 'Service', 9999, 0),
('Malaria Rapid Test', 'Lab Test', 'Service', 9999, 0),
('Urinalysis', 'Lab Test', 'Service', 9999, 0),
('Blood Glucose (Random)', 'Lab Test', 'Service', 9999, 0),
('HIV Rapid Test', 'Lab Test', 'Service', 9999, 0)
ON CONFLICT DO NOTHING;
