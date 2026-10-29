// 端口级供应商编号（migration 029）：PCCW SR / Service ID / Juno JOC / XC
// 口径（2026-10-29 王永威）：已交付（有 SR 或 JOC）且未分配的端口 = 可售。

export interface CircuitCodeFields {
    status: string
    supplier_sr?: string | null
    supplier_sr_old?: string | null
    supplier_service_id?: string | null
    juno_circuit_id?: string | null
    xc_sr?: string | null
    xc_desc?: string | null
}

export function hasSupplierCode(circuit: CircuitCodeFields): boolean {
    return Boolean(circuit.supplier_sr || circuit.juno_circuit_id)
}

/** 可售 = 已交付（有 SR 或 JOC）+ 端口空闲 + 没有订单占用 */
export function isSellableCircuit(circuit: CircuitCodeFields, hasSale: boolean): boolean {
    return circuit.status === 'Available' && !hasSale && hasSupplierCode(circuit)
}

export interface DeliveryCircuit extends CircuitCodeFields {
    capacity: number
    /** 是否有订单行占用（sales_item_circuits） */
    has_order: boolean
}

export interface DeliverySummary {
    /** 是否按交付编号判定：资源下至少一个端口录了 SR / JOC */
    tracked: boolean
    /** 合同容量 */
    contract: number
    /** 已点亮 = 已建端口容量合计 */
    lit: number
    /** 已交付给我们：有编号或已有订单的端口（未按编号判定的资源 = 全部已点亮） */
    delivered: number
    /** 可售：已交付且空闲 */
    sellable: number
    /** 交付中：已点亮、空闲、还没有交付编号 */
    pending: number
    /** 未点亮 = 合同 − 已点亮 */
    unlit: number
}

/** 2026-10-29 王永威口径：合同容量 ≠ 实际交付；没交付给我们的端口不可售，算"交付中" */
export function isPendingDelivery(circuit: DeliveryCircuit, tracked: boolean): boolean {
    return tracked && !circuit.has_order && circuit.status === 'Available' && !hasSupplierCode(circuit)
}

export function summarizeDelivery(contractCapacity: number, circuits: DeliveryCircuit[]): DeliverySummary {
    const tracked = circuits.some(hasSupplierCode)
    let lit = 0
    let pending = 0
    let sellable = 0
    for (const circuit of circuits) {
        const capacity = Number(circuit.capacity) || 0
        lit += capacity
        if (isPendingDelivery(circuit, tracked)) pending += capacity
        else if (isSellableCircuit(circuit, circuit.has_order)) sellable += capacity
    }
    lit = Math.min(lit, contractCapacity > 0 ? contractCapacity : lit)
    return {
        tracked,
        contract: contractCapacity,
        lit,
        delivered: Math.max(lit - pending, 0),
        sellable,
        pending,
        unlit: Math.max(contractCapacity - lit, 0),
    }
}

export interface DeliverySegments {
    hard: number
    soft: number
    /** 复用（自用）：处置类型 Self Use 的订单行（2026-10-29 王永威：Excel 成本属性「复用」= 自用，不可售） */
    selfUse: number
    /** 已交付但既不是订单占用也不可售（如无订单的 Reserved 端口） */
    other: number
    /** 可售：按交付编号判定的资源 = 已交付空闲端口；其余资源 = 合同 − 占用（原"可用"口径） */
    sellable: number
    pending: number
    unlit: number
}

/** 订单行归到哪一段：复用（自用）优先，其余按合同状态分硬 / 软占用 */
export function occupancyBucket(disposalType: string | null | undefined, occupancy: string): 'selfUse' | 'hard' | 'soft' | null {
    if (occupancy === 'none') return null
    if (disposalType === 'Self Use') return 'selfUse'
    return occupancy === 'hard' ? 'hard' : occupancy === 'soft' ? 'soft' : null
}

/** Inventory 列表 / 看板 / 资源详情共用的容量拆分，三处同一套数字 */
export function deliverySegments(hard: number, soft: number, delivery: DeliverySummary, selfUse = 0): DeliverySegments {
    if (!delivery.tracked) {
        const occupied = hard + soft + selfUse
        return { hard, soft, selfUse, other: 0, sellable: Math.max(delivery.contract - occupied, 0), pending: 0, unlit: 0 }
    }
    return {
        hard,
        soft,
        selfUse,
        other: Math.max(delivery.delivered - delivery.sellable - hard - soft - selfUse, 0),
        sellable: delivery.sellable,
        pending: delivery.pending,
        unlit: delivery.unlit,
    }
}

/** 占用合计（硬 + 软 + 复用 + 其他） */
export function occupiedOf(seg: DeliverySegments): number {
    return seg.hard + seg.soft + seg.selfUse + seg.other
}

/** 资源使用状态（与容量条同一口径） */
export function usageStatusOf(total: number, seg: DeliverySegments): 'Available' | 'Partially Used' | 'Fully Used' {
    const occupied = occupiedOf(seg)
    if (total > 0 && occupied >= total) return 'Fully Used'
    return occupied > 0 ? 'Partially Used' : 'Available'
}

/** 容量显示：≥1000G 且整百时用 T，如 2700 → 2.7T */
export function formatCapacity(gbps: number): string {
    if (gbps >= 1000 && gbps % 100 === 0) return `${gbps / 1000}T`
    return `${gbps}G`
}

/** 端口行上展示的编号标签，按 SR → 旧 SR → Service ID → JOC → XC 顺序 */
export function circuitCodeLabels(circuit: CircuitCodeFields): Array<{ label: string; value: string }> {
    const labels: Array<{ label: string; value: string }> = []
    if (circuit.supplier_sr) labels.push({ label: 'SR', value: circuit.supplier_sr })
    if (circuit.supplier_sr_old) labels.push({ label: '旧SR', value: circuit.supplier_sr_old })
    if (circuit.supplier_service_id) labels.push({ label: 'SID', value: circuit.supplier_service_id })
    if (circuit.juno_circuit_id) labels.push({ label: 'JOC', value: circuit.juno_circuit_id })
    if (circuit.xc_sr) labels.push({ label: 'XC', value: circuit.xc_sr })
    return labels
}

/** 编号查询的列（circuit_code_lookup 视图），任一列包含关键字即命中 */
export const circuitCodeSearchColumns = [
    'supplier_sr',
    'supplier_sr_old',
    'supplier_service_id',
    'juno_circuit_id',
    'xc_sr',
    'order_ref',
    'order_id',
    'cost_order_ref',
] as const

/** 像编号的关键字才去查端口（避免输入 "ju" 这种也触发查询）：至少 4 位，且含数字 */
export function looksLikeCode(query: string): boolean {
    const q = query.trim()
    return q.length >= 4 && /\d/.test(q)
}

/** 生成 PostgREST or= 过滤串；去掉会破坏语法的字符 */
export function buildCodeSearchFilter(query: string): string {
    const q = query.trim().replace(/[(),*%\\]/g, '')
    return circuitCodeSearchColumns.map((column) => `${column}.ilike.*${q}*`).join(',')
}
