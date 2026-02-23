import { supabase } from '@/lib/supabase'
import type { SalesOrder, SalesOrderItem } from '@/types'

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
}

export async function deleteSalesOrder(id: string): Promise<void> {
    const { error } = await supabase
        .from('sales_orders')
        .delete()
        .eq('id', id)

    if (error) throw error
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
    const { error } = await supabase
        .from('sales_order_items')
        .delete()
        .eq('id', id)

    if (error) throw error
}
