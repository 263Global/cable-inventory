-- Add renewal_history column to sales_orders table
-- Stores an array of snapshots capturing the full state before each renewal
ALTER TABLE sales_orders
ADD COLUMN IF NOT EXISTS renewal_history JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN sales_orders.renewal_history IS 'Array of renewal snapshots: [{renewedAt, dates, financials, costs, costChanges}]';
