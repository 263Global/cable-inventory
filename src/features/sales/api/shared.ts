import { supabase } from '@/lib/supabase'
import { assertNoError } from '@/lib/supabase-utils'
import type { SalesItemCircuit } from '@/types'

type MaybeRelation<T> = T | T[] | null

interface SalesItemCircuitRow {
    id: string
    sales_order_item_id: string
    inventory_circuit_id: string
    inventory_circuits: MaybeRelation<{
        circuit_number: number
        capacity: number
        status: string
        current_type: MaybeRelation<{ name: string }>
    }>
}

function pickRelation<T>(value: MaybeRelation<T> | undefined): T | null {
    if (Array.isArray(value)) return value[0] ?? null
    return value ?? null
}

function mapSalesItemCircuitRow(row: SalesItemCircuitRow): SalesItemCircuit {
    const circuit = pickRelation(row.inventory_circuits)
    const currentType = pickRelation(circuit?.current_type)

    return {
        id: row.id,
        sales_order_item_id: row.sales_order_item_id,
        inventory_circuit_id: row.inventory_circuit_id,
        circuit_number: circuit?.circuit_number,
        capacity: circuit?.capacity,
        interface_type_name: currentType?.name ?? undefined,
        status: circuit?.status,
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

    const rows = (data ?? []) as SalesItemCircuitRow[]
    for (const row of rows) {
        const key = row.sales_order_item_id
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
