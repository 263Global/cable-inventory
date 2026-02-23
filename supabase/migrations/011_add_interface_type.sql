-- Add interface_type to inventory_resources
ALTER TABLE inventory_resources ADD COLUMN IF NOT EXISTS interface_type TEXT;
