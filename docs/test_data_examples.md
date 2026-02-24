# CableTrack 手动测试数据

> 按顺序录入: 先 Inventory → 再 Sales（Sales 依赖 Inventory Resource）

---

## Inventory Resources

### INV-1: Capacity / IRU / APCN-2

| Field | Value |
|-------|-------|
| Type | Capacity |
| Cost Mode | Single |
| Spec | 100G |
| Capacity | 1600 |
| Cable System | APCN-2 |
| Supplier | *(选已有的)* |
| Acquisition | IRU |
| Protection | Unprotected |
| Contract Ref | CTR-2025-001 |
| **A-End Country** | China |
| **Z-End Country** | Japan |
| Route | China → Japan via APCN-2 |
| Term | 240 months |
| Start Date | 2025-01-01 |
| OTC ($) | 450,000 |
| O&M Rate | 4% |

### INV-2: Capacity / Lease / UNITY

| Field | Value |
|-------|-------|
| Type | Capacity |
| Cost Mode | Single |
| Spec | 100G |
| Capacity | 400 |
| Cable System | UNITY |
| Acquisition | Lease |
| Protection | Unprotected |
| Contract Ref | CTR-2025-002 |
| **A-End Country** | Japan |
| **Z-End Country** | United States |
| Route | Japan → US |
| Term | 60 months |
| Start Date | 2025-03-01 |
| MRC ($) | 8,500 |
| NRC ($) | 15,000 |

### INV-3: Capacity / IRU / Base+Batch / AAE-1

| Field | Value |
|-------|-------|
| Type | Capacity |
| Cost Mode | **Base+Batch** |
| Spec | 100G |
| Capacity (Base) | 1000 |
| Cable System | AAE-1 |
| Acquisition | IRU |
| Protection | Protected |
| Contract Ref | CTR-2025-003 |
| **A-End Country** | China |
| **Z-End Country** | France |
| Route | HK → Marseille via AAE-1 |
| Base Term | 240 months |
| Base Start | 2024-06-01 |
| Base OTC ($) | 800,000 |
| Base O&M Rate | 4% |

**Batch 1:**

| Capacity | Model | Start Date | OTC ($) | O&M Rate | Status |
|----------|-------|------------|---------|----------|--------|
| 400 | IRU | 2024-06-01 | 320,000 | 4% | Active |

**Batch 2:**

| Capacity | Model | Start Date | OTC ($) | O&M Rate | Status |
|----------|-------|------------|---------|----------|--------|
| 300 | IRU | 2025-06-01 | 240,000 | 4% | Planned |

### INV-4: Terrestrial / Lease

| Field | Value |
|-------|-------|
| Type | Terrestrial |
| Cost Mode | Single |
| Spec | 10G |
| Capacity | 10 |
| Acquisition | Lease |
| Protection | Unprotected |
| Contract Ref | CTR-2025-004 |
| Handover A | *(选已有的 handover location)* |
| Handover Z | *(选另一个)* |
| Route | HKIX → Equinix HK1 |
| Term | 36 months |
| Start Date | 2025-06-01 |
| MRC ($) | 3,200 |
| NRC ($) | 5,000 |

---

## Sales Orders

### SO-1: Telstra — IRU Out (单条 Capacity)

**Order Info:**

| Field | Value |
|-------|-------|
| Customer | Telstra |
| Status | Active |
| Internal Ref | INT-2025-001 |
| Notes | Telstra APCN-2 IRU deal |

**Line Item 1 — Capacity:**

| Field | Value |
|-------|-------|
| Type | Capacity |
| Disposal | IRU Out |
| Resource | *(选 INV-1 / APCN-2)* |
| Circuits | *(如有，勾选)* |
| Capacity | 200 |
| Spec | 100G |
| Start Date | 2025-03-01 |
| Term | 180 months |
| Sell OTC ($) | 120,000 |
| O&M Rate | 4% |
| NRC ($) | 5,000 |

---

### SO-2: NTT — Lease Out + Cross-Connect (多条目)

**Order Info:**

| Field | Value |
|-------|-------|
| Customer | NTT |
| Status | Draft |
| Notes | Pending NTT approval |

**Line Item 1 — Capacity:**

| Field | Value |
|-------|-------|
| Type | Capacity |
| Disposal | Lease Out |
| Resource | *(选 INV-2 / UNITY)* |
| Capacity | 100 |
| Spec | 100G |
| Start Date | 2025-06-01 |
| Term | 36 months |
| Sell MRC ($) | 4,500 |
| NRC ($) | 3,000 |

**Line Item 2 — Cross-Connect:**

| Field | Value |
|-------|-------|
| Type | Cross-Connect |
| Description | 楼内线 Equinix TY1 3F-7F |
| Start Date | 2025-06-01 |
| Term | 36 months |
| Sell MRC ($) | 800 |
| NRC ($) | 500 |

---

### SO-3: PCCW — Backhaul + NRC (验证特殊类型)

**Order Info:**

| Field | Value |
|-------|-------|
| Customer | PCCW |
| Status | Pre-sold |
| Internal Ref | INT-2025-003 |

**Line Item 1 — Backhaul:**

| Field | Value |
|-------|-------|
| Type | Backhaul |
| Disposal | Lease Out |
| Resource | *(选 INV-4 / Terrestrial)* |
| Capacity | 10 |
| Spec | 10G |
| Start Date | 2025-07-01 |
| Term | 24 months |
| Sell MRC ($) | 4,800 |
| NRC ($) | 2,000 |

**Line Item 2 — NRC:**

| Field | Value |
|-------|-------|
| Type | NRC |
| Description | Installation fee - HKIX rack |
| Start Date | 2025-07-01 |
| Sell NRC ($) | 8,000 |
