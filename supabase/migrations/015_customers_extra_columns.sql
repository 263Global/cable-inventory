-- Add missing columns to customers table
-- The original schema had limited fields; we need phone, country, and name alias

-- Add phone column
ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

-- Add country column
ALTER TABLE customers ADD COLUMN IF NOT EXISTS country VARCHAR(100);

-- Add name column (alias for short_name, frontend uses 'name')
-- Check if 'name' column already exists before adding
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'name') THEN
    ALTER TABLE customers ADD COLUMN name VARCHAR(100);
    -- Copy existing short_name values to name
    UPDATE customers SET name = short_name WHERE name IS NULL;
  END IF;
END $$;

-- Add updated_at column for tracking edits
ALTER TABLE customers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;
