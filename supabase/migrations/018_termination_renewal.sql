-- Add termination and renewal fields to sales_orders and inventory_resources
-- Run in Supabase SQL Editor

-- Sales orders
ALTER TABLE sales_orders
  ADD COLUMN IF NOT EXISTS terminated_at DATE,
  ADD COLUMN IF NOT EXISTS termination_reason TEXT,
  ADD COLUMN IF NOT EXISTS renewal_history JSONB DEFAULT '[]';

-- Inventory resources
ALTER TABLE inventory_resources
  ADD COLUMN IF NOT EXISTS terminated_at DATE,
  ADD COLUMN IF NOT EXISTS termination_reason TEXT,
  ADD COLUMN IF NOT EXISTS renewal_history JSONB DEFAULT '[]';

COMMENT ON COLUMN sales_orders.terminated_at IS 'Date the order was terminated or cancelled';
COMMENT ON COLUMN sales_orders.termination_reason IS 'Reason for termination or cancellation';
COMMENT ON COLUMN sales_orders.renewal_history IS 'Array of renewal snapshots [{renewedAt, oldStart, oldEnd, oldMrc, ...}]';
COMMENT ON COLUMN inventory_resources.terminated_at IS 'Date the resource was terminated';
COMMENT ON COLUMN inventory_resources.termination_reason IS 'Reason for termination';
COMMENT ON COLUMN inventory_resources.renewal_history IS 'Array of renewal snapshots [{renewedAt, oldStart, oldEnd, oldMrc, ...}]';
