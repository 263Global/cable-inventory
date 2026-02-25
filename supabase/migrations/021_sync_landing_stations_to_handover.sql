-- Add 'Landing Station' to the handover_locations type check constraint
-- (Landing stations are now fetched via code-layer UNION from landing_stations table,
--  but we need this type allowed for any manually created handover entries)
ALTER TABLE handover_locations DROP CONSTRAINT IF EXISTS handover_locations_type_check;
ALTER TABLE handover_locations ADD CONSTRAINT handover_locations_type_check
    CHECK (type IN ('PoP', 'Data Center', 'Exchange', 'Landing Station', 'Other'));

-- Clean up any previously synced landing station rows (from earlier migration attempt)
DELETE FROM handover_locations WHERE type = 'Landing Station';
