import { supabase } from '@/lib/supabase'
import type { SalesOrder, SalesOrderItem, SalesItemCircuit } from '@/types'

// ============================================
// Circuit Allocation
// ============================================

/** Allocate circuits to a sales order item and set their status */
export async function allocateCircuits(
    salesOrderItemId: string,
    circuitIds: string[],
    orderStatus: string,
): Promise<void> {
    if (circuitIds.length === 0) return

    // Insert junction rows
    const rows = circuitIds.map((cid) => ({
        sales_order_item_id: salesOrderItemId,
        inventory_circuit_id: cid,
    }))
    const { error } = await supabase.from('sales_item_circuits').insert(rows)
    if (error) throw error

    // Set circuit status based on order status
    const circuitStatus = ['Pre-sold', 'Active'].includes(orderStatus) ? 'Allocated' : 'Reserved'
    await supabase
        .from('inventory_circuits')
        .update({ status: circuitStatus, updated_at: new Date().toISOString() })
        .in('id', circuitIds)
}

/** Deallocate all circuits from a sales order item */
export async function deallocateCircuits(salesOrderItemId: string): Promise<string[]> {
    // Get circuit IDs before deleting
    const { data: links } = await supabase
        .from('sales_item_circuits')
        .select('inventory_circuit_id')
        .eq('sales_order_item_id', salesOrderItemId)

    const circuitIds = (links ?? []).map(l => l.inventory_circuit_id as string)

    if (circuitIds.length > 0) {
        // Remove junction rows
        await supabase.from('sales_item_circuits').delete().eq('sales_order_item_id', salesOrderItemId)

        // Reset circuit status to Available
        await supabase
            .from('inventory_circuits')
            .update({ status: 'Available', updated_at: new Date().toISOString() })
            .in('id', circuitIds)
    }

    return circuitIds
}

/** Fetch allocated circuit IDs for a sales order item */
export async function fetchAllocatedCircuits(salesOrderItemId: string): Promise<SalesItemCircuit[]> {
    const { data, error } = await supabase
        .from('sales_item_circuits')
        .select('id, sales_order_item_id, inventory_circuit_id, inventory_circuits(circuit_number, capacity, status, current_interface_type_id, current_type:interface_types!inventory_circuits_current_interface_type_id_fkey(name))')
        .eq('sales_order_item_id', salesOrderItemId)

    if (error) throw error
    return (data ?? []).map((row: Record<string, unknown>) => {
        const c = row.inventory_circuits as { circuit_number: number; capacity: number; status: string; current_type: { name: string } | null } | null
        return {
            id: row.id as string,
            sales_order_item_id: row.sales_order_item_id as string,
            inventory_circuit_id: row.inventory_circuit_id as string,
            circuit_number: c?.circuit_number,
            capacity: c?.capacity,
            interface_type_name: c?.current_type?.name ?? undefined,
            status: c?.status,
        }
    })
}

// ============================================
// Capacity Occupation Sync
// ============================================

/** Recalculate used_capacity on an inventory_resource from allocated circuits + legacy items */
export async function recalcInventoryCapacity(inventoryResourceId: string): Promise<void> {
    // Strategy 1: Circuit-level — sum capacity from circuits in sales_item_circuits
    const { data: circuits } = await supabase
        .from('inventory_circuits')
        .select('id, capacity, sales_item_circuits!inner(sales_order_item_id, sales_order_items!inner(sales_orders!inner(status)))')
        .eq('inventory_resource_id', inventoryResourceId)

    let usedCapacity = 0
    const itemsWithCircuits = new Set<string>()
    for (const c of (circuits ?? []) as Record<string, unknown>[]) {
        const links = c.sales_item_circuits as { sales_order_item_id: string; sales_order_items: { sales_orders: { status: string } } }[] | undefined
        if (links && links.length > 0) {
            const orderStatus = links[0]?.sales_order_items?.sales_orders?.status
            if (orderStatus === 'Pre-sold' || orderStatus === 'Active') {
                usedCapacity += Number(c.capacity) || 0
            }
            itemsWithCircuits.add(links[0].sales_order_item_id)
        }
    }

    // Strategy 2: Legacy fallback — items linked to this resource without circuit allocations
    const { data: legacyItems } = await supabase
        .from('sales_order_items')
        .select('id, capacity, sales_orders!inner(status)')
        .eq('inventory_resource_id', inventoryResourceId)
        .in('sales_orders.status', ['Pre-sold', 'Active'])

    for (const item of (legacyItems ?? []) as Record<string, unknown>[]) {
        if (!itemsWithCircuits.has(item.id as string)) {
            usedCapacity += Number(item.capacity) || 0
        }
    }

    // Get total capacity for status calculation
    const { data: resource } = await supabase
        .from('inventory_resources')
        .select('total_capacity')
        .eq('id', inventoryResourceId)
        .single()

    const total = Number(resource?.total_capacity) || 0
    let status = 'Available'
    if (total > 0 && usedCapacity >= total) status = 'Fully Used'
    else if (usedCapacity > 0) status = 'Partially Used'

    await supabase
        .from('inventory_resources')
        .update({ used_capacity: usedCapacity, status, updated_at: new Date().toISOString() })
        .eq('id', inventoryResourceId)
}

