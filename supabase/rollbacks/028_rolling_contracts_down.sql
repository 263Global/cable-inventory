-- 回滚 028_rolling_contracts.sql
-- 只删除 028 新增的视图和列；不影响任何已有列和数据。
DROP VIEW IF EXISTS sales_item_contract_status;

ALTER TABLE sales_order_items
  DROP COLUMN IF EXISTS notice_by,
  DROP COLUMN IF EXISTS notice_given_at,
  DROP COLUMN IF EXISTS notice_period_days,
  DROP COLUMN IF EXISTS rolling_since,
  DROP COLUMN IF EXISTS contract_state;
