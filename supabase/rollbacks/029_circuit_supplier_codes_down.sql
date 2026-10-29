-- 回滚 029_circuit_supplier_codes.sql：只删除 029 新增的视图、索引和列（列里的编号数据会一并丢失，先备份）
DROP VIEW IF EXISTS circuit_code_lookup;
DROP INDEX IF EXISTS idx_circuits_supplier_sr;
DROP INDEX IF EXISTS idx_circuits_juno_circuit_id;
ALTER TABLE inventory_circuits
  DROP COLUMN IF EXISTS supplier_sr,
  DROP COLUMN IF EXISTS supplier_sr_old,
  DROP COLUMN IF EXISTS supplier_service_id,
  DROP COLUMN IF EXISTS juno_circuit_id,
  DROP COLUMN IF EXISTS xc_sr,
  DROP COLUMN IF EXISTS xc_desc,
  DROP COLUMN IF EXISTS cost_order_ref;
