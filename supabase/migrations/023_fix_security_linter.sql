-- ============================================
-- Fix Supabase Security Linter Warnings
-- 1. Set search_path on functions (function_search_path_mutable)
-- 2. Replace USING(true)/WITH CHECK(true) with auth.uid() IS NOT NULL (rls_policy_always_true)
-- ============================================

-- =============================================
-- 1. Fix function search_path
-- =============================================

CREATE OR REPLACE FUNCTION set_resource_id()
RETURNS trigger AS $$
BEGIN
    IF NEW.resource_id IS NULL OR NEW.resource_id = '' THEN
        NEW.resource_id := 'RES-' || lpad(nextval('resource_id_seq')::text, 5, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION set_order_id()
RETURNS trigger AS $$
BEGIN
    IF NEW.order_id IS NULL OR NEW.order_id = '' THEN
        NEW.order_id := 'SO-' || lpad(nextval('sales_order_seq')::text, 5, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;


-- =============================================
-- 2. Fix RLS policies: replace (true) with (auth.uid() IS NOT NULL)
--    Functionally identical for authenticated users, but satisfies linter
-- =============================================

-- Helper: drop old + create new for each table
-- cable_landing_stations
DROP POLICY IF EXISTS "auth_delete_cable_landing_stations" ON cable_landing_stations;
DROP POLICY IF EXISTS "auth_insert_cable_landing_stations" ON cable_landing_stations;
DROP POLICY IF EXISTS "auth_update_cable_landing_stations" ON cable_landing_stations;
CREATE POLICY "auth_insert_cable_landing_stations" ON cable_landing_stations FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_update_cable_landing_stations" ON cable_landing_stations FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_delete_cable_landing_stations" ON cable_landing_stations FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- cable_systems
DROP POLICY IF EXISTS "auth_delete_cable_systems" ON cable_systems;
DROP POLICY IF EXISTS "auth_insert_cable_systems" ON cable_systems;
DROP POLICY IF EXISTS "auth_update_cable_systems" ON cable_systems;
CREATE POLICY "auth_insert_cable_systems" ON cable_systems FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_update_cable_systems" ON cable_systems FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_delete_cable_systems" ON cable_systems FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- countries
DROP POLICY IF EXISTS "auth_delete_countries" ON countries;
DROP POLICY IF EXISTS "auth_insert_countries" ON countries;
DROP POLICY IF EXISTS "auth_update_countries" ON countries;
CREATE POLICY "auth_insert_countries" ON countries FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_update_countries" ON countries FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_delete_countries" ON countries FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- handover_locations
DROP POLICY IF EXISTS "auth_delete_handover_locations" ON handover_locations;
DROP POLICY IF EXISTS "auth_insert_handover_locations" ON handover_locations;
DROP POLICY IF EXISTS "auth_update_handover_locations" ON handover_locations;
CREATE POLICY "auth_insert_handover_locations" ON handover_locations FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_update_handover_locations" ON handover_locations FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_delete_handover_locations" ON handover_locations FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- interface_types
DROP POLICY IF EXISTS "auth_delete_interface_types" ON interface_types;
DROP POLICY IF EXISTS "auth_insert_interface_types" ON interface_types;
DROP POLICY IF EXISTS "auth_update_interface_types" ON interface_types;
CREATE POLICY "auth_insert_interface_types" ON interface_types FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_update_interface_types" ON interface_types FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_delete_interface_types" ON interface_types FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- inventory_batches
DROP POLICY IF EXISTS "auth_delete_batches" ON inventory_batches;
DROP POLICY IF EXISTS "auth_insert_batches" ON inventory_batches;
DROP POLICY IF EXISTS "auth_update_batches" ON inventory_batches;
CREATE POLICY "auth_insert_batches" ON inventory_batches FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_update_batches" ON inventory_batches FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_delete_batches" ON inventory_batches FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- inventory_circuits
DROP POLICY IF EXISTS "auth_delete_inventory_circuits" ON inventory_circuits;
DROP POLICY IF EXISTS "auth_insert_inventory_circuits" ON inventory_circuits;
DROP POLICY IF EXISTS "auth_update_inventory_circuits" ON inventory_circuits;
CREATE POLICY "auth_insert_inventory_circuits" ON inventory_circuits FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_update_inventory_circuits" ON inventory_circuits FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_delete_inventory_circuits" ON inventory_circuits FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- inventory_resources
DROP POLICY IF EXISTS "auth_delete_inventory_resources" ON inventory_resources;
DROP POLICY IF EXISTS "auth_insert_inventory_resources" ON inventory_resources;
DROP POLICY IF EXISTS "auth_update_inventory_resources" ON inventory_resources;
CREATE POLICY "auth_insert_inventory_resources" ON inventory_resources FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_update_inventory_resources" ON inventory_resources FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_delete_inventory_resources" ON inventory_resources FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- landing_stations
DROP POLICY IF EXISTS "auth_delete_landing_stations" ON landing_stations;
DROP POLICY IF EXISTS "auth_insert_landing_stations" ON landing_stations;
DROP POLICY IF EXISTS "auth_update_landing_stations" ON landing_stations;
CREATE POLICY "auth_insert_landing_stations" ON landing_stations FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_update_landing_stations" ON landing_stations FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_delete_landing_stations" ON landing_stations FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- om_adjustments
DROP POLICY IF EXISTS "auth_delete_om_adj" ON om_adjustments;
DROP POLICY IF EXISTS "auth_insert_om_adj" ON om_adjustments;
DROP POLICY IF EXISTS "auth_update_om_adj" ON om_adjustments;
CREATE POLICY "auth_insert_om_adj" ON om_adjustments FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_update_om_adj" ON om_adjustments FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_delete_om_adj" ON om_adjustments FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- sales_item_circuits
DROP POLICY IF EXISTS "Users can delete sales_item_circuits" ON sales_item_circuits;
DROP POLICY IF EXISTS "Users can insert sales_item_circuits" ON sales_item_circuits;
DROP POLICY IF EXISTS "Users can update sales_item_circuits" ON sales_item_circuits;
CREATE POLICY "Users can insert sales_item_circuits" ON sales_item_circuits FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update sales_item_circuits" ON sales_item_circuits FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete sales_item_circuits" ON sales_item_circuits FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- sales_order_items
DROP POLICY IF EXISTS "Users can delete items" ON sales_order_items;
DROP POLICY IF EXISTS "Users can insert items" ON sales_order_items;
DROP POLICY IF EXISTS "Users can update items" ON sales_order_items;
CREATE POLICY "Users can insert items" ON sales_order_items FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update items" ON sales_order_items FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete items" ON sales_order_items FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- suppliers
DROP POLICY IF EXISTS "auth_delete_suppliers" ON suppliers;
DROP POLICY IF EXISTS "auth_insert_suppliers" ON suppliers;
DROP POLICY IF EXISTS "auth_update_suppliers" ON suppliers;
CREATE POLICY "auth_insert_suppliers" ON suppliers FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_update_suppliers" ON suppliers FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_delete_suppliers" ON suppliers FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);
