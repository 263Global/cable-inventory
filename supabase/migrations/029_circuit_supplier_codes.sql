-- 029: 端口级供应商编号（PCCW SR / Service ID / Juno JOC / XC）+ 编号查询视图
-- 口径（2026-10-29 王永威）：我司 OB 号、PCCW SR 号、Juno JOC 号一一对应，按任一编号能查到同一条线；
--   已交付（有 SR 或 JOC）且未分配的端口 = 可售。
-- 只做加法：新列全部可空，新增一个视图；不删列、不改已有列含义。
-- 回滚：supabase/rollbacks/029_circuit_supplier_codes_down.sql

ALTER TABLE inventory_circuits
  ADD COLUMN IF NOT EXISTS supplier_sr TEXT,          -- 供应商当前 SR（PCCW JUNOFiber new SR）
  ADD COLUMN IF NOT EXISTS supplier_sr_old TEXT,      -- 旧 SR（换号前）
  ADD COLUMN IF NOT EXISTS supplier_service_id TEXT,  -- PCCW Service ID（S00xxxxx）
  ADD COLUMN IF NOT EXISTS juno_circuit_id TEXT,      -- Juno / Seren Circuit ID（JOCxxxxx）
  ADD COLUMN IF NOT EXISTS xc_sr TEXT,                -- XC 单号
  ADD COLUMN IF NOT EXISTS xc_desc TEXT,              -- XC 组合，如 "Maruyama XC *2"
  ADD COLUMN IF NOT EXISTS cost_order_ref TEXT;       -- 关联成本单完整合成编号（带 -CBGn 后缀，多个用 ; 分隔）

CREATE INDEX IF NOT EXISTS idx_circuits_supplier_sr ON inventory_circuits(supplier_sr);
CREATE INDEX IF NOT EXISTS idx_circuits_juno_circuit_id ON inventory_circuits(juno_circuit_id);

CREATE OR REPLACE VIEW circuit_code_lookup
WITH (security_invoker = true) AS
SELECT
  c.id AS circuit_id,
  c.inventory_resource_id,
  r.resource_id,
  r.internal_ref AS resource_ref,
  c.circuit_number,
  c.capacity,
  it.name AS interface_name,
  c.status,
  c.supplier_sr,
  c.supplier_sr_old,
  c.supplier_service_id,
  c.juno_circuit_id,
  c.xc_sr,
  c.xc_desc,
  c.cost_order_ref,
  o.id AS sales_order_id,
  o.order_id,
  o.internal_ref AS order_ref,
  o.status AS order_status,
  cu.name AS customer_name,
  (c.status = 'Available' AND l.inventory_circuit_id IS NULL
    AND (c.supplier_sr IS NOT NULL OR c.juno_circuit_id IS NOT NULL)) AS is_sellable
FROM inventory_circuits c
JOIN inventory_resources r ON r.id = c.inventory_resource_id
LEFT JOIN interface_types it ON it.id = c.current_interface_type_id
LEFT JOIN LATERAL (
  SELECT sic.inventory_circuit_id, sic.sales_order_item_id
  FROM sales_item_circuits sic
  WHERE sic.inventory_circuit_id = c.id
  LIMIT 1
) l ON true
LEFT JOIN sales_order_items i ON i.id = l.sales_order_item_id
LEFT JOIN sales_orders o ON o.id = i.sales_order_id
LEFT JOIN customers cu ON cu.id = o.customer_id;

GRANT SELECT ON circuit_code_lookup TO authenticated;
