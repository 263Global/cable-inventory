import { todayDateOnly } from '@/lib/contract-utils'
import { supabase } from '@/lib/supabase'
import { assertNoError } from '@/lib/supabase-utils'
import type { SalesOrder } from '@/types'
import { recalcForOrder, recalcInventoryCapacity } from './capacity'
import { deallocateCircuits, syncCircuitStatuses } from './circuits'

export async function syncOrderStatuses(): Promise<number> {
    const today = todayDateOnly()
    let transitioned = 0

    const { data: presoldOrders, error: presoldError } = await supabase
        .from('sales_orders')
        .select('id, sales_order_items(start_date)')
        .eq('status', 'Pre-sold')
    assertNoError(presoldError, 'Failed to load Pre-sold orders for status sync')

    for (const order of (presoldOrders ?? [])) {
        const items = order.sales_order_items as { start_date: string | null }[] | null
        const hasStarted = items?.some((item) => item.start_date && item.start_date <= today)
        if (!hasStarted) continue

        const { error } = await supabase
            .from('sales_orders')
            .update({ status: 'Active', updated_at: new Date().toISOString() })
            .eq('id', order.id)
        assertNoError(error, 'Failed to transition order to Active')

        await syncCircuitStatuses(order.id, 'Active')
        await recalcForOrder(order.id)
        transitioned++
    }

    const { data: activeOrders, error: activeError } = await supabase
        .from('sales_orders')
        .select('id, sales_order_items(end_date)')
        .eq('status', 'Active')
    assertNoError(activeError, 'Failed to load Active orders for status sync')

    for (const order of (activeOrders ?? [])) {
        const items = order.sales_order_items as { end_date: string | null }[] | null
        if (!items || items.length === 0) continue

        const allExpired = items.every((item) => item.end_date && item.end_date < today)
        if (!allExpired) continue

        const { error } = await supabase
            .from('sales_orders')
            .update({ status: 'Expired', updated_at: new Date().toISOString() })
            .eq('id', order.id)
        assertNoError(error, 'Failed to transition order to Expired')

        await syncCircuitStatuses(order.id, 'Expired')
        await recalcForOrder(order.id)
        transitioned++
    }

    return transitioned
}

export async function fetchSalesOrders(): Promise<SalesOrder[]> {
    const { data, error } = await supabase
        .from('sales_orders')
        .select('*, customers(name)')
        .order('created_at', { ascending: false })

    assertNoError(error, 'Failed to load sales orders')
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

    assertNoError(error, 'Failed to load sales order')
    return data
        ? {
            ...data,
            customer_name: (data.customers as { name: string } | null)?.name ?? null,
        } as SalesOrder
        : null
}

// order_id is auto-assigned by DB trigger when omitted
export async function createSalesOrder(payload: {
    order_id?: string
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

    assertNoError(error, 'Failed to create sales order')
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

    assertNoError(error, 'Failed to update sales order')
    if (payload.status) {
        await syncCircuitStatuses(id, payload.status)
        await recalcForOrder(id)
    }
}

export async function deleteSalesOrder(id: string): Promise<void> {
    const { data: items, error: itemsError } = await supabase
        .from('sales_order_items')
        .select('id, inventory_resource_id')
        .eq('sales_order_id', id)
    assertNoError(itemsError, 'Failed to load sales order items before deletion')

    const affectedResourceIds = new Set<string>()
    for (const item of (items ?? [])) {
        if (item.inventory_resource_id) affectedResourceIds.add(item.inventory_resource_id as string)
        await deallocateCircuits(item.id as string)
    }

    const { error } = await supabase
        .from('sales_orders')
        .delete()
        .eq('id', id)
    assertNoError(error, 'Failed to delete sales order')

    await Promise.all([...affectedResourceIds].map(recalcInventoryCapacity))
}
