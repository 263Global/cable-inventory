import { supabase } from '@/lib/supabase'
import { assertNoError } from '@/lib/supabase-utils'
import { pickRelation, type LinkedSalesItemRow } from '@/features/inventory/api/shared'
import { deriveContractState, type ContractState, type DerivedContractState } from '@/lib/contract-state'

export interface LinkedSalesItem {
    id: string
    sales_order_id: string
    order_id: string
    customer_name: string | null
    capacity: number | null
    disposal_type: string | null
    status: string
    order_status: string
    end_date: string | null
    sell_mrc: number | null
    /** 有效合同状态（滚动续期 / 软占用，migration 028） */
    contract: DerivedContractState
    circuit_ids: string[]
    circuit_numbers: number[]
}

interface LinkedSalesContractRow extends LinkedSalesItemRow {
    end_date: string | null
    sell_mrc: number | null
    terminated_at: string | null
    contract_state: ContractState | null
    rolling_since: string | null
    notice_period_days: number | null
    notice_given_at: string | null
    sales_item_circuits: { inventory_circuit_id: string; inventory_circuits: { circuit_number: number } | { circuit_number: number }[] | null }[] | null
}

export async function fetchLinkedSalesItems(resourceId: string): Promise<LinkedSalesItem[]> {
    const { data, error } = await supabase
        .from('sales_order_items')
        .select('id, sales_order_id, capacity, disposal_type, status, end_date, sell_mrc, terminated_at, contract_state, rolling_since, notice_period_days, notice_given_at, sales_orders(order_id, status, customers(name)), sales_item_circuits(inventory_circuit_id, inventory_circuits(circuit_number))')
        .eq('inventory_resource_id', resourceId)
    assertNoError(error, 'Failed to load linked sales items')

    const rows = (data ?? []) as unknown as LinkedSalesContractRow[]
    return rows.map((row) => {
        const salesOrder = pickRelation(row.sales_orders)
        const customer = pickRelation(salesOrder?.customers)
        return {
            id: row.id,
            sales_order_id: row.sales_order_id,
            order_id: salesOrder?.order_id ?? '',
            customer_name: customer?.name ?? null,
            capacity: row.capacity,
            disposal_type: row.disposal_type,
            status: row.status,
            order_status: salesOrder?.status ?? '',
            end_date: row.end_date,
            sell_mrc: row.sell_mrc,
            contract: deriveContractState(row, salesOrder?.status),
            circuit_ids: (row.sales_item_circuits ?? []).map((link) => link.inventory_circuit_id),
            circuit_numbers: (row.sales_item_circuits ?? [])
                .map((link) => pickRelation(link.inventory_circuits)?.circuit_number)
                .filter((n): n is number => typeof n === 'number')
                .sort((a, b) => a - b),
        }
    })
}

export async function checkLinkedSalesOrders(resourceId: string): Promise<{
    activeOrders: { order_id: string; customer_name: string | null }[]
    allocatedCircuitCount: number
}> {
    const { data: items, error: itemsError } = await supabase
        .from('sales_order_items')
        .select('sales_orders!inner(order_id, status, customers(name))')
        .eq('inventory_resource_id', resourceId)
    assertNoError(itemsError, 'Failed to load linked sales orders')

    const seen = new Set<string>()
    const activeOrders: { order_id: string; customer_name: string | null }[] = []
    const rows = (items ?? []) as LinkedSalesItemRow[]

    for (const row of rows) {
        const order = pickRelation(row.sales_orders)
        if (!order) continue
        const customer = pickRelation(order.customers)
        if (['Pre-sold', 'Active'].includes(order.status) && !seen.has(order.order_id)) {
            seen.add(order.order_id)
            activeOrders.push({
                order_id: order.order_id,
                customer_name: customer?.name ?? null,
            })
        }
    }

    const { data: circuits, error: circuitsError } = await supabase
        .from('inventory_circuits')
        .select('id')
        .eq('inventory_resource_id', resourceId)
        .eq('status', 'Allocated')
    assertNoError(circuitsError, 'Failed to load allocated circuits')

    return { activeOrders, allocatedCircuitCount: circuits?.length ?? 0 }
}
