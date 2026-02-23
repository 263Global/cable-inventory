-- ============================================
-- Inventory Resources Table
-- ============================================

CREATE TABLE IF NOT EXISTS inventory_resources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_id TEXT NOT NULL UNIQUE, -- RES-XXXXX
  internal_ref TEXT,
  type TEXT NOT NULL CHECK (type IN ('Capacity', 'Terrestrial', 'Fiber', 'Spectrum')),
  spec TEXT,
  capacity_value NUMERIC,
  
  -- References
  cable_system_id UUID REFERENCES cable_systems(id) ON DELETE SET NULL,
  supplier_id UUID,
  supplier_name TEXT,
  
  -- Core fields
  acquisition_type TEXT NOT NULL DEFAULT 'IRU' CHECK (acquisition_type IN ('IRU', 'Lease', 'Swap-In', 'Owned')),
  status TEXT NOT NULL DEFAULT 'Available' CHECK (status IN ('Available', 'Partially Used', 'Fully Used', 'Expired', 'Terminated')),
  protection TEXT DEFAULT 'Unprotected' CHECK (protection IN ('Protected', 'Unprotected')),
  contract_ref TEXT,
  notes TEXT,
  
  -- Locations
  country_a TEXT,
  country_z TEXT,
  landing_station_a_id UUID REFERENCES landing_stations(id) ON DELETE SET NULL,
  landing_station_z_id UUID REFERENCES landing_stations(id) ON DELETE SET NULL,
  handover_location_a_id UUID REFERENCES handover_locations(id) ON DELETE SET NULL,
  handover_location_z_id UUID REFERENCES handover_locations(id) ON DELETE SET NULL,
  route_description TEXT,
  
  -- Contract
  cost_mode TEXT DEFAULT 'Single' CHECK (cost_mode IN ('Single', 'Base+Batch')),
  term_months INTEGER,
  start_date DATE,
  end_date DATE,
  
  -- IRU financials
  otc NUMERIC,
  om_rate NUMERIC DEFAULT 4.0,
  annual_om_cost NUMERIC,
  
  -- Lease financials
  mrc NUMERIC,
  nrc NUMERIC,
  
  -- Capacity tracking
  total_capacity NUMERIC,
  used_capacity NUMERIC DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inventory_type ON inventory_resources(type);
CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory_resources(status);
CREATE INDEX IF NOT EXISTS idx_inventory_cable_system ON inventory_resources(cable_system_id);
CREATE INDEX IF NOT EXISTS idx_inventory_resource_id ON inventory_resources(resource_id);

-- RLS
ALTER TABLE inventory_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read inventory"
  ON inventory_resources FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert inventory"
  ON inventory_resources FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update inventory"
  ON inventory_resources FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete inventory"
  ON inventory_resources FOR DELETE TO authenticated USING (true);
