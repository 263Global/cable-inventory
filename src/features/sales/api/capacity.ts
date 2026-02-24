import { supabase } from '@/lib/supabase'
import { assertNoError } from '@/lib/supabase-utils'

/** Recalculate used_capacity on an inventory_resource from allocated circuits + legacy items */
export async function recalcInventoryCapacity(inventoryResourceId: string): Promise<void> {
    const { data: circuits, error: circuitsError } = await supabase
        .from('inventory_circuits')
        .select('id, capacity, sales_item_circuits!inner(sales_order_item_id, sales_order_items!inner(sales_orders!inner(status)))')
        .eq('inventory_resource_id', inventoryResourceId)
    assertNoError(circuitsError, 'Failed to load inventory circuits for capacity recalculation')

    let usedCapacity = 0
    const itemsWithCircuits = new Set<string>()
    for (const circuit of (circuits ?? []) as Record<string, unknown>[]) {
        const links = circuit.sales_item_circuits as { sales_order_item_id: string; sales_order_items: { sales_orders: { status: string } } }[] | undefined
        if (links && links.length > 0) {
            const orderStatus = links[0]?.sales_order_items?.sales_orders?.status
            if (orderStatus === 'Pre-sold' || orderStatus === 'Active') {
                usedCapacity += Number(circuit.capacity) || 0
            }
            itemsWithCircuits.add(links[0].sales_order_item_id)
        }
    }

    const { data: legacyItems, error: legacyItemsError } = await supabase
        .from('sales_order_items')
        .select('id, capacity, sales_orders!inner(status)')
        .eq('inventory_resource_id', inventoryResourceId)
        .in('sales_orders.status', ['Pre-sold', 'Active'])
    assertNoError(legacyItemsError, 'Failed to load legacy sales items for capacity recalculation')

    for (const item of (legacyItems ?? []) as Record<string, unknown>[]) {
        if (!itemsWithCircuits.has(item.id as string)) {
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
