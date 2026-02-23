import { supabase } from '@/lib/supabase'

const PAGE_SIZE = 1000

/**
 * Paginated fetch: loops through Supabase results in batches of PAGE_SIZE
 * to bypass the PostgREST default 1000-row limit.
 */
export async function fetchAllPaginated<T>(
    table: string,
    select: string,
    orderCol: string,
    ascending = true
): Promise<T[]> {
    const all: T[] = []
    let from = 0

    while (true) {
        const { data, error } = await supabase
            .from(table)
            .select(select)
            .order(orderCol, { ascending })
            .range(from, from + PAGE_SIZE - 1)

        if (error) throw error

        const rows = (data ?? []) as T[]
        all.push(...rows)

        if (rows.length < PAGE_SIZE) break
        from += PAGE_SIZE
    }

    return all
}

// Generic CRUD operations for reference data tables
export async function fetchAll<T>(table: string): Promise<T[]> {
    return fetchAllPaginated<T>(table, '*', 'name')
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
    return fetchAllPaginated('cable_systems', '*, landing_stations(count)', 'name')
}

// Landing Stations with cable system name
export async function fetchLandingStationsWithCable() {
    return fetchAllPaginated('landing_stations', '*, cable_systems(name)', 'name')
}
