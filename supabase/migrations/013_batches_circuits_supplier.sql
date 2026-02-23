-- ============================================
-- Add inventory_batches, circuit handovers, suppliers
-- ============================================

-- 1. Suppliers reference table
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  contact_name TEXT,
  contact_email TEXT,
  phone TEXT,
  website TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- RLS for suppliers
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_suppliers" ON suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_suppliers" ON suppliers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_suppliers" ON suppliers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_suppliers" ON suppliers FOR DELETE TO authenticated USING (true);

-- 2. Add supplier FK to inventory_resources
ALTER TABLE inventory_resources
  ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL;

-- 3. Inventory batches table (for Base+Batch mode)
CREATE TABLE inventory_batches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_resource_id UUID NOT NULL REFERENCES inventory_resources(id) ON DELETE CASCADE,
  batch_number INTEGER NOT NULL,
  capacity NUMERIC NOT NULL DEFAULT 0,
  model TEXT NOT NULL DEFAULT 'IRU' CHECK (model IN ('IRU', 'Lease')),
  start_date DATE,
  term_months INTEGER,
  -- IRU financials
  otc NUMERIC,
  om_rate NUMERIC DEFAULT 4.0,
  annual_om_cost NUMERIC,
  -- Lease financials
  mrc NUMERIC,
  status TEXT DEFAULT 'Planned' CHECK (status IN ('Planned', 'Active', 'Ended')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (inventory_resource_id, batch_number)
);

-- RLS for batches
ALTER TABLE inventory_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_batches" ON inventory_batches FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_batches" ON inventory_batches FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_batches" ON inventory_batches FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_batches" ON inventory_batches FOR DELETE TO authenticated USING (true);

-- 4. Add per-circuit handover locations
ALTER TABLE inventory_circuits
  ADD COLUMN IF NOT EXISTS handover_location_a_id UUID REFERENCES handover_locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS handover_location_z_id UUID REFERENCES handover_locations(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX idx_batches_resource ON inventory_batches(inventory_resource_id);
CREATE INDEX idx_circuits_handover_a ON inventory_circuits(handover_location_a_id);
CREATE INDEX idx_circuits_handover_z ON inventory_circuits(handover_location_z_id);
CREATE INDEX idx_inventory_supplier ON inventory_resources(supplier_id);

-- Seed popular suppliers
INSERT INTO suppliers (name) VALUES
  ('Telia Carrier'),
  ('Sparkle (TI Sparkle)'),
  ('Lumen Technologies'),
  ('Zayo Group'),
  ('GTT Communications'),
  ('PCCW Global'),
  ('Telstra International'),
  ('NTT Communications'),
  ('Orange Business'),
  ('Vodafone'),
  ('China Telecom Global'),
  ('China Mobile International'),
  ('China Unicom Global'),
  ('SingTel'),
  ('Indosat Ooredoo'),
  ('Starhub'),
  ('PLDT Enterprise'),
  ('Globe Telecom'),
  ('CAT Telecom'),
  ('SubCom'),
  ('Alcatel Submarine Networks'),
  ('NEC Corporation'),
  ('Ciena'),
  ('Huawei Marine'),
  ('Google (GCP)'),
  ('Meta (Facebook)'),
  ('Microsoft (Azure)'),
  ('Amazon (AWS)'),
  ('Equinix'),
  ('Digital Realty')
ON CONFLICT (name) DO NOTHING;
