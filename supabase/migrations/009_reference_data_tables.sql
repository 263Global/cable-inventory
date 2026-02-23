-- ============================================
-- Reference Data Tables for Cable Inventory Manager
-- ============================================

-- Cable Systems (pre-populated from TeleGeography)
CREATE TABLE IF NOT EXISTS cable_systems (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  rfs_year INTEGER,
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Planned', 'Retired')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Landing Stations (linked to Cable Systems)
CREATE TABLE IF NOT EXISTS landing_stations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT,
  cable_system_id UUID REFERENCES cable_systems(id) ON DELETE SET NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Countries (pre-populated with ~50 telecom countries)
CREATE TABLE IF NOT EXISTS countries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE, -- ISO 3166-1 alpha-2
  region TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Handover Locations (PoPs, data centers, exchanges)
CREATE TABLE IF NOT EXISTS handover_locations (
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_landing_stations_cable ON landing_stations(cable_system_id);
CREATE INDEX IF NOT EXISTS idx_landing_stations_country ON landing_stations(country);
CREATE INDEX IF NOT EXISTS idx_handover_locations_country ON handover_locations(country);

-- RLS Policies (enable for authenticated users)
ALTER TABLE cable_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE handover_locations ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access
CREATE POLICY "Authenticated users can read cable_systems"
  ON cable_systems FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert cable_systems"
  ON cable_systems FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update cable_systems"
  ON cable_systems FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete cable_systems"
  ON cable_systems FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read landing_stations"
  ON landing_stations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert landing_stations"
  ON landing_stations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update landing_stations"
  ON landing_stations FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete landing_stations"
  ON landing_stations FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read countries"
  ON countries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert countries"
  ON countries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update countries"
  ON countries FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete countries"
  ON countries FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read handover_locations"
  ON handover_locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert handover_locations"
  ON handover_locations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update handover_locations"
  ON handover_locations FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete handover_locations"
  ON handover_locations FOR DELETE TO authenticated USING (true);
