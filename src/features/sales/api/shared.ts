import { supabase } from '@/lib/supabase'
import { assertNoError } from '@/lib/supabase-utils'
import type { SalesItemCircuit } from '@/types'

type SalesItemCircuitRow = Record<string, unknown>

function mapSalesItemCircuitRow(row: SalesItemCircuitRow): SalesItemCircuit {
    const c = row.inventory_circuits as {
        circuit_number: number
        capacity: number
        status: string
        current_type: { name: string } | null
    } | null

    return {
        id: row.id as string,
        sales_order_item_id: row.sales_order_item_id as string,
        inventory_circuit_id: row.inventory_circuit_id as string,
        circuit_number: c?.circuit_number,
        capacity: c?.capacity,
        interface_type_name: c?.current_type?.name ?? undefined,
        status: c?.status,
    }
}

export async function fetchAllocatedCircuitsMap(
    salesOrderItemIds: string[],
): Promise<Map<string, SalesItemCircuit[]>> {
    const mapped = new Map<string, SalesItemCircuit[]>()
    if (salesOrderItemIds.length === 0) return mapped

    const { data, error } = await supabase
        .from('sales_item_circuits')
        .select('id, sales_order_item_id, inventory_circuit_id, inventory_circuits(circuit_number, capacity, status, current_interface_type_id, current_type:interface_types!inventory_circuits_current_interface_type_id_fkey(name))')
        .in('sales_order_item_id', salesOrderItemIds)

    assertNoError(error, 'Failed to load allocated circuits')

    for (const row of (data ?? []) as SalesItemCircuitRow[]) {
        const key = row.sales_order_item_id as string
        const arr = mapped.get(key)
        const mappedRow = mapSalesItemCircuitRow(row)
        if (arr) {
            arr.push(mappedRow)
        } else {
            mapped.set(key, [mappedRow])
        }
    }

    return mapped
}
