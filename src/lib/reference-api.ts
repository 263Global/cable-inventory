import { supabase } from '@/lib/supabase'
import { fetchAllPaginated } from '@/lib/api'

/**
 * Cascading reference data queries for the inventory form.
 * Cable → Countries → Landing Stations (strict filtering)
 * Handover Locations (global, no filter)
 */

// Fetch all cable systems (for dropdown)
export async function fetchCableSystems() {
    const { data, error } = await supabase
        .from('cable_systems')
        .select('id, name, status')
        .order('name')
    if (error) throw error
    return data ?? []
}

// Fetch countries that a cable system passes through
export async function fetchCountriesForCable(cableSystemId: string) {
    const PAGE = 1000
    const all: { landing_stations: { country: string } | null }[] = []
    let from = 0

    while (true) {
        const { data, error } = await supabase
            .from('cable_landing_stations')
            .select('landing_stations(country)')
            .eq('cable_system_id', cableSystemId)
            .range(from, from + PAGE - 1)

        if (error) throw error
        const rows = (data ?? []) as unknown as typeof all
        all.push(...rows)
        if (rows.length < PAGE) break
        from += PAGE
    }

    // Extract unique countries
    const countrySet = new Set<string>()
    for (const row of all) {
        const ls = row.landing_stations as { country: string } | null
        if (ls?.country) countrySet.add(ls.country)
    }
    return [...countrySet].sort()
}

// Fetch landing stations for a cable + country
export async function fetchStationsForCableAndCountry(
    cableSystemId: string,
    country: string
) {
    const PAGE = 1000
    type JunctionRow = { landing_station_id: string; landing_stations: { id: string; name: string; country: string } | null }
    const all: JunctionRow[] = []
    let from = 0

    while (true) {
        const { data, error } = await supabase
            .from('cable_landing_stations')
            .select('landing_station_id, landing_stations(id, name, country)')
            .eq('cable_system_id', cableSystemId)
            .range(from, from + PAGE - 1)

        if (error) throw error
        const rows = (data ?? []) as unknown as JunctionRow[]
        all.push(...rows)
        if (rows.length < PAGE) break
        from += PAGE
    }

    // Filter by country
    return all
        .map((j) => j.landing_stations)
        .filter((s): s is { id: string; name: string; country: string } =>
            s !== null && s.country === country
        )
        .sort((a, b) => a.name.localeCompare(b.name))
}

// Fetch ALL handover locations (no cable filter)
export async function fetchHandoverLocations(searchQuery?: string) {
    const PAGE = 1000
    const all: { id: string; name: string; country: string; city: string; type: string }[] = []
    let from = 0

    while (true) {
        let query = supabase
            .from('handover_locations')
            .select('id, name, country, city, type')
            .order('country')
            .order('name')
            .range(from, from + PAGE - 1)

        if (searchQuery && searchQuery.length >= 2) {
            query = query.or(`name.ilike.%${searchQuery}%,country.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%`)
        }

        const { data, error } = await query
        if (error) throw error
        const rows = (data ?? []) as typeof all
        all.push(...rows)
        if (rows.length < PAGE) break
        from += PAGE
    }

    return all
}

// Landing stations with connected cables count (for Reference Data page)
export async function fetchLandingStationsWithCables() {
    type StationRow = { id: string; name: string; country: string; cable_landing_stations: { cable_systems: { name: string } | null }[] }
    const data = await fetchAllPaginated<StationRow>(
        'landing_stations',
        'id, name, country, cable_landing_stations(cable_systems(name))',
        'name'
    )

    return data.map((s) => ({
        ...s,
        cable_names: (s.cable_landing_stations ?? [])
            .map((cls) => cls.cable_systems?.name)
            .filter(Boolean)
            .sort() as string[],
    }))
}

// Interface types
export async function fetchInterfaceTypes() {
    const { data, error } = await supabase
        .from('interface_types')
        .select('id, name, description')
        .order('name')
    if (error) throw error
    return data ?? []
}

// Inventory circuits
export async function fetchCircuits(inventoryResourceId: string) {
    const { data, error } = await supabase
        .from('inventory_circuits')
        .select('*, original_type:interface_types!original_interface_type_id(name), current_type:interface_types!current_interface_type_id(name)')
        .eq('inventory_resource_id', inventoryResourceId)
        .order('circuit_number')
    if (error) throw error
    return data ?? []
}

export async function createCircuit(circuit: {
    inventory_resource_id: string
    circuit_number: number
    capacity: number
    original_interface_type_id: string
    current_interface_type_id: string
    notes?: string
}) {
    const { data, error } = await supabase
        .from('inventory_circuits')
        .insert(circuit)
        .select()
        .single()
    if (error) throw error
    return data
}

export async function updateCircuit(id: string, updates: Record<string, unknown>) {
    const { data, error } = await supabase
        .from('inventory_circuits')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
    if (error) throw error
    return data
}

export async function deleteCircuit(id: string) {
    const { error } = await supabase
        .from('inventory_circuits')
        .delete()
        .eq('id', id)
    if (error) throw error
}

// Fetch all countries (for any dropdown)
export async function fetchAllCountries() {
    const { data, error } = await supabase
        .from('countries')
        .select('id, name, code, region')
        .order('name')
    if (error) throw error
    return data ?? []
}

// ============================================
// Suppliers
// ============================================

export async function fetchSuppliers() {
    const { data, error } = await supabase
        .from('suppliers')
        .select('id, name')
        .order('name')
    if (error) throw error
    return data ?? []
}

// ============================================
// Inventory Batches (Base+Batch mode)
// ============================================

export async function fetchBatches(inventoryResourceId: string) {
    const { data, error } = await supabase
        .from('inventory_batches')
        .select('*')
        .eq('inventory_resource_id', inventoryResourceId)
        .order('batch_number')
    if (error) throw error
    return data ?? []
}

export async function createBatch(batch: {
    inventory_resource_id: string
    batch_number: number
    capacity: number
    model: string
    start_date?: string
    term_months?: number
    otc?: number
    om_rate?: number
    annual_om_cost?: number
    mrc?: number
    status?: string
}) {
    const { data, error } = await supabase
        .from('inventory_batches')
        .insert(batch)
        .select()
        .single()
    if (error) throw error
    return data
}

export async function updateBatch(id: string, updates: Record<string, unknown>) {
    const { data, error } = await supabase
        .from('inventory_batches')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
    if (error) throw error
    return data
}

export async function deleteBatch(id: string) {
    const { error } = await supabase
        .from('inventory_batches')
        .delete()
        .eq('id', id)
    if (error) throw error
}
