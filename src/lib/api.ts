import { supabase } from '@/lib/supabase'

// Generic CRUD operations for reference data tables
export async function fetchAll<T>(table: string): Promise<T[]> {
    const { data, error } = await supabase
        .from(table)
        .select('*')
        .order('name', { ascending: true })

    if (error) throw error
    return (data as T[]) ?? []
}

export async function fetchById<T>(table: string, id: string): Promise<T | null> {
    const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .single()

    if (error) throw error
    return data as T
}

export async function insertRecord<T>(table: string, record: Partial<T>): Promise<T> {
    const { data, error } = await supabase
        .from(table)
        .insert(record)
        .select()
        .single()

    if (error) throw error
    return data as T
}

export async function updateRecord<T>(table: string, id: string, updates: Partial<T>): Promise<T> {
    const { data, error } = await supabase
        .from(table)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    return data as T
}

export async function deleteRecord(table: string, id: string): Promise<void> {
    const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id)

    if (error) throw error
}

// Cable Systems specific
export async function fetchCableSystemsWithCount() {
    const { data, error } = await supabase
        .from('cable_systems')
        .select('*, landing_stations(count)')
        .order('name', { ascending: true })

    if (error) throw error
    return data ?? []
}

// Landing Stations with cable system name
export async function fetchLandingStationsWithCable() {
    const { data, error } = await supabase
        .from('landing_stations')
        .select('*, cable_systems(name)')
        .order('name', { ascending: true })

    if (error) throw error
    return data ?? []
}
