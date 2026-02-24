-- Per-item termination support
-- Adds terminated_at and termination_fee to sales_order_items

ALTER TABLE sales_order_items
  ADD COLUMN IF NOT EXISTS terminated_at DATE,
  ADD COLUMN IF NOT EXISTS termination_fee NUMERIC(14,2) DEFAULT 0;
