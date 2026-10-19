-- 028: 滚动续期 / 软占用（Rolling contracts & soft occupancy）
-- 口径（2026-10-19 王永威）：
--   客户合同期满未续签 → 自动顺延为开口合同（滚动续期），任一方提前通知期（默认 30 天）可撤租；资源仍在用。
--   合同期内 = 硬占用；滚动 / 已通知 = 软占用。供应商侧不受影响。
-- 只做加法：新列全部可空，新增一个视图；不删列、不改已有列含义。
-- 回滚：supabase/rollbacks/028_rolling_contracts_down.sql

ALTER TABLE sales_order_items
  ADD COLUMN IF NOT EXISTS contract_state TEXT
    CHECK (contract_state IN ('in_term', 'rolling', 'notice_given', 'terminated')),
  ADD COLUMN IF NOT EXISTS rolling_since DATE,
  ADD COLUMN IF NOT EXISTS notice_period_days INTEGER DEFAULT 30
    CHECK (notice_period_days IS NULL OR notice_period_days > 0),
  ADD COLUMN IF NOT EXISTS notice_given_at DATE,
  ADD COLUMN IF NOT EXISTS notice_by TEXT
    CHECK (notice_by IN ('customer', 'us'));

COMMENT ON COLUMN sales_order_items.contract_state IS 'in_term 合同期内 / rolling 滚动续期 / notice_given 已发撤租通知 / terminated 已终止。原合同结束日沿用 end_date';
COMMENT ON COLUMN sales_order_items.rolling_since IS '进入滚动续期的日期（原结束日次日）';
COMMENT ON COLUMN sales_order_items.notice_period_days IS '撤租通知期（天），默认 30';
COMMENT ON COLUMN sales_order_items.notice_given_at IS '撤租通知发出日';
COMMENT ON COLUMN sales_order_items.notice_by IS '谁发的撤租通知：customer / us';

-- 回填：只写新列，不动已有列（含 updated_at）
UPDATE sales_order_items i
SET
  contract_state = CASE
    WHEN i.terminated_at IS NOT NULL
      OR i.status IN ('Terminated', 'Cancelled')
      OR o.status IN ('Terminated', 'Cancelled') THEN 'terminated'
    WHEN i.end_date IS NOT NULL AND i.end_date < CURRENT_DATE THEN 'rolling'
    ELSE 'in_term'
  END,
  rolling_since = CASE
    WHEN i.terminated_at IS NULL
      AND COALESCE(i.status, '') NOT IN ('Terminated', 'Cancelled')
      AND o.status NOT IN ('Terminated', 'Cancelled')
      AND i.end_date IS NOT NULL AND i.end_date < CURRENT_DATE
    THEN i.end_date + 1
  END
FROM sales_orders o
WHERE o.id = i.sales_order_id
  AND i.contract_state IS NULL;

-- 派生视图：有效状态 + 最早可退出日（随 CURRENT_DATE 实时计算，不存死值）
-- security_invoker = true：查询者自己的 RLS 生效
CREATE OR REPLACE VIEW sales_item_contract_status
WITH (security_invoker = true) AS
SELECT
  s.*,
  CASE s.effective_state
    WHEN 'rolling' THEN CURRENT_DATE + s.notice_days
    WHEN 'notice_given' THEN COALESCE(s.notice_given_at, CURRENT_DATE) + s.notice_days
    WHEN 'in_term' THEN s.end_date
  END AS earliest_exit_date,
  CASE WHEN s.effective_state IN ('rolling', 'notice_given') THEN 'soft'
       WHEN s.effective_state = 'in_term' THEN 'hard'
  END AS occupancy_kind
FROM (
  SELECT
    i.id AS sales_order_item_id,
    i.sales_order_id,
    o.order_id,
    o.status AS order_status,
    o.customer_id,
    i.inventory_resource_id,
    i.type,
    i.capacity,
    i.sell_mrc,
    i.start_date,
    i.end_date,
    i.contract_state,
    i.notice_given_at,
    i.notice_by,
    COALESCE(i.notice_period_days, 30) AS notice_days,
    CASE
      WHEN i.contract_state = 'terminated'
        OR i.terminated_at IS NOT NULL
        OR i.status IN ('Terminated', 'Cancelled')
        OR o.status IN ('Terminated', 'Cancelled') THEN 'terminated'
      WHEN i.contract_state = 'notice_given' THEN 'notice_given'
      WHEN i.contract_state = 'rolling' THEN 'rolling'
      WHEN i.end_date IS NOT NULL AND i.end_date < CURRENT_DATE THEN 'rolling'
      ELSE 'in_term'
    END AS effective_state,
    COALESCE(
      i.rolling_since,
      CASE WHEN i.end_date IS NOT NULL AND i.end_date < CURRENT_DATE THEN i.end_date + 1 END
    ) AS effective_rolling_since
  FROM sales_order_items i
  JOIN sales_orders o ON o.id = i.sales_order_id
) s;

COMMENT ON VIEW sales_item_contract_status IS '订单行合同有效状态（滚动续期/软占用），earliest_exit_date 随当天日期实时计算';

GRANT SELECT ON sales_item_contract_status TO authenticated;
