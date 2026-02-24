import { supabase } from '@/lib/supabase'
import { assertNoError } from '@/lib/supabase-utils'
import type { SalesOrderItem } from '@/types'
import { recalcInventoryCapacity } from './capacity'
import { deallocateCircuits } from './circuits'
import { fetchAllocatedCircuitsMap } from './shared'

type MaybeRelation<T> = T | T[] | null

interface SalesOrderItemResourceRow extends Omit<SalesOrderItem, 'resource_id' | 'cable_system_name' | 'allocated_circuits'> {
    inventory_resources: MaybeRelation<{
        resource_id: string
        cable_system_id: string | null
        cable_system: MaybeRelation<{ name: string }>
    }>
}

interface SalesOrderItemLinkRow {
    inventory_resource_id: string | null
}

export interface OrderItemWritePayload {
    type: string
    inventory_resource_id?: string
    description?: string
    disposal_type?: string | null
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
}

function pickRelation<T>(value: MaybeRelation<T> | undefined): T | null {
    if (Array.isArray(value)) return value[0] ?? null
    return value ?? null
}

export async function fetchOrderItems(salesOrderId: string): Promise<SalesOrderItem[]> {
    const { data, error } = await supabase
        .from('sales_order_items')
        .select('*, inventory_resources(resource_id, cable_system_id, cable_system:cable_systems(name))')
        .eq('sales_order_id', salesOrderId)
        .order('created_at', { ascending: true })

    assertNoError(error, 'Failed to load sales order items')
    const rows = (data ?? []) as SalesOrderItemResourceRow[]
    const items: SalesOrderItem[] = rows.map((row) => {
        const inventory = pickRelation(row.inventory_resources)
        const cableSystem = pickRelation(inventory?.cable_system)
        return {
            ...row,
            resource_id: inventory?.resource_id ?? undefined,
            cable_system_name: cableSystem?.name ?? undefined,
        }
    })

    const itemIds = items.map((item) => item.id)
    const circuitMap = await fetchAllocatedCircuitsMap(itemIds)
    for (const item of items) {
        item.allocated_circuits = circuitMap.get(item.id) ?? []
    }

    return items
}

export async function createOrderItem(payload: {
    sales_order_id: string
} & OrderItemWritePayload): Promise<SalesOrderItem> {
    const { data, error } = await supabase
        .from('sales_order_items')
        .insert(payload)
        .select()
        .single()

    assertNoError(error, 'Failed to create sales order item')
    return data as SalesOrderItem
}

export async function updateOrderItem(id: string, payload: OrderItemWritePayload): Promise<void> {
    const { error } = await supabase
        .from('sales_order_items')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id)

    assertNoError(error, 'Failed to update sales order item')
}

export async function deleteOrderItem(id: string): Promise<void> {
    const { data: item, error: itemError } = await supabase
        .from('sales_order_items')
        .select('inventory_resource_id')
        .eq('id', id)
        .single()
    assertNoError(itemError, 'Failed to load sales order item before deletion')

    await deallocateCircuits(id)

    const { error } = await supabase
        .from('sales_order_items')
        .delete()
        .eq('id', id)
    assertNoError(error, 'Failed to delete sales order item')

    const linkedItem = item as SalesOrderItemLinkRow | null
    if (linkedItem?.inventory_resource_id) {
        await recalcInventoryCapacity(linkedItem.inventory_resource_id)
    }
}
