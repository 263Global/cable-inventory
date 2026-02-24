import { supabase } from '@/lib/supabase'
import { assertNoError } from '@/lib/supabase-utils'
import type { InventoryResource } from '@/types'
import {
    inventoryResourceSelect,
    type InventoryResourceQueryRow,
    type InventoryResourceWritePayload,
    mapInventoryResourceRow,
    pickRelation,
    type ResourceSalesOrderRow,
} from '@/features/inventory/api/shared'

export async function fetchCountryIdByName(name: string): Promise<string> {
    const { data, error } = await supabase
        .from('countries')
        .select('id')
        .eq('name', name)
        .single()
    assertNoError(error, `Failed to load country ID for ${name}`)

    if (!data?.id) {
        throw new Error(`Country not found: ${name}`)
    }

    return data.id
}

export async function fetchInventoryResources(typeFilter?: string): Promise<InventoryResource[]> {
    let query = supabase
        .from('inventory_resources')
        .select(inventoryResourceSelect)
        .order('created_at', { ascending: false })

    if (typeFilter) {
        query = query.eq('type', typeFilter)
    }

    const { data, error } = await query
    assertNoError(error, 'Failed to load inventory resources')

    const rows = (data ?? []) as InventoryResourceQueryRow[]
    return rows.map(mapInventoryResourceRow)
}

export async function fetchInventoryById(id: string): Promise<InventoryResource | null> {
    const { data, error } = await supabase
        .from('inventory_resources')
        .select(inventoryResourceSelect)
        .eq('id', id)
        .single()

    assertNoError(error, 'Failed to load inventory resource')
    if (!data) return null

    return mapInventoryResourceRow(data as InventoryResourceQueryRow)
}

export async function createInventoryResource(resource: InventoryResourceWritePayload): Promise<{ id: string }> {
    const { data, error } = await supabase
        .from('inventory_resources')
        .insert({ ...resource, status: 'Available', used_capacity: 0 })
        .select()
        .single()

    assertNoError(error, 'Failed to create inventory resource')
    if (!data?.id) {
        throw new Error('Failed to create inventory resource: missing id')
    }

    return { id: data.id }
}

export async function updateInventoryResource(id: string, updates: InventoryResourceWritePayload) {
    const { error } = await supabase
        .from('inventory_resources')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
    assertNoError(error, 'Failed to update inventory resource')
}

export async function checkResourceDeletable(resourceId: string): Promise<{
    status: 'ok' | 'warn' | 'blocked'
    activeOrders: string[]
    otherOrders: string[]
}> {
    const { data, error } = await supabase
        .from('sales_order_items')
        .select('sales_orders!inner(order_id, status)')
        .eq('inventory_resource_id', resourceId)
    assertNoError(error, 'Failed to check resource deletable state')

    const activeOrders: string[] = []
    const otherOrders: string[] = []
    const rows = (data ?? []) as ResourceSalesOrderRow[]

    for (const row of rows) {
        const order = pickRelation(row.sales_orders)
        if (!order) continue
        if (['Pre-sold', 'Active'].includes(order.status)) {
            if (!activeOrders.includes(order.order_id)) activeOrders.push(order.order_id)
        } else {
            if (!otherOrders.includes(order.order_id)) otherOrders.push(order.order_id)
        }
    }

    if (activeOrders.length > 0) return { status: 'blocked', activeOrders, otherOrders }
    if (otherOrders.length > 0) return { status: 'warn', activeOrders, otherOrders }
    return { status: 'ok', activeOrders, otherOrders }
}

export async function deleteInventoryResource(id: string) {
    const { error } = await supabase
        .from('inventory_resources')
        .delete()
        .eq('id', id)
    assertNoError(error, 'Failed to delete inventory resource')
}
