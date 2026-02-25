-- Keep circuit allocation + status sync + interface overrides in one transaction.
CREATE OR REPLACE FUNCTION allocate_circuits_with_overrides(
    p_sales_order_item_id UUID,
    p_circuit_ids UUID[],
    p_order_status TEXT,
    p_interface_overrides JSONB DEFAULT '{}'::JSONB,
    p_sales_order_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_circuit_status TEXT;
    v_circuit_key TEXT;
    v_new_type_text TEXT;
    v_circuit_id UUID;
    v_old_type_id UUID;
    v_new_type_id UUID;
BEGIN
    IF p_circuit_ids IS NULL OR array_length(p_circuit_ids, 1) IS NULL THEN
        RETURN;
    END IF;

    INSERT INTO sales_item_circuits (sales_order_item_id, inventory_circuit_id)
    SELECT p_sales_order_item_id, circuit_id
    FROM (
        SELECT DISTINCT unnest(p_circuit_ids) AS circuit_id
    ) dedup;

    v_circuit_status := CASE
        WHEN p_order_status IN ('Pre-sold', 'Active') THEN 'Allocated'
        ELSE 'Reserved'
    END;

    UPDATE inventory_circuits
    SET status = v_circuit_status,
        updated_at = now()
    WHERE id = ANY(p_circuit_ids);

    FOR v_circuit_key, v_new_type_text IN
        SELECT key, value
        FROM jsonb_each_text(COALESCE(p_interface_overrides, '{}'::JSONB))
    LOOP
        v_circuit_id := v_circuit_key::UUID;
        IF NOT (v_circuit_id = ANY(p_circuit_ids)) THEN
            CONTINUE;
        END IF;

        v_new_type_id := v_new_type_text::UUID;
        SELECT current_interface_type_id
        INTO v_old_type_id
        FROM inventory_circuits
        WHERE id = v_circuit_id
        FOR UPDATE;

        IF v_old_type_id IS NULL OR v_old_type_id = v_new_type_id THEN
            CONTINUE;
        END IF;

        UPDATE inventory_circuits
        SET current_interface_type_id = v_new_type_id,
            updated_at = now()
        WHERE id = v_circuit_id;

        INSERT INTO interface_change_log (circuit_id, sales_order_id, old_type_id, new_type_id)
        VALUES (v_circuit_id, p_sales_order_id, v_old_type_id, v_new_type_id);
    END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION allocate_circuits_with_overrides(UUID, UUID[], TEXT, JSONB, UUID) TO authenticated;
