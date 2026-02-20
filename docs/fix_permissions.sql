-- =====================================================
-- Fix Permissions & RLS for Cable Manager
-- Run this in Supabase Dashboard > SQL Editor
-- =====================================================

-- =============================================
-- 1. GRANT table permissions to roles
-- =============================================
GRANT ALL ON TABLE public.customers TO authenticated;
GRANT ALL ON TABLE public.customers TO anon;
GRANT ALL ON TABLE public.suppliers TO authenticated;
GRANT ALL ON TABLE public.suppliers TO anon;
GRANT ALL ON TABLE public.inventory TO authenticated;
GRANT ALL ON TABLE public.inventory TO anon;
GRANT ALL ON TABLE public.inventory_batches TO authenticated;
GRANT ALL ON TABLE public.inventory_batches TO anon;
GRANT ALL ON TABLE public.sales_orders TO authenticated;
GRANT ALL ON TABLE public.sales_orders TO anon;
GRANT ALL ON TABLE public.sales_order_batches TO authenticated;
GRANT ALL ON TABLE public.sales_order_batches TO anon;

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- =============================================
-- 2. Ensure RLS is enabled on all tables
-- =============================================
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_order_batches ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 3. Drop existing policies (ignore errors if not exist)
-- =============================================

-- Customers policies
DROP POLICY IF EXISTS "Users can view all customers" ON customers;
DROP POLICY IF EXISTS "Users can insert customers" ON customers;
DROP POLICY IF EXISTS "Users can update customers" ON customers;
DROP POLICY IF EXISTS "Users can delete customers" ON customers;

-- Suppliers policies
DROP POLICY IF EXISTS "Users can view all suppliers" ON suppliers;
DROP POLICY IF EXISTS "Users can insert suppliers" ON suppliers;
DROP POLICY IF EXISTS "Users can update suppliers" ON suppliers;
DROP POLICY IF EXISTS "Users can delete suppliers" ON suppliers;

-- Inventory policies
DROP POLICY IF EXISTS "Allow full access for authenticated users" ON inventory;

-- Sales orders policies
DROP POLICY IF EXISTS "Allow full access for authenticated users" ON sales_orders;

-- Inventory batches policies
DROP POLICY IF EXISTS "Allow full access for authenticated users" ON inventory_batches;

-- Sales order batches policies
DROP POLICY IF EXISTS "Allow full access for authenticated users" ON sales_order_batches;

-- =============================================
-- 4. Recreate all RLS policies
-- =============================================

-- Customers: per-user policies
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

-- Suppliers: per-user policies
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

-- Inventory: full access for authenticated
CREATE POLICY "Allow full access for authenticated users" ON inventory
    FOR ALL USING (auth.role() = 'authenticated');

-- Sales orders: full access for authenticated
CREATE POLICY "Allow full access for authenticated users" ON sales_orders
    FOR ALL USING (auth.role() = 'authenticated');

-- Inventory batches: full access for authenticated
CREATE POLICY "Allow full access for authenticated users" ON inventory_batches
    FOR ALL USING (auth.role() = 'authenticated');

-- Sales order batches: full access for authenticated
CREATE POLICY "Allow full access for authenticated users" ON sales_order_batches
    FOR ALL USING (auth.role() = 'authenticated');

-- =============================================
-- 5. Verify
-- =============================================
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
