-- ============================================
-- Restructure Reference Data for Many-to-Many
-- + Add interface_types + inventory_circuits
-- ============================================

-- 1. Drop old tables (they are empty, user confirmed)
DROP TABLE IF EXISTS inventory_resources CASCADE;
DROP TABLE IF EXISTS landing_stations CASCADE;
DROP TABLE IF EXISTS cable_systems CASCADE;
DROP TABLE IF EXISTS countries CASCADE;
DROP TABLE IF EXISTS handover_locations CASCADE;

-- 2. Recreate cable_systems with slug for JSON matching
CREATE TABLE cable_systems (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE,  -- matches JSON id (e.g. "2africa")
  name TEXT NOT NULL,
  rfs_year INTEGER,
  length TEXT,
  owners TEXT,
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Planned', 'Retired')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. Recreate landing_stations with slug
CREATE TABLE landing_stations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE,  -- matches JSON id (e.g. "tuas-singapore")
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 4. Junction table: cable <-> landing station (many-to-many)
CREATE TABLE cable_landing_stations (
  cable_system_id UUID NOT NULL REFERENCES cable_systems(id) ON DELETE CASCADE,
  landing_station_id UUID NOT NULL REFERENCES landing_stations(id) ON DELETE CASCADE,
  PRIMARY KEY (cable_system_id, landing_station_id)
);

-- 5. Countries with ISO code
CREATE TABLE countries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  code TEXT UNIQUE,  -- ISO 3166-1 alpha-2 (nullable for seed)
  region TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 6. Handover locations
CREATE TABLE handover_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT,
  city TEXT,
  address TEXT,
  type TEXT DEFAULT 'PoP' CHECK (type IN ('PoP', 'Data Center', 'Exchange', 'Other')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 7. Interface types (Reference Data)
CREATE TABLE interface_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Pre-populate common interface types
INSERT INTO interface_types (name, description) VALUES
  ('OTU4', 'Optical Transport Unit 4 (~100G)'),
  ('100GE', '100 Gigabit Ethernet'),
  ('400GE', '400 Gigabit Ethernet'),
  ('OTU-CN', 'Optical Transport Unit Cn (~100G×n)'),
  ('10GE', '10 Gigabit Ethernet'),
  ('STM-64', 'Synchronous Transport Module 64 (~10G)'),
  ('OTU2', 'Optical Transport Unit 2 (~10G)'),
  ('Wavelength', 'Full wavelength / lambda');

-- 8. Inventory resources (recreate with interface_type)
CREATE TABLE inventory_resources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_id TEXT NOT NULL UNIQUE,
  internal_ref TEXT,
  type TEXT NOT NULL CHECK (type IN ('Capacity', 'Terrestrial', 'Fiber', 'Spectrum')),
  spec TEXT,
  capacity_value NUMERIC,

  cable_system_id UUID REFERENCES cable_systems(id) ON DELETE SET NULL,
  supplier_id UUID,
  supplier_name TEXT,

  acquisition_type TEXT NOT NULL DEFAULT 'IRU' CHECK (acquisition_type IN ('IRU', 'Lease', 'Swap-In', 'Owned')),
  status TEXT NOT NULL DEFAULT 'Available' CHECK (status IN ('Available', 'Partially Used', 'Fully Used', 'Expired', 'Terminated')),
  protection TEXT DEFAULT 'Unprotected' CHECK (protection IN ('Protected', 'Unprotected')),
  contract_ref TEXT,
  notes TEXT,

  -- Locations (now FK-based)
  country_a_id UUID REFERENCES countries(id) ON DELETE SET NULL,
  country_z_id UUID REFERENCES countries(id) ON DELETE SET NULL,
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

-- 9. Inventory circuits (sub-units of an inventory resource)
CREATE TABLE inventory_circuits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_resource_id UUID NOT NULL REFERENCES inventory_resources(id) ON DELETE CASCADE,
  circuit_number INTEGER NOT NULL,
  capacity NUMERIC NOT NULL,
  original_interface_type_id UUID REFERENCES interface_types(id) ON DELETE SET NULL,
  current_interface_type_id UUID REFERENCES interface_types(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'Available' CHECK (status IN ('Available', 'Allocated', 'Reserved')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (inventory_resource_id, circuit_number)
);

-- Indexes
CREATE INDEX idx_cable_systems_slug ON cable_systems(slug);
CREATE INDEX idx_landing_stations_slug ON landing_stations(slug);
CREATE INDEX idx_landing_stations_country ON landing_stations(country);
CREATE INDEX idx_cable_landing_cable ON cable_landing_stations(cable_system_id);
CREATE INDEX idx_cable_landing_station ON cable_landing_stations(landing_station_id);
CREATE INDEX idx_handover_locations_country ON handover_locations(country);
CREATE INDEX idx_inventory_type ON inventory_resources(type);
CREATE INDEX idx_inventory_status ON inventory_resources(status);
CREATE INDEX idx_inventory_cable_system ON inventory_resources(cable_system_id);
CREATE INDEX idx_circuits_inventory ON inventory_circuits(inventory_resource_id);

-- RLS for all tables
ALTER TABLE cable_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cable_landing_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE handover_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE interface_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_circuits ENABLE ROW LEVEL SECURITY;

-- RLS policies (all tables, authenticated users full access)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'cable_systems', 'landing_stations', 'cable_landing_stations',
    'countries', 'handover_locations', 'interface_types',
    'inventory_resources', 'inventory_circuits'
  ]) LOOP
    EXECUTE format('CREATE POLICY "auth_select_%s" ON %I FOR SELECT TO authenticated USING (true)', tbl, tbl);
    EXECUTE format('CREATE POLICY "auth_insert_%s" ON %I FOR INSERT TO authenticated WITH CHECK (true)', tbl, tbl);
    EXECUTE format('CREATE POLICY "auth_update_%s" ON %I FOR UPDATE TO authenticated USING (true)', tbl, tbl);
    EXECUTE format('CREATE POLICY "auth_delete_%s" ON %I FOR DELETE TO authenticated USING (true)', tbl, tbl);
  END LOOP;
END $$;
