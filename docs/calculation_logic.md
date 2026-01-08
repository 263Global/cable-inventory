、# Sales Order 成本与收入计算逻辑

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

---

### 2. IRU + Inventory（自有资源买断销售）
使用自有库存，以 IRU 方式卖给客户。

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
| **Backhaul A-End** | `costs.backhaulA.mrc` | `costs.backhaulA.nrc` |
| **Backhaul Z-End** | `costs.backhaulZ.mrc` | `costs.backhaulZ.nrc` |
| **Cross Connect A** | `costs.xcA.mrc` | `costs.xcA.nrc` |
| **Cross Connect Z** | `costs.xcZ.mrc` | `costs.xcZ.nrc` |
| **Other Costs** | `costs.other.monthly` | `costs.other.oneOff` |

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
