import { supabase } from '@/lib/supabase'
import { assertNoError } from '@/lib/supabase-utils'
import type { InventoryResource } from '@/types'

export interface LinkedSalesItem {
    id: string
    sales_order_id: string
    order_id: string
    customer_name: string | null
    capacity: number | null
    disposal_type: string | null
    status: string
    order_status: string
}

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
    return data.id as string
}

export async function fetchLinkedSalesItems(resourceId: string): Promise<LinkedSalesItem[]> {
    const { data, error } = await supabase
        .from('sales_order_items')
        .select('id, sales_order_id, capacity, disposal_type, status, sales_orders(order_id, status, customers(name))')
        .eq('inventory_resource_id', resourceId)
    assertNoError(error, 'Failed to load linked sales items')

    return (data ?? []).map((row: Record<string, unknown>) => {
        const so = row.sales_orders as { order_id: string; status: string; customers: { name: string } | null } | null
        return {
            id: row.id as string,
            sales_order_id: row.sales_order_id as string,
            order_id: so?.order_id ?? '',
            customer_name: so?.customers?.name ?? null,
            capacity: row.capacity as number | null,
            disposal_type: row.disposal_type as string | null,
            status: row.status as string,
            order_status: so?.status ?? '',
        }
    })
}

// Fetch all inventory resources with joined names
export async function fetchInventoryResources(typeFilter?: string): Promise<InventoryResource[]> {
    let query = supabase
        .from('inventory_resources')
        .select(`
      *,
      cable_system:cable_systems(name),
      supplier:suppliers(name),
      country_a:countries!country_a_id(name),
      country_z:countries!country_z_id(name),
      landing_station_a:landing_stations!landing_station_a_id(name),
      landing_station_z:landing_stations!landing_station_z_id(name),
      handover_a:handover_locations!handover_location_a_id(name, city),
      handover_z:handover_locations!handover_location_z_id(name, city)
    `)
        .order('created_at', { ascending: false })

    if (typeFilter) {
        query = query.eq('type', typeFilter)
    }

    const { data, error } = await query

    assertNoError(error, 'Failed to load inventory resources')

    return (data ?? []).map((r) => ({
        ...r,
        cable_system_name: (r.cable_system as { name: string } | null)?.name ?? null,
        supplier_name: (r.supplier as { name: string } | null)?.name ?? null,
        country_a: (r.country_a as { name: string } | null)?.name ?? null,
        country_z: (r.country_z as { name: string } | null)?.name ?? null,
        landing_station_a_name: (r.landing_station_a as { name: string } | null)?.name ?? null,
        landing_station_z_name: (r.landing_station_z as { name: string } | null)?.name ?? null,
        handover_a_name: (r.handover_a as { name: string; city: string } | null)?.name ?? null,
        handover_z_name: (r.handover_z as { name: string; city: string } | null)?.name ?? null,
    })) as InventoryResource[]
}

// Fetch single inventory resource by UUID
export async function fetchInventoryById(id: string): Promise<InventoryResource | null> {
    const { data, error } = await supabase
        .from('inventory_resources')
        .select(`
      *,
      cable_system:cable_systems(name),
      supplier:suppliers(name),
      country_a:countries!country_a_id(name),
      country_z:countries!country_z_id(name),
      landing_station_a:landing_stations!landing_station_a_id(name),
      landing_station_z:landing_stations!landing_station_z_id(name),
      handover_a:handover_locations!handover_location_a_id(name, city),
      handover_z:handover_locations!handover_location_z_id(name, city)
    `)
        .eq('id', id)
        .single()

    assertNoError(error, 'Failed to load inventory resource')
    if (!data) return null

    return {
        ...data,
        cable_system_name: (data.cable_system as { name: string } | null)?.name ?? null,
        supplier_name: (data.supplier as { name: string } | null)?.name ?? null,
        country_a: (data.country_a as { name: string } | null)?.name ?? null,
        country_z: (data.country_z as { name: string } | null)?.name ?? null,
        landing_station_a_name: (data.landing_station_a as { name: string } | null)?.name ?? null,
        landing_station_z_name: (data.landing_station_z as { name: string } | null)?.name ?? null,
        handover_a_name: (data.handover_a as { name: string; city: string } | null)?.name ?? null,
        handover_z_name: (data.handover_z as { name: string; city: string } | null)?.name ?? null,
    } as InventoryResource
}

// Create (resource_id is auto-assigned by DB trigger)
export async function createInventoryResource(resource: Record<string, unknown>) {
    const { data, error } = await supabase
        .from('inventory_resources')
        .insert({ ...resource, status: 'Available', used_capacity: 0 })
        .select()
        .single()

    assertNoError(error, 'Failed to create inventory resource')
    return data
}

// Update
export async function updateInventoryResource(id: string, updates: Record<string, unknown>) {
    const { data, error } = await supabase
        .from('inventory_resources')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
    assertNoError(error, 'Failed to update inventory resource')
    return data
}

