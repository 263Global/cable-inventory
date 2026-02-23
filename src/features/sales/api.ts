import { supabase } from '@/lib/supabase'
import type { SalesOrder, SalesOrderItem } from '@/types'

// ============================================
// Capacity Occupation Sync
// ============================================

/** Recalculate used_capacity on an inventory_resource from linked sales items */
export async function recalcInventoryCapacity(inventoryResourceId: string): Promise<void> {
    // Sum capacity from items whose parent order is Pre-sold or Active
    const { data: items } = await supabase
        .from('sales_order_items')
        .select('capacity, sales_orders!inner(status)')
        .eq('inventory_resource_id', inventoryResourceId)
        .in('sales_orders.status', ['Pre-sold', 'Active'])

    const usedCapacity = (items ?? []).reduce((sum, row: Record<string, unknown>) => {
        return sum + (Number(row.capacity) || 0)
    }, 0)

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
    // Recalc capacity for all linked resources when status changes
    if (payload.status) {
        await recalcForOrder(id)
    }
}

export async function deleteSalesOrder(id: string): Promise<void> {
    // Collect affected inventory resources before cascade delete
    const { data: items } = await supabase
        .from('sales_order_items')
        .select('inventory_resource_id')
        .eq('sales_order_id', id)
        .not('inventory_resource_id', 'is', null)

    const affectedIds = [...new Set((items ?? []).map(i => i.inventory_resource_id as string))]

    const { error } = await supabase
        .from('sales_orders')
        .delete()
        .eq('id', id)

    if (error) throw error

    // Recalc after deletion
    await Promise.all(affectedIds.map(recalcInventoryCapacity))
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
    return (data ?? []).map((row: Record<string, unknown>) => {
        const inv = row.inventory_resources as { resource_id: string; cable_system_id: string | null; cable_system: { name: string } | null } | null
        return {
            ...row,
            resource_id: inv?.resource_id ?? null,
            cable_system_name: inv?.cable_system?.name ?? null,
        }
    }) as SalesOrderItem[]
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
    // Recalc capacity if item is linked to an inventory resource
    if (payload.inventory_resource_id) {
        await recalcInventoryCapacity(payload.inventory_resource_id)
    }
    return data as SalesOrderItem
}

export async function updateOrderItem(id: string, payload: Record<string, unknown>): Promise<void> {
    // Get old inventory_resource_id before update
    const { data: oldItem } = await supabase
        .from('sales_order_items')
        .select('inventory_resource_id')
        .eq('id', id)
        .single()

    const { error } = await supabase
        .from('sales_order_items')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id)

    if (error) throw error

    // Recalc for both old and new inventory resources
    const toRecalc = new Set<string>()
    if (oldItem?.inventory_resource_id) toRecalc.add(oldItem.inventory_resource_id as string)
    if (payload.inventory_resource_id) toRecalc.add(payload.inventory_resource_id as string)
    await Promise.all([...toRecalc].map(recalcInventoryCapacity))
}

export async function deleteOrderItem(id: string): Promise<void> {
    // Get inventory_resource_id before delete
    const { data: item } = await supabase
        .from('sales_order_items')
        .select('inventory_resource_id')
        .eq('id', id)
        .single()

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
