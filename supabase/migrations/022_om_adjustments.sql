-- ============================================
-- O&M Adjustments table for tracking waivers, prepayments, and discounts
-- ============================================

CREATE TABLE IF NOT EXISTS om_adjustments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_resource_id UUID NOT NULL REFERENCES inventory_resources(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES inventory_batches(id) ON DELETE CASCADE,  -- NULL = base level
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('waived', 'prepaid', 'discounted')),
  amount NUMERIC DEFAULT 0,  -- prepaid total; 0 for waived
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- RLS
ALTER TABLE om_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_om_adj" ON om_adjustments FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_om_adj" ON om_adjustments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_om_adj" ON om_adjustments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_om_adj" ON om_adjustments FOR DELETE TO authenticated USING (true);

-- Index
CREATE INDEX IF NOT EXISTS idx_om_adj_resource ON om_adjustments(inventory_resource_id);
CREATE INDEX IF NOT EXISTS idx_om_adj_batch ON om_adjustments(batch_id);
