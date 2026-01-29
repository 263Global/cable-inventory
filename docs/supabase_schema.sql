-- =====================================================
-- Cable Manager - Supabase Schema (Full, Fresh Install)
-- Run this SQL in Supabase Dashboard > SQL Editor
-- =====================================================

-- Required for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- CUSTOMERS TABLE
-- =============================================
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    short_name VARCHAR(50) NOT NULL,
    full_name VARCHAR(200),
    company_type VARCHAR(50),
    contact_name VARCHAR(100),
    contact_email VARCHAR(200),
    contact_phone VARCHAR(50),
    website VARCHAR(200),
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
    contact_name VARCHAR(100),
    contact_email VARCHAR(200),
    contact_phone VARCHAR(50),
    portal_url VARCHAR(200),
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
-- INVENTORY TABLE
-- =============================================
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'Available',
    cable_system VARCHAR(200),
    segment_type VARCHAR(50),
    protection VARCHAR(20),
    protection_cable_system VARCHAR(200),
    handoff_type VARCHAR(100),
    route_description TEXT,

    -- Acquisition
    acquisition_type VARCHAR(50),
    ownership VARCHAR(20),
    supplier VARCHAR(200),
    supplier_id UUID REFERENCES suppliers(id),
    contract_ref VARCHAR(200),

    -- Capacity
    capacity_value DECIMAL(10, 2),
    capacity_unit VARCHAR(50),

    -- Location A-End
    a_end_country VARCHAR(100),
    a_end_city VARCHAR(100),
    a_end_pop VARCHAR(200),
    a_end_device VARCHAR(200),
    a_end_port VARCHAR(200),

    -- Location Z-End
    z_end_country VARCHAR(100),
    z_end_city VARCHAR(100),
    z_end_pop VARCHAR(200),
    z_end_device VARCHAR(200),
    z_end_port VARCHAR(200),

    -- Financials
    mrc DECIMAL(12, 2),
    nrc DECIMAL(12, 2),
    otc DECIMAL(12, 2),
    om_rate DECIMAL(5, 2),
    annual_om_cost DECIMAL(12, 2),
    term_months INTEGER,

    -- Cost Mode (single vs batches)
    cost_mode VARCHAR(20) DEFAULT 'single',
    base_order_id VARCHAR(50),
    base_model VARCHAR(20),
    base_mrc DECIMAL(12, 2),
    base_otc DECIMAL(12, 2),
    base_om_rate DECIMAL(5, 2),
    base_annual_om DECIMAL(12, 2),
    base_term_months INTEGER,

    -- Dates
    start_date DATE,
    end_date DATE,

    -- Usage
    current_user_name VARCHAR(200),
    order_link VARCHAR(50),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INVENTORY BATCHES (STAGED LIGHTING)
-- =============================================
CREATE TABLE inventory_batches (
    batch_id VARCHAR(50) PRIMARY KEY,
    resource_id VARCHAR(50) REFERENCES inventory(resource_id) ON DELETE CASCADE,
    order_id VARCHAR(50),
    model VARCHAR(20),
    capacity_value DECIMAL(10, 2),
    capacity_unit VARCHAR(50),
    mrc DECIMAL(12, 2),
    otc DECIMAL(12, 2),
    om_rate DECIMAL(5, 2),
    annual_om DECIMAL(12, 2),
    term_months INTEGER,
    start_date DATE,
    status VARCHAR(20) DEFAULT 'Planned'
);

CREATE INDEX idx_inventory_batches_resource ON inventory_batches(resource_id);

-- =============================================
-- SALES ORDERS TABLE
-- =============================================
CREATE TABLE sales_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sales_order_id VARCHAR(50) UNIQUE NOT NULL,
    inventory_link VARCHAR(50),
    status VARCHAR(20) DEFAULT 'Pending',
    customer_name VARCHAR(200) NOT NULL,
    customer_id UUID REFERENCES customers(id),
    salesperson VARCHAR(100),
    sales_model VARCHAR(20),
    sales_type VARCHAR(50),

    -- Capacity
    capacity_value DECIMAL(10, 2),
    capacity_unit VARCHAR(50),

    -- Dates
    start_date DATE,
    end_date DATE,
    term_months INTEGER,

    -- Location A-End
    a_end_city VARCHAR(100),
    a_end_pop VARCHAR(200),

    -- Location Z-End
    z_end_city VARCHAR(100),
    z_end_pop VARCHAR(200),

    -- Revenue/Financials
    mrc_sales DECIMAL(12, 2),
    nrc_sales DECIMAL(12, 2),
    otc DECIMAL(12, 2),
    om_rate DECIMAL(5, 2),
    annual_om DECIMAL(12, 2),
    total_mrr DECIMAL(12, 2),

    -- Costs stored as JSON for flexibility
    costs JSONB DEFAULT '{}'::jsonb,

    -- Notes
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- SALES ORDER BATCH ALLOCATIONS
-- =============================================
CREATE TABLE sales_order_batches (
    sales_order_id VARCHAR(50) REFERENCES sales_orders(sales_order_id) ON DELETE CASCADE,
    batch_id VARCHAR(50) REFERENCES inventory_batches(batch_id) ON DELETE CASCADE,
    capacity_allocated DECIMAL(10, 2),
    PRIMARY KEY (sales_order_id, batch_id)
);

CREATE INDEX idx_sales_order_batches_order ON sales_order_batches(sales_order_id);
CREATE INDEX idx_sales_order_batches_batch ON sales_order_batches(batch_id);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_customers_short_name ON customers(short_name);
CREATE INDEX idx_suppliers_short_name ON suppliers(short_name);
CREATE INDEX idx_suppliers_service_type ON suppliers(service_type);

-- =============================================
-- AUTO-UPDATE updated_at
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_inventory_updated_at
    BEFORE UPDATE ON inventory
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_orders_updated_at
    BEFORE UPDATE ON sales_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access for authenticated users" ON inventory
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow full access for authenticated users" ON sales_orders
    FOR ALL USING (auth.role() = 'authenticated');