// Delete
/** Check if a resource can be deleted. Returns status + linked order info. */
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
    for (const item of (data ?? [])) {
        const order = item.sales_orders as unknown as { order_id: string; status: string }
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

// ============================================
// Terminate / Renew
// ============================================

/** Check linked active sales orders for a resource (for termination warning) */
export async function checkLinkedSalesOrders(resourceId: string): Promise<{
    activeOrders: { order_id: string; customer_name: string | null }[]
    allocatedCircuitCount: number
}> {
    // Linked sales orders
    const { data: items, error: itemsError } = await supabase
        .from('sales_order_items')
        .select('sales_orders!inner(order_id, status, customers(name))')
        .eq('inventory_resource_id', resourceId)
    assertNoError(itemsError, 'Failed to load linked sales orders')

    const seen = new Set<string>()
    const activeOrders: { order_id: string; customer_name: string | null }[] = []
    for (const item of (items ?? [])) {
        const order = item.sales_orders as unknown as { order_id: string; status: string; customers: { name: string } | null }
        if (['Pre-sold', 'Active'].includes(order.status) && !seen.has(order.order_id)) {
            seen.add(order.order_id)
            activeOrders.push({
                order_id: order.order_id,
                customer_name: order.customers?.name ?? null,
            })
        }
    }

    // Allocated circuits
    const { data: circuits, error: circuitsError } = await supabase
        .from('inventory_circuits')
        .select('id')
        .eq('inventory_resource_id', resourceId)
        .eq('status', 'Allocated')
    assertNoError(circuitsError, 'Failed to load allocated circuits')

    return { activeOrders, allocatedCircuitCount: circuits?.length ?? 0 }
}

/** Terminate an inventory resource — cascade release circuits and clear allocations */
export async function terminateInventoryResource(
    id: string,
    terminatedAt: string,
    reason: string,
): Promise<void> {
    const now = new Date().toISOString()

    // 1. Release all circuits (set to Available, remove sales_item_circuits links)
    const { data: circuits, error: circuitsError } = await supabase
        .from('inventory_circuits')
        .select('id')
        .eq('inventory_resource_id', id)
        .in('status', ['Allocated', 'Reserved'])
    assertNoError(circuitsError, 'Failed to load resource circuits for termination')

    if (circuits && circuits.length > 0) {
        const circuitIds = circuits.map(c => c.id as string)
        // Remove from sales_item_circuits junction
        const { error: deleteLinksError } = await supabase
            .from('sales_item_circuits')
            .delete()
            .in('inventory_circuit_id', circuitIds)
        assertNoError(deleteLinksError, 'Failed to clear circuit allocations during termination')
        // Reset status
        const { error: resetCircuitError } = await supabase
            .from('inventory_circuits')
            .update({ status: 'Available', updated_at: now })
            .in('id', circuitIds)
        assertNoError(resetCircuitError, 'Failed to reset circuits during termination')
    }

    // 2. Update resource
    const { error: updateError } = await supabase
        .from('inventory_resources')
        .update({
            status: 'Terminated',
            terminated_at: terminatedAt,
            termination_reason: reason || null,
            used_capacity: 0,
            updated_at: now,
        })
        .eq('id', id)
    assertNoError(updateError, 'Failed to terminate inventory resource')
}

/** Renew an inventory resource — snapshot old data then update dates/costs */
export async function renewInventoryResource(
    id: string,
    newStartDate: string,
    newTermMonths: number,
    newEndDate: string,
    costs?: { mrc?: number | null; nrc?: number | null; otc?: number | null; om_rate?: number | null },
): Promise<void> {
    const now = new Date().toISOString()

    // 1. Get current resource data for snapshot
    const { data: resource, error } = await supabase
        .from('inventory_resources')
        .select('*')
        .eq('id', id)
        .single()
    assertNoError(error, 'Failed to load inventory resource for renewal')

    if (!resource) throw new Error('Resource not found')

    // 2. Build snapshot
    const snapshot = {
        renewed_at: now,
        old_start_date: resource.start_date,
        old_end_date: resource.end_date,
        old_term_months: resource.term_months,
        old_mrc: resource.mrc,
        old_nrc: resource.nrc,
        old_otc: resource.otc,
        old_om_rate: resource.om_rate,
        old_status: resource.status,
    }

    const history = Array.isArray(resource.renewal_history) ? resource.renewal_history : []
    history.push(snapshot)

    // 3. Update resource
    const updates: Record<string, unknown> = {
        start_date: newStartDate,
        end_date: newEndDate,
        term_months: newTermMonths,
        status: 'Available',
        terminated_at: null,
        termination_reason: null,
        renewal_history: history,
        updated_at: now,
    }
    if (costs?.mrc !== undefined) updates.mrc = costs.mrc
    if (costs?.nrc !== undefined) updates.nrc = costs.nrc
    if (costs?.otc !== undefined) updates.otc = costs.otc
    if (costs?.om_rate !== undefined) updates.om_rate = costs.om_rate
    // Auto-calc annual O&M if OTC and rate provided
    if (costs?.otc != null && costs?.om_rate != null) {
        updates.annual_om_cost = (costs.otc * costs.om_rate) / 100
    }

    const { error: updateError } = await supabase
        .from('inventory_resources')
        .update(updates)
        .eq('id', id)
    assertNoError(updateError, 'Failed to renew inventory resource')
}
