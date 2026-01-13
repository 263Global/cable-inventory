-- Customer & Supplier Management Tables
-- Run this in Supabase SQL Editor

-- =============================================
-- CUSTOMERS TABLE
-- =============================================
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_name VARCHAR(50) NOT NULL,
  full_name VARCHAR(200),
  contact_name VARCHAR(100),
  contact_email VARCHAR(200),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid()
);

-- RLS for customers
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all customers"
  ON customers FOR SELECT
  USING (true);

CREATE POLICY "Users can insert customers"
  ON customers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update customers"
  ON customers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete customers"
  ON customers FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- SUPPLIERS TABLE
-- =============================================
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_name VARCHAR(50) NOT NULL,
  full_name VARCHAR(200),
  service_type VARCHAR(50),
  contact_info TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid()
);

-- RLS for suppliers
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all suppliers"
  ON suppliers FOR SELECT
  USING (true);

CREATE POLICY "Users can insert suppliers"
  ON suppliers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update suppliers"
  ON suppliers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete suppliers"
  ON suppliers FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- INDEXES for performance
-- =============================================
CREATE INDEX idx_customers_short_name ON customers(short_name);
CREATE INDEX idx_suppliers_short_name ON suppliers(short_name);
CREATE INDEX idx_suppliers_service_type ON suppliers(service_type);
