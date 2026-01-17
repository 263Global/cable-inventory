# Sales Order 成本与收入计算逻辑

> 本文档记录了 Cable Inventory Manager 系统中各种销售场景的利润计算规则。

---

## 基础概念

### 容量分摊比例
当使用 Inventory 资源时，成本按容量比例分摊：
```
分摊比例 = 销售容量 ÷ Inventory 总容量
```

### Inventory 月成本计算
根据 Inventory 的所有权类型：

| Ownership | 月成本公式 |
|-----------|----------|
| **Leased** | `MRC × 分摊比例` |
| **IRU** | `(OTC ÷ Term Months + Annual O&M ÷ 12) × 分摊比例` |

### 利润率定义
**常规（非 IRU + Resale）：**
```
利润率 = 月利润 ÷ 月收入
```
其中：
- Lease：月收入 = MRC收入
- IRU（Inventory / Hybrid）：月收入 = 月OTC收入 + 月O&M收入

**IRU + Resale（特殊）：**
```
首月利润率 = 首月利润 ÷ (OTC收入 + 当月O&M收入)
续月利润率 = 续月利润 ÷ 当月O&M收入
```

---

## 一、Lease Model（月租模式）

### 1. Lease + Resale（纯转售）
从第三方租赁资源，再租给客户。

**收入：**
- MRC Sales（月租收入）
- NRC Sales（一次性收入）

**月利润：**
```
月利润 = MRC收入 - Cable MRC - Backhaul MRC - XC MRC - Other Monthly
NRC利润 = NRC收入 - Cable NRC - Backhaul NRC - XC NRC - Other One-off
```

**示例：**
- 收入：MRC=5,000；NRC=2,000
- 成本：Cable MRC=2,500；Backhaul MRC=300；XC MRC=200；Other Monthly=0
- 一次性成本：Cable NRC=500；Backhaul NRC=100；XC NRC=100；Other One-off=0
```
月利润 = 5,000 - 2,500 - 300 - 200 = 2,000
NRC利润 = 2,000 - 500 - 100 - 100 = 1,300
利润率 = 2,000 ÷ 5,000 = 40.00%
```

---

### 2. Lease + Inventory（自有资源）
使用自有库存资源租给客户。

**收入：**
- MRC Sales
- NRC Sales

**月利润：**
```
月利润 = MRC收入 - Inventory月成本 - Backhaul MRC - XC MRC - Other Monthly
```

*注：无 3rd Party Cable 成本*

**示例 A（Inventory = Leased）：**
- Inventory：MRC=8,000
- 销售容量=10G；Inventory容量=100G → 分摊比例=0.1
- 收入：MRC=6,000
```
Inventory月成本 = 8,000 × 0.1 = 800
月利润 = 6,000 - 800 = 5,200
利润率 = 5,200 ÷ 6,000 = 86.67%
```

**示例 B（Inventory = IRU，仍按摊销计入成本）：**
- Inventory：OTC=300,000；Term=180；Annual O&M=18,000
- 销售容量=10G；Inventory容量=100G → 分摊比例=0.1
- 收入：MRC=6,000
```
Inventory月成本 = (300,000 ÷ 180 + 18,000 ÷ 12) × 0.1
               = (1,666.67 + 1,500) × 0.1
               = 316.67
月利润 = 6,000 - 316.67 = 5,683.33
利润率 = 5,683.33 ÷ 6,000 = 94.72%
```

---

### 3. Lease + Hybrid（混合资源）
同时使用自有资源和第三方资源。

**收入：**
- MRC Sales
- NRC Sales

**月利润：**
```
月利润 = MRC收入 - Inventory月成本 - Cable MRC - Backhaul MRC - XC MRC - Other Monthly
```

**示例 A（Inventory = Leased）：**
- Inventory：MRC=8,000 → 分摊=800
- 3rd Party Cable：MRC=1,500
- 收入：MRC=6,000
```
月利润 = 6,000 - 800 - 1,500 = 3,700
利润率 = 3,700 ÷ 6,000 = 61.67%
```

