-- Sales orders are shared team records in the app, so authenticated users
-- should be able to maintain orders created by other team members.
DROP POLICY IF EXISTS "Users can insert sales_orders" ON sales_orders;
DROP POLICY IF EXISTS "Users can update sales_orders" ON sales_orders;
DROP POLICY IF EXISTS "Users can delete sales_orders" ON sales_orders;

CREATE POLICY "Users can insert sales_orders"
  ON sales_orders FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update sales_orders"
  ON sales_orders FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete sales_orders"
  ON sales_orders FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);
