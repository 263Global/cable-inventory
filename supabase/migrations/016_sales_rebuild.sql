-- Phase 3: Sales Module — Rebuild sales tables + Circuit fixes
-- Run in Supabase SQL Editor

-- =============================================
-- 1. DROP OLD TABLES (already emptied)
-- =============================================
DROP TABLE IF EXISTS sales_order_batches CASCADE;
DROP TABLE IF EXISTS sales_orders CASCADE;

-- =============================================
-- 2. SALES ORDERS
-- =============================================
CREATE TABLE sales_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id VARCHAR(20) NOT NULL UNIQUE,
  internal_ref VARCHAR(100),
  customer_id UUID REFERENCES customers(id),
  status VARCHAR(20) NOT NULL DEFAULT 'Draft'
    CHECK (status IN ('Draft','Pre-sold','Active','Expired','Terminated','Cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid()
);

-- RLS
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all sales_orders" ON sales_orders FOR SELECT USING (true);
CREATE POLICY "Users can insert sales_orders" ON sales_orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update sales_orders" ON sales_orders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete sales_orders" ON sales_orders FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_sales_orders_customer ON sales_orders(customer_id);
CREATE INDEX idx_sales_orders_status ON sales_orders(status);

-- =============================================
-- 3. SALES ORDER ITEMS
-- =============================================
CREATE TABLE sales_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL DEFAULT 'Capacity'
    CHECK (type IN ('Capacity','Backhaul','Local Access','Cross-Connect','NRC','Other')),
  inventory_resource_id UUID REFERENCES inventory_resources(id),
  description TEXT,
  disposal_type VARCHAR(20)
    CHECK (disposal_type IN ('IRU Out','Lease Out','Swap Out')),
  capacity NUMERIC,
  spec VARCHAR(50),
  start_date DATE,
  end_date DATE,
  term_months INTEGER,
  -- Revenue fields (sell price)
  sell_otc NUMERIC,
  sell_mrc NUMERIC,
  sell_nrc NUMERIC,
  sell_om_rate NUMERIC,
  sell_annual_om NUMERIC,
  -- Item-level status (can differ from order)
  status VARCHAR(20) DEFAULT 'Draft'
    CHECK (status IN ('Draft','Pre-sold','Active','Expired','Terminated','Cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS
ALTER TABLE sales_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all items" ON sales_order_items FOR SELECT USING (true);
CREATE POLICY "Users can insert items" ON sales_order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update items" ON sales_order_items FOR UPDATE USING (true);
CREATE POLICY "Users can delete items" ON sales_order_items FOR DELETE USING (true);

-- Indexes
CREATE INDEX idx_soi_order ON sales_order_items(sales_order_id);
CREATE INDEX idx_soi_inventory ON sales_order_items(inventory_resource_id);

-- =============================================
-- 4. CIRCUIT → BATCH ASSOCIATION
-- =============================================
ALTER TABLE inventory_circuits
  ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES inventory_batches(id);

-- Allow 'Planned' status on circuits
ALTER TABLE inventory_circuits
  DROP CONSTRAINT IF EXISTS inventory_circuits_status_check;
ALTER TABLE inventory_circuits
  ADD CONSTRAINT inventory_circuits_status_check
  CHECK (status IN ('Available','Allocated','Reserved','Planned'));

-- =============================================
-- 5. AUTO-INCREMENT HELPER for SO-XXXXX
-- =============================================
CREATE SEQUENCE IF NOT EXISTS sales_order_seq START 1;
