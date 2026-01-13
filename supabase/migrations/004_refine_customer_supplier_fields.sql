-- Refinement: Add additional columns to customers and suppliers
-- Run this in Supabase SQL Editor after 003_customers_suppliers.sql

-- =============================================
-- CUSTOMERS: Add new columns
-- =============================================
ALTER TABLE customers ADD COLUMN IF NOT EXISTS company_type VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS website VARCHAR(200);

-- =============================================
-- SUPPLIERS: Add new columns (split contact_info)
-- =============================================
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS contact_name VARCHAR(100);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS contact_email VARCHAR(200);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS portal_url VARCHAR(200);

-- Note: The existing contact_info column is kept for backward compatibility
-- but new entries will use the split fields
