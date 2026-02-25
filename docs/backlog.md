# Post-MVP Backlog

MVP 之后要做但现在先不做的功能，按讨论顺序记录。

---

## Interface 变更追踪
- Circuit 的 Interface Type 变更时记录历史
- 需要新建 `interface_change_log` 表：circuit_id, old_type, new_type, changed_at, reason
- UI 显示变更时间线

## 利润计算（Phase 4 Dashboard）
- Revenue（sell_mrc / sell_otc）vs Cost（Inventory 的 otc / mrc / annual_om_cost）
- 按容量比例分摊成本
- 含附加费用（backhaul、local access 等 Line Items）的综合利润

## Sales 详情页增强
- 利润率显示
- ~~Item 级别独立终止/续期操作~~ ✅ Done
- 成本对比视图（买价 vs 卖价）

## CSV/Excel 导入（Phase 2 遗留）
- 批量导入 Customers / Suppliers
- 批量导入 Inventory Resources

## 数据导出（Phase 4）
- 导出 Inventory / Sales / Customers 为 CSV/Excel

## Sales Item 成本字段（Cross-Connect / Other）
- Capacity 和 Backhaul 类型的 item 可关联 Inventory 资源（分别对应 Capacity 和 Terrestrial），成本可从资源上的 `otc/mrc/nrc/annual_om_cost` 追溯
- Cross-Connect 和 Other 类型不关联 Inventory，**当前没有任何成本字段**
- 如需利润分析，给 `sales_order_items` 加 `cost_mrc`、`cost_nrc` 等对应字段（与 `sell_*` 镜像）
- NRC 类型通常是一次性安装费，成本追踪需求较弱，可按需决定
