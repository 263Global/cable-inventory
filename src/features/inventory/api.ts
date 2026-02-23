import { supabase } from '@/lib/supabase'
import type { InventoryResource } from '@/types'

// Generate next resource ID (RES-XXXXX)
async function generateResourceId(): Promise<string> {
    const { data } = await supabase
        .from('inventory_resources')
        .select('resource_id')
        .order('resource_id', { ascending: false })
        .limit(1)

    if (!data || data.length === 0) return 'RES-10001'

    const lastNum = parseInt(data[0].resource_id.replace('RES-', ''), 10)
    return `RES-${String(lastNum + 1).padStart(5, '0')}`
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

    if (error) throw error

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

    if (error) throw error
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

// Create
export async function createInventoryResource(resource: Record<string, unknown>) {
    const resource_id = await generateResourceId()
    const { data, error } = await supabase
        .from('inventory_resources')
        .insert({ ...resource, resource_id, status: 'Available', used_capacity: 0 })
        .select()
        .single()

    if (error) throw error
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
    if (error) throw error
    return data
}

// Delete
/** Check if a resource can be deleted. Returns status + linked order info. */
export async function checkResourceDeletable(resourceId: string): Promise<{
    status: 'ok' | 'warn' | 'blocked'
    activeOrders: string[]
    otherOrders: string[]
}> {
    const { data } = await supabase
        .from('sales_order_items')
        .select('sales_orders!inner(order_id, status)')
        .eq('inventory_resource_id', resourceId)

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
    if (error) throw error
}
