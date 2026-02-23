import { supabase } from '@/lib/supabase'

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
    const { data, error } = await supabase
        .from('cable_landing_stations')
        .select('landing_stations(country)')
        .eq('cable_system_id', cableSystemId)

    if (error) throw error

    // Extract unique countries
    const countrySet = new Set<string>()
    for (const row of (data ?? [])) {
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
    // Get station IDs linked to this cable
    const { data: junctions, error: jErr } = await supabase
        .from('cable_landing_stations')
        .select('landing_station_id, landing_stations(id, name, country)')
        .eq('cable_system_id', cableSystemId)

    if (jErr) throw jErr

    // Filter by country
    return (junctions ?? [])
        .map((j) => j.landing_stations as { id: string; name: string; country: string } | null)
        .filter((s): s is { id: string; name: string; country: string } =>
            s !== null && s.country === country
        )
        .sort((a, b) => a.name.localeCompare(b.name))
}

// Fetch ALL handover locations (no cable filter)
export async function fetchHandoverLocations(searchQuery?: string) {
    let query = supabase
        .from('handover_locations')
        .select('id, name, country, city, type')
        .order('country')
        .order('name')

    if (searchQuery && searchQuery.length >= 2) {
        query = query.or(`name.ilike.%${searchQuery}%,country.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%`)
    }

    const { data, error } = await query
    if (error) throw error
    return data ?? []
}

// Landing stations with connected cables count (for Reference Data page)
export async function fetchLandingStationsWithCables() {
    const { data, error } = await supabase
        .from('landing_stations')
        .select('id, name, country, cable_landing_stations(cable_systems(name))')
        .order('name')

    if (error) throw error

    return (data ?? []).map((s) => ({
        ...s,
        cable_names: (
            (s.cable_landing_stations as { cable_systems: { name: string } | null }[]) ?? []
        )
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