/** Recalc capacity for all inventory resources linked to a sales order */
async function recalcForOrder(salesOrderId: string): Promise<void> {
    const { data: items } = await supabase
        .from('sales_order_items')
        .select('inventory_resource_id')
        .eq('sales_order_id', salesOrderId)
        .not('inventory_resource_id', 'is', null)

    const ids = [...new Set((items ?? []).map(i => i.inventory_resource_id as string))]
    await Promise.all(ids.map(recalcInventoryCapacity))
}

/** Sync circuit statuses when order status changes */
async function syncCircuitStatuses(salesOrderId: string, newStatus: string): Promise<void> {
    // Get all item IDs for this order
    const { data: items } = await supabase
        .from('sales_order_items')
        .select('id')
        .eq('sales_order_id', salesOrderId)

    if (!items || items.length === 0) return
    const itemIds = items.map(i => i.id as string)

    // Get all circuit IDs linked to these items
    const { data: links } = await supabase
        .from('sales_item_circuits')
        .select('inventory_circuit_id')
        .in('sales_order_item_id', itemIds)

    if (!links || links.length === 0) return
    const circuitIds = links.map(l => l.inventory_circuit_id as string)

    if (['Pre-sold', 'Active'].includes(newStatus)) {
        // Allocate
        await supabase
            .from('inventory_circuits')
            .update({ status: 'Allocated', updated_at: new Date().toISOString() })
            .in('id', circuitIds)
    } else if (['Expired', 'Terminated', 'Cancelled'].includes(newStatus)) {
        // Release — also remove junction rows
        await supabase.from('sales_item_circuits').delete().in('sales_order_item_id', itemIds)
        await supabase
            .from('inventory_circuits')
            .update({ status: 'Available', updated_at: new Date().toISOString() })
            .in('id', circuitIds)
    } else {
        // Draft → Reserved
        await supabase
            .from('inventory_circuits')
            .update({ status: 'Reserved', updated_at: new Date().toISOString() })
            .in('id', circuitIds)
    }
}

/** Auto-transition order statuses based on dates:
 *  - Pre-sold → Active when today >= earliest item start_date
 *  - Active → Expired when today > latest item end_date
 *  Runs on Sales list page load. */
export async function syncOrderStatuses(): Promise<number> {
    const today = new Date().toISOString().split('T')[0]  // YYYY-MM-DD
    let transitioned = 0

    // Pre-sold → Active: orders where any item has start_date <= today
    const { data: presoldOrders } = await supabase
        .from('sales_orders')
        .select('id, sales_order_items(start_date)')
        .eq('status', 'Pre-sold')

    for (const order of (presoldOrders ?? [])) {
        const items = order.sales_order_items as { start_date: string | null }[] | null
        const hasStarted = items?.some(i => i.start_date && i.start_date <= today)
        if (hasStarted) {
            await supabase.from('sales_orders').update({ status: 'Active', updated_at: new Date().toISOString() }).eq('id', order.id)
            await syncCircuitStatuses(order.id, 'Active')
            await recalcForOrder(order.id)
            transitioned++
        }
    }

    // Active → Expired: orders where ALL items have end_date < today
    const { data: activeOrders } = await supabase
        .from('sales_orders')
        .select('id, sales_order_items(end_date)')
        .eq('status', 'Active')

    for (const order of (activeOrders ?? [])) {
        const items = order.sales_order_items as { end_date: string | null }[] | null
        if (!items || items.length === 0) continue
        const allExpired = items.every(i => i.end_date && i.end_date < today)
        if (allExpired) {
            await supabase.from('sales_orders').update({ status: 'Expired', updated_at: new Date().toISOString() }).eq('id', order.id)
            await syncCircuitStatuses(order.id, 'Expired')
            await recalcForOrder(order.id)
            transitioned++
        }
    }

    return transitioned
}

// ============================================
// Sales Orders
// ============================================

export async function fetchSalesOrders(): Promise<SalesOrder[]> {
    const { data, error } = await supabase
        .from('sales_orders')
        .select('*, customers(name)')
        .order('created_at', { ascending: false })

    if (error) throw error
    return (data ?? []).map((row: Record<string, unknown>) => ({
        ...row,
        customer_name: (row.customers as { name: string } | null)?.name ?? null,
    })) as SalesOrder[]
}

