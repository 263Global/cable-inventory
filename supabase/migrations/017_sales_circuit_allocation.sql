-- =============================================
-- Sales Item ↔ Circuit Junction Table
-- =============================================
-- Links individual circuits to sales order items
-- for precise tracking of which circuits are sold to whom.

CREATE TABLE sales_item_circuits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_item_id UUID NOT NULL REFERENCES sales_order_items(id) ON DELETE CASCADE,
  inventory_circuit_id UUID NOT NULL REFERENCES inventory_circuits(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (sales_order_item_id, inventory_circuit_id)
);

-- Prevent double-allocation: one circuit can only be in one active sales item
CREATE UNIQUE INDEX idx_sic_circuit_unique ON sales_item_circuits(inventory_circuit_id);

-- Indexes
CREATE INDEX idx_sic_item ON sales_item_circuits(sales_order_item_id);
CREATE INDEX idx_sic_circuit ON sales_item_circuits(inventory_circuit_id);

-- RLS
ALTER TABLE sales_item_circuits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all sales_item_circuits" ON sales_item_circuits FOR SELECT USING (true);
CREATE POLICY "Users can insert sales_item_circuits" ON sales_item_circuits FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update sales_item_circuits" ON sales_item_circuits FOR UPDATE USING (true);
CREATE POLICY "Users can delete sales_item_circuits" ON sales_item_circuits FOR DELETE USING (true);
