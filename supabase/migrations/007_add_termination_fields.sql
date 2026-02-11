-- Add early termination fields to sales_orders table
ALTER TABLE sales_orders
ADD COLUMN IF NOT EXISTS terminated_at DATE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS termination_reason TEXT DEFAULT NULL;

COMMENT ON COLUMN sales_orders.terminated_at IS 'Date the order was terminated early; NULL if not terminated';
COMMENT ON COLUMN sales_orders.termination_reason IS 'Optional reason for early termination';