export async function fetchSalesOrderById(id: string): Promise<SalesOrder | null> {
    const { data, error } = await supabase
        .from('sales_orders')
        .select('*, customers(name)')
        .eq('id', id)
        .single()

    if (error) throw error
    return data ? {
        ...data,
        customer_name: (data.customers as { name: string } | null)?.name ?? null,
    } as SalesOrder : null
}

export async function generateOrderId(): Promise<string> {
    const { data } = await supabase
        .from('sales_orders')
        .select('order_id')
        .order('created_at', { ascending: false })
        .limit(1)

    const last = data?.[0]?.order_id
    const lastNum = last ? parseInt(last.replace('SO-', ''), 10) : 0
    const next = lastNum + 1
    return `SO-${String(next).padStart(5, '0')}`
}

export async function createSalesOrder(payload: {
    order_id: string
    internal_ref?: string
    customer_id: string
    status: string
    notes?: string
}): Promise<SalesOrder> {
    const { data, error } = await supabase
        .from('sales_orders')
        .insert(payload)
        .select()
        .single()

    if (error) throw error
    return data as SalesOrder
}

export async function updateSalesOrder(id: string, payload: Partial<{
    internal_ref: string
    customer_id: string
    status: string
    notes: string
}>): Promise<void> {
    const { error } = await supabase
        .from('sales_orders')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id)

    if (error) throw error
    // Sync circuit statuses and recalc capacity when status changes
    if (payload.status) {
        await syncCircuitStatuses(id, payload.status)
        await recalcForOrder(id)
    }
}

export async function deleteSalesOrder(id: string): Promise<void> {
    // Collect affected resources and deallocate circuits before cascade delete
    const { data: items } = await supabase
        .from('sales_order_items')
        .select('id, inventory_resource_id')
        .eq('sales_order_id', id)

    const affectedResourceIds = new Set<string>()
    for (const item of (items ?? [])) {
        if (item.inventory_resource_id) affectedResourceIds.add(item.inventory_resource_id as string)
        await deallocateCircuits(item.id as string)
    }

    const { error } = await supabase
        .from('sales_orders')
        .delete()
        .eq('id', id)

    if (error) throw error

    // Recalc after deletion
    await Promise.all([...affectedResourceIds].map(recalcInventoryCapacity))
}

// ============================================
// Sales Order Items
// ============================================

export async function fetchOrderItems(salesOrderId: string): Promise<SalesOrderItem[]> {
    const { data, error } = await supabase
        .from('sales_order_items')
        .select('*, inventory_resources(resource_id, cable_system_id, cable_system:cable_systems(name))')
        .eq('sales_order_id', salesOrderId)
        .order('created_at', { ascending: true })

    if (error) throw error
    const items = (data ?? []).map((row: Record<string, unknown>) => {
        const inv = row.inventory_resources as { resource_id: string; cable_system_id: string | null; cable_system: { name: string } | null } | null
        return {
            ...row,
            resource_id: inv?.resource_id ?? null,
            cable_system_name: inv?.cable_system?.name ?? null,
        }
    }) as SalesOrderItem[]

    // Load allocated circuits for each item
    for (const item of items) {
        item.allocated_circuits = await fetchAllocatedCircuits(item.id)
    }

    return items
}

export async function createOrderItem(payload: {
    sales_order_id: string
    type: string
    inventory_resource_id?: string
    description?: string
    disposal_type?: string
    capacity?: number
    spec?: string
    start_date?: string
    end_date?: string
    term_months?: number
    sell_otc?: number
    sell_mrc?: number
    sell_nrc?: number
    sell_om_rate?: number
    sell_annual_om?: number
    status?: string
}): Promise<SalesOrderItem> {
    const { data, error } = await supabase
        .from('sales_order_items')
        .insert(payload)
        .select()
        .single()

    if (error) throw error
    return data as SalesOrderItem
}

export async function updateOrderItem(id: string, payload: Record<string, unknown>): Promise<void> {
    const { error } = await supabase
        .from('sales_order_items')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id)

    if (error) throw error
}

export async function deleteOrderItem(id: string): Promise<void> {
    // Get inventory_resource_id before delete
    const { data: item } = await supabase
        .from('sales_order_items')
        .select('inventory_resource_id')
        .eq('id', id)
        .single()

    // Deallocate circuits first
    await deallocateCircuits(id)

    const { error } = await supabase
        .from('sales_order_items')
        .delete()
        .eq('id', id)

    if (error) throw error

    // Recalc after deletion
    if (item?.inventory_resource_id) {
        await recalcInventoryCapacity(item.inventory_resource_id as string)
    }
}