**示例 B（Inventory = IRU，仍按摊销计入成本）：**
- Inventory：OTC=300,000；Term=180；Annual O&M=18,000 → 分摊=0.1
- 3rd Party Cable：MRC=1,500
- 收入：MRC=6,000
```
Inventory月成本 = (300,000 ÷ 180 + 18,000 ÷ 12) × 0.1 = 316.67
月利润 = 6,000 - 316.67 - 1,500 = 4,183.33
利润率 = 4,183.33 ÷ 6,000 = 69.72%
```

---

## 二、IRU Model（买断模式）

### 1. IRU + Resale（纯转售）
从第三方买断资源，再以 IRU 方式卖给客户。

**收入：**
- OTC（一次性买断收入）
- Annual O&M（年度运维收入）

**利润计算（OTC 毛利一次性计入第1个月）：**

**第1个月：**
```
月利润 = (OTC收入 - OTC成本) 
       + (Annual O&M收入 - Annual O&M成本) ÷ 12 
       - Backhaul MRC 
       - XC MRC 
       - Other Monthly
```

**第2个月起：**
```
月利润 = (Annual O&M收入 - Annual O&M成本) ÷ 12 
       - Backhaul MRC 
       - XC MRC 
       - Other Monthly
```

**示例：**
- 收入：OTC=120,000；Annual O&M=12,000
- 成本：OTC=90,000；Annual O&M=3,600
```
当月O&M差 = (12,000 - 3,600) ÷ 12 = 700
首月利润 = (120,000 - 90,000) + 700 = 30,700
续月利润 = 700
首月利润率 = 30,700 ÷ (120,000 + 1,000) = 25.37%
续月利润率 = 700 ÷ 1,000 = 70.00%
```

---

### 2. IRU + Inventory（自有资源买断销售）
使用自有库存，以 IRU 方式卖给客户。

*注：IRU 销售一般对应 IRU Inventory，Leased Inventory 通常不用于 IRU 销售。*

**收入（按月分摊）：**
- 月 OTC 收入 = OTC 收入 ÷ 销售合同月数
- 月 O&M 收入 = Annual O&M 收入 ÷ 12

**成本（按月分摊 + 容量比例）：**
```
Inventory月成本 = (Inventory OTC ÷ Inventory Term) × 分摊比例
Inventory O&M月成本 = (Inventory Annual O&M ÷ 12) × 分摊比例
```

**月利润：**
```
月利润 = 月OTC收入 + 月O&M收入 
       - Inventory月成本 
       - Inventory O&M月成本 
       - Backhaul MRC 
       - XC MRC 
       - Other Monthly
```

**示例：**
- Inventory: 100G, OTC = 120,000, Term = 180月
- 销售: 10G
```
Inventory月成本 = (120,000 ÷ 180) × (10 ÷ 100) = 666.67 × 0.1 = 66.67/月
```

**完整示例（含利润）：**
- 销售：OTC=120,000；合同期=60月 → 月OTC收入=2,000
- Annual O&M=12,000 → 月O&M收入=1,000
- Inventory（IRU）：OTC=300,000；Term=180；Annual O&M=18,000
- 分摊比例=0.1
```
Inventory月成本 = (300,000 ÷ 180) × 0.1 = 166.67
Inventory O&M月成本 = (18,000 ÷ 12) × 0.1 = 150
月利润 = 2,000 + 1,000 - 166.67 - 150 = 2,683.33
利润率 = 2,683.33 ÷ 3,000 = 89.44%
```

---

### 3. IRU + Hybrid（混合资源买断销售）
同时使用自有资源和第三方资源，以 IRU 方式卖给客户。

**收入（按月分摊）：**
- 月 OTC 收入 = OTC 收入 ÷ 销售合同月数
- 月 O&M 收入 = Annual O&M 收入 ÷ 12

**成本（全部按月分摊）：**
```
Inventory月成本 = (Inventory OTC ÷ Inventory Term) × 分摊比例
Inventory O&M月成本 = (Inventory Annual O&M ÷ 12) × 分摊比例

Cable月成本 = Cable OTC ÷ Cable合同月数
Cable O&M月成本 = Cable Annual O&M ÷ 12

Backhaul月成本（如为 IRU）= Backhaul OTC ÷ Backhaul合同月数 + Backhaul Annual O&M ÷ 12
```

**月利润：**
```
月利润 = 月OTC收入 + 月O&M收入 
       - Inventory月成本 - Inventory O&M月成本 
       - Cable月成本 - Cable O&M月成本 
       - Backhaul MRC 
       - XC MRC 
       - Other Monthly
```

