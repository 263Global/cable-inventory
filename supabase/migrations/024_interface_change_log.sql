-- interface_change_log: tracks interface type changes on circuits
CREATE TABLE interface_change_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    circuit_id      UUID NOT NULL REFERENCES inventory_circuits(id) ON DELETE CASCADE,
    sales_order_id  UUID REFERENCES sales_orders(id) ON DELETE SET NULL,
    old_type_id     UUID NOT NULL REFERENCES interface_types(id),
    new_type_id     UUID NOT NULL REFERENCES interface_types(id),
    changed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    reason          TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for quick lookups by circuit
CREATE INDEX idx_interface_change_log_circuit ON interface_change_log(circuit_id);

-- RLS
ALTER TABLE interface_change_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read interface change logs"
    ON interface_change_log FOR SELECT
    TO authenticated
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert interface change logs"
    ON interface_change_log FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);
