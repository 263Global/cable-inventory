-- Add missing inventory fields and customer linkage

-- Inventory: add fields captured in UI
ALTER TABLE inventory
  ADD COLUMN IF NOT EXISTS handoff_type VARCHAR(100),
  ADD COLUMN IF NOT EXISTS route_description TEXT,
  ADD COLUMN IF NOT EXISTS protection_cable_system VARCHAR(200),
  ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id);

-- Sales orders: link to customers
ALTER TABLE sales_orders
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);
