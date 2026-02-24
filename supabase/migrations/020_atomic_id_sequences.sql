-- 020: Atomic ID Generation via Postgres Sequences
-- Replaces client-side read-then-increment ID generation with
-- database-level sequences + triggers for concurrency safety.

-- =============================================
-- 1. RESOURCE ID SEQUENCE (RES-XXXXX)
-- =============================================

-- Create sequence starting beyond any existing resource_id
DO $$
DECLARE
    max_num integer;
BEGIN
    -- Extract only pure-digit suffixes; skip any non-standard IDs gracefully
    SELECT COALESCE(
        MAX((regexp_match(resource_id, '^RES-(\d+)$'))[1]::integer),
        10000
    ) INTO max_num
    FROM inventory_resources;

    EXECUTE format('CREATE SEQUENCE IF NOT EXISTS resource_id_seq START %s', max_num + 1);
    -- If sequence already exists, make sure it's past the max
    PERFORM setval('resource_id_seq', GREATEST(max_num + 1, nextval('resource_id_seq')), false);
END $$;

-- Trigger function: auto-assign resource_id on INSERT when not provided
CREATE OR REPLACE FUNCTION set_resource_id()
RETURNS trigger AS $$
BEGIN
    IF NEW.resource_id IS NULL OR NEW.resource_id = '' THEN
        NEW.resource_id := 'RES-' || lpad(nextval('resource_id_seq')::text, 5, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_resource_id ON inventory_resources;
CREATE TRIGGER trg_set_resource_id
    BEFORE INSERT ON inventory_resources
    FOR EACH ROW
    EXECUTE FUNCTION set_resource_id();

-- =============================================
-- 2. ORDER ID SEQUENCE (SO-XXXXX)
-- =============================================

-- Ensure sequence exists (migration 016 may or may not have run)
CREATE SEQUENCE IF NOT EXISTS sales_order_seq START 1;

DO $$
DECLARE
    max_num integer;
BEGIN
    -- Extract only pure-digit suffixes; skip any non-standard IDs gracefully
    SELECT COALESCE(
        MAX((regexp_match(order_id, '^SO-(\d+)$'))[1]::integer),
        0
    ) INTO max_num
    FROM sales_orders;

    PERFORM setval('sales_order_seq', GREATEST(max_num + 1, 1), false);
END $$;

-- Trigger function: auto-assign order_id on INSERT when not provided
CREATE OR REPLACE FUNCTION set_order_id()
RETURNS trigger AS $$
BEGIN
    IF NEW.order_id IS NULL OR NEW.order_id = '' THEN
        NEW.order_id := 'SO-' || lpad(nextval('sales_order_seq')::text, 5, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_order_id ON sales_orders;
CREATE TRIGGER trg_set_order_id
    BEFORE INSERT ON sales_orders
    FOR EACH ROW
    EXECUTE FUNCTION set_order_id();
