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
