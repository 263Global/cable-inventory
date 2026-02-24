import { supabase } from '@/lib/supabase'
import { assertNoError } from '@/lib/supabase-utils'

type MaybeRelation<T> = T | T[] | null

interface CircuitAllocationLink {
    sales_order_item_id: string
    sales_order_items: MaybeRelation<{ sales_orders: MaybeRelation<{ status: string }> }>
}

interface CircuitCapacityRow {
    id: string
    capacity: number | null
    sales_item_circuits: MaybeRelation<CircuitAllocationLink>
}

interface LegacyItemRow {
    id: string
    capacity: number | null
}

function pickRelation<T>(value: MaybeRelation<T> | undefined): T | null {
    if (Array.isArray(value)) return value[0] ?? null
    return value ?? null
}

/** Recalculate used_capacity on an inventory_resource from allocated circuits + legacy items */
export async function recalcInventoryCapacity(inventoryResourceId: string): Promise<void> {
    const { data: circuits, error: circuitsError } = await supabase
        .from('inventory_circuits')
        .select('id, capacity, sales_item_circuits!inner(sales_order_item_id, sales_order_items!inner(sales_orders!inner(status)))')
        .eq('inventory_resource_id', inventoryResourceId)
    assertNoError(circuitsError, 'Failed to load inventory circuits for capacity recalculation')

    let usedCapacity = 0
    const itemsWithCircuits = new Set<string>()
    const circuitRows = (circuits ?? []) as CircuitCapacityRow[]
    for (const circuit of circuitRows) {
        const link = pickRelation(circuit.sales_item_circuits)
        if (link) {
            const salesItem = pickRelation(link.sales_order_items)
            const salesOrder = pickRelation(salesItem?.sales_orders)
            const orderStatus = salesOrder?.status
            if (orderStatus === 'Pre-sold' || orderStatus === 'Active') {
                usedCapacity += Number(circuit.capacity) || 0
            }
            itemsWithCircuits.add(link.sales_order_item_id)
        }
    }

    const { data: legacyItems, error: legacyItemsError } = await supabase
        .from('sales_order_items')
        .select('id, capacity, sales_orders!inner(status)')
        .eq('inventory_resource_id', inventoryResourceId)
        .in('sales_orders.status', ['Pre-sold', 'Active'])
    assertNoError(legacyItemsError, 'Failed to load legacy sales items for capacity recalculation')

    const legacyRows = (legacyItems ?? []) as LegacyItemRow[]
    for (const item of legacyRows) {
        if (!itemsWithCircuits.has(item.id)) {
            usedCapacity += Number(item.capacity) || 0
        }
    }

    const { data: resource, error: resourceError } = await supabase
        .from('inventory_resources')
        .select('total_capacity')
        .eq('id', inventoryResourceId)
        .single()
    assertNoError(resourceError, 'Failed to load inventory resource capacity')

    const total = Number(resource?.total_capacity) || 0
    let status = 'Available'
    if (total > 0 && usedCapacity >= total) status = 'Fully Used'
    else if (usedCapacity > 0) status = 'Partially Used'

    const { error: updateError } = await supabase
        .from('inventory_resources')
        .update({ used_capacity: usedCapacity, status, updated_at: new Date().toISOString() })
        .eq('id', inventoryResourceId)
    assertNoError(updateError, 'Failed to update inventory resource capacity')
}

/** Recalc capacity for all inventory resources linked to a sales order */
export async function recalcForOrder(salesOrderId: string): Promise<void> {
    const { data: items, error } = await supabase
        .from('sales_order_items')
        .select('inventory_resource_id')
        .eq('sales_order_id', salesOrderId)
        .not('inventory_resource_id', 'is', null)
    assertNoError(error, 'Failed to load sales order items for capacity recalculation')

    const ids = [...new Set((items ?? []).map((item) => item.inventory_resource_id as string))]
    await Promise.all(ids.map(recalcInventoryCapacity))
}
