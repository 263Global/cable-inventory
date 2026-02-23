# Post-MVP Backlog

MVP 之后要做但现在先不做的功能，按讨论顺序记录。

---

## ~~Sales → Circuit 精确关联~~ ✅ Done
- ~~Sales Order Item 关联到具体 Circuit（而不只是 Resource 总量）~~
- ~~可以知道"Telstra 的 100G 走的是 Circuit #2"~~
- ~~需要 `sales_order_items` 加 `circuit_id` FK~~

## Interface 变更追踪
- Circuit 的 Interface Type 变更时记录历史
- 需要新建 `interface_change_log` 表：circuit_id, old_type, new_type, changed_at, reason
- UI 显示变更时间线

## 利润计算（Phase 4 Dashboard）
- Revenue（sell_mrc / sell_otc）vs Cost（Inventory 的 otc / mrc / annual_om_cost）
- 按容量比例分摊成本
- 含附加费用（backhaul、local access 等 Line Items）的综合利润

## ~~Sales Order 自动状态转换~~ ✅ Done
- ~~Pre-sold → Active：到了 start_date 自动转换~~
- ~~Active → Expired：到了 end_date 自动转换~~
- ~~类似 Batch 的 Planned → Active 自动逻辑~~

## Sales 详情页增强
- 利润率显示
- Item 级别独立终止/续期操作
- 成本对比视图（买价 vs 卖价）

## CSV/Excel 导入（Phase 2 遗留）
- 批量导入 Customers / Suppliers
- 批量导入 Inventory Resources

## 数据导出（Phase 4）
- 导出 Inventory / Sales / Customers 为 CSV/Excel