**示例：**
- 销售：OTC=120,000；合同期=60 → 月OTC=2,000
- Annual O&M=12,000 → 月O&M=1,000
**示例 A（Inventory = IRU）：**
- Inventory：OTC=300,000；Term=180；Annual O&M=18,000；分摊=0.1
- Cable（IRU）：OTC=60,000；Term=60；Annual O&M=6,000
```
Inventory月成本 = (300,000 ÷ 180) × 0.1 = 166.67
Inventory O&M月成本 = (18,000 ÷ 12) × 0.1 = 150
Cable月成本 = 60,000 ÷ 60 = 1,000
Cable O&M月成本 = 6,000 ÷ 12 = 500
月利润 = 3,000 - 166.67 - 150 - 1,000 - 500 = 1,183.33
利润率 = 1,183.33 ÷ 3,000 = 39.44%
```

**示例 B（Inventory = Leased）：**
- Inventory：MRC=8,000 → 分摊=800
- Cable（IRU）：OTC=60,000；Term=60；Annual O&M=6,000
```
Inventory月成本 = 8,000 × 0.1 = 800
Cable月成本 = 60,000 ÷ 60 = 1,000
Cable O&M月成本 = 6,000 ÷ 12 = 500
月利润 = 3,000 - 800 - 1,000 - 500 = 700
利润率 = 700 ÷ 3,000 = 23.33%
```

---

### 4. IRU + Swapped Out（置换）
用自己的资源换取对方的资源，无现金交易。

**利润：**
```
月利润 = 0（不计算利润，仅做记录）
```

---

## 三、成本字段说明

| 成本类型 | 月租字段 (MRC) | 一次性字段 (NRC/OTC) |
|---------|---------------|---------------------|
| **3rd Party Cable** | `costs.cable.mrc` | `costs.cable.nrc` / `costs.cable.otc` |
| **Backhaul A-End** | `costs.backhaul.aEnd.monthly` | `costs.backhaul.aEnd.nrc` |
| **Backhaul Z-End** | `costs.backhaul.zEnd.monthly` | `costs.backhaul.zEnd.nrc` |
| **Cross Connect A** | `costs.crossConnect.aEnd.monthly` | `costs.crossConnect.aEnd.nrc` |
| **Cross Connect Z** | `costs.crossConnect.zEnd.monthly` | `costs.crossConnect.zEnd.nrc` |
| **Other Costs** | `costs.otherCosts.monthly` | `costs.otherCosts.oneOff` |

> 说明：当 Backhaul 为 IRU 时，月成本按 `OTC ÷ termMonths + Annual O&M ÷ 12` 计算，字段为 `costs.backhaul.aEnd.otc` / `costs.backhaul.aEnd.annualOm` / `costs.backhaul.aEnd.termMonths`（Z-End 同理）。

> 说明：Inventory 详情页的 “Monthly Revenue” 指所有关联销售订单的月收入合计；IRU 订单按 OTC 摊销 + 月 O&M 口径计算。

---

## 四、汇总表

### Lease Model

| Sales Type | 需要 Inventory | 需要 3rd Party Cable | 月利润公式 |
|------------|---------------|---------------------|----------|
| Resale | ❌ | ✅ | MRC收入 - Cable MRC - 运营成本 |
| Inventory | ✅ | ❌ | MRC收入 - Inventory月成本 - 运营成本 |
| Hybrid | ✅ | ✅ | MRC收入 - Inventory月成本 - Cable MRC - 运营成本 |

### IRU Model

| Sales Type | 需要 Inventory | 需要 3rd Party Cable | OTC 处理 | 月利润公式 |
|------------|---------------|---------------------|---------|----------|
| Resale | ❌ | ✅ | 一次性（第1月） | 第1月含OTC毛利，后续仅O&M差 |
| Inventory | ✅ | ❌ | 按月分摊 | 月OTC+月O&M - Inventory成本 - 运营成本 |
| Hybrid | ✅ | ✅ | 按月分摊 | 月OTC+月O&M - Inventory成本 - Cable成本 - 运营成本 |
| Swapped Out | ✅ | ❌ | 不计算 | 0 |

---

*文档创建日期：2026-01-08*
