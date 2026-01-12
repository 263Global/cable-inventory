-- =====================================================
-- Cable Manager - Supabase Schema
-- Run this SQL in Supabase Dashboard > SQL Editor
-- =====================================================

-- 1. Create inventory table
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'Available',
    cable_system VARCHAR(200),
    segment_type VARCHAR(50),
    protection VARCHAR(20),
    
    -- Acquisition
    acquisition_type VARCHAR(50),
    ownership VARCHAR(20),
    supplier VARCHAR(200),
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

-- 2. Create sales_orders table
CREATE TABLE sales_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sales_order_id VARCHAR(50) UNIQUE NOT NULL,
    inventory_link VARCHAR(50),
    status VARCHAR(20) DEFAULT 'Pending',
    customer_name VARCHAR(200) NOT NULL,
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
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Auto-update timestamps trigger
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

-- 4. Enable Row Level Security
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;

-- 5. Create policies for authenticated users
CREATE POLICY "Allow full access for authenticated users" ON inventory
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow full access for authenticated users" ON sales_orders
    FOR ALL USING (auth.role() = 'authenticated');
