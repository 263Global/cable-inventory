import { supabase } from '@/lib/supabase'
import type { InventoryResource } from '@/types'

export async function fetchInventoryResources(typeFilter?: string): Promise<InventoryResource[]> {
    let query = supabase
        .from('inventory_resources')
        .select('*, cable_systems(name)')
        .order('created_at', { ascending: false })

    if (typeFilter && typeFilter !== 'All') {
        query = query.eq('type', typeFilter)
    }

    const { data, error } = await query
    if (error) throw error

    return (data ?? []).map((item: Record<string, unknown>) => ({
        ...item,
        cable_system_name: (item.cable_systems as { name: string } | null)?.name ?? null,
    })) as InventoryResource[]
}

export async function fetchInventoryById(id: string): Promise<InventoryResource | null> {
    const { data, error } = await supabase
        .from('inventory_resources')
        .select('*, cable_systems(name)')
        .eq('id', id)
        .single()

    if (error) throw error
    return data ? {
        ...data,
        cable_system_name: (data.cable_systems as { name: string } | null)?.name ?? null,
    } as InventoryResource : null
}

export async function createInventoryResource(
    resource: Partial<InventoryResource>
): Promise<InventoryResource> {
    // Generate resource ID
    const { data: maxRes } = await supabase
        .from('inventory_resources')
        .select('resource_id')
        .order('resource_id', { ascending: false })
        .limit(1)

    let nextNum = 10001
    if (maxRes && maxRes.length > 0) {
        const match = maxRes[0].resource_id.match(/RES-(\d+)/)
        if (match) nextNum = parseInt(match[1]) + 1
    }

    const { data, error } = await supabase
        .from('inventory_resources')
        .insert({ ...resource, resource_id: `RES-${String(nextNum).padStart(5, '0')}` })
        .select()
        .single()

    if (error) throw error
    return data as InventoryResource
}

export async function updateInventoryResource(
    id: string,
    updates: Partial<InventoryResource>
): Promise<InventoryResource> {
    const { data, error } = await supabase
        .from('inventory_resources')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    return data as InventoryResource
}

export async function deleteInventoryResource(id: string): Promise<void> {
    const { error } = await supabase
        .from('inventory_resources')
        .delete()
        .eq('id', id)

    if (error) throw error
}
