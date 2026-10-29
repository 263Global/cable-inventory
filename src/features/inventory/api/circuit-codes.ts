import { supabase } from '@/lib/supabase'
import { assertNoError } from '@/lib/supabase-utils'
import { buildCodeSearchFilter } from '@/lib/circuit-codes'

/** circuit_code_lookup 视图（migration 029）的一行：端口 + 编号 + 占用它的订单 */
export interface CircuitCodeMatch {
    circuit_id: string
    inventory_resource_id: string
    resource_id: string
    resource_ref: string | null
    circuit_number: number
    capacity: number
    interface_name: string | null
    status: string
    supplier_sr: string | null
    supplier_sr_old: string | null
    supplier_service_id: string | null
    juno_circuit_id: string | null
    xc_sr: string | null
    order_id: string | null
    order_ref: string | null
    order_status: string | null
    customer_name: string | null
    is_sellable: boolean
}

/** 按 SR / 旧 SR / Service ID / JOC / XC / OB / SO / 成本单号 任一编号查端口 */
export async function searchCircuitsByCode(query: string): Promise<CircuitCodeMatch[]> {
    const { data, error } = await supabase
        .from('circuit_code_lookup')
        .select('circuit_id, inventory_resource_id, resource_id, resource_ref, circuit_number, capacity, interface_name, status, supplier_sr, supplier_sr_old, supplier_service_id, juno_circuit_id, xc_sr, order_id, order_ref, order_status, customer_name, is_sellable')
        .or(buildCodeSearchFilter(query))
        .order('resource_id')
        .order('circuit_number')
        .limit(50)

    assertNoError(error, 'Failed to search circuits by code')
    return (data ?? []) as CircuitCodeMatch[]
}
