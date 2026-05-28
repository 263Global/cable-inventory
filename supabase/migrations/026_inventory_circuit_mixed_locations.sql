-- Allow individual circuits to terminate at either landing stations or handover locations.
ALTER TABLE inventory_circuits
  ADD COLUMN IF NOT EXISTS landing_station_a_id UUID REFERENCES landing_stations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS landing_station_z_id UUID REFERENCES landing_stations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_circuits_landing_a ON inventory_circuits(landing_station_a_id);
CREATE INDEX IF NOT EXISTS idx_circuits_landing_z ON inventory_circuits(landing_station_z_id);
