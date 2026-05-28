import { supabase } from '@/lib/supabase'
import { fetchAllPaginated } from '@/lib/api'
import type {
    InventoryBatch,
    InventoryBatchModel,
    InventoryBatchStatus,
    InventoryCircuit,
} from '@/types'

type MaybeRelation<T> = T | T[] | null

function pickRelation<T>(value: MaybeRelation<T> | undefined): T | null {
    if (Array.isArray(value)) return value[0] ?? null
    return value ?? null
}

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
    const all: { landing_stations: MaybeRelation<{ country: string }> }[] = []
    let from = 0

    while (true) {
        const { data, error } = await supabase
            .from('cable_landing_stations')
            .select('landing_stations(country)')
            .eq('cable_system_id', cableSystemId)
            .range(from, from + PAGE - 1)

        if (error) throw error
        const rows = (data ?? []) as typeof all
        all.push(...rows)
        if (rows.length < PAGE) break
        from += PAGE
    }

    // Extract unique countries
    const countrySet = new Set<string>()
    for (const row of all) {
        const landingStation = pickRelation(row.landing_stations)
        if (landingStation?.country) countrySet.add(landingStation.country)
    }
    return [...countrySet].sort()
}

// Fetch landing stations for a cable + country
export async function fetchStationsForCableAndCountry(
    cableSystemId: string,
    country: string
) {
    const PAGE = 1000
    interface JunctionRow {
        landing_station_id: string
        landing_stations: MaybeRelation<{ id: string; name: string; country: string }>
    }
    const all: JunctionRow[] = []
    let from = 0

    while (true) {
        const { data, error } = await supabase
            .from('cable_landing_stations')
            .select('landing_station_id, landing_stations(id, name, country)')
            .eq('cable_system_id', cableSystemId)
            .range(from, from + PAGE - 1)

        if (error) throw error
        const rows = (data ?? []) as JunctionRow[]
        all.push(...rows)
        if (rows.length < PAGE) break
        from += PAGE
    }

    // Filter by country
    return all
        .map((junction) => pickRelation(junction.landing_stations))
        .filter((s): s is { id: string; name: string; country: string } =>
            s !== null && s.country === country
        )
        .sort((a, b) => a.name.localeCompare(b.name))
}

// Fetch ALL handover locations + landing stations merged
export async function fetchHandoverLocations(searchQuery?: string) {
    const PAGE = 1000
    type LocationRow = { id: string; name: string; country: string; city: string; type: string }
    const all: LocationRow[] = []

    // 1. Fetch handover_locations
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
        const rows = (data ?? []) as LocationRow[]
        all.push(...rows)
        if (rows.length < PAGE) break
        from += PAGE
    }

    // 2. Fetch landing_stations and merge as 'Landing Station' type
    from = 0
    while (true) {
        let query = supabase
            .from('landing_stations')
            .select('id, name, country')
            .order('country')
            .order('name')
            .range(from, from + PAGE - 1)

        if (searchQuery && searchQuery.length >= 2) {
            query = query.or(`name.ilike.%${searchQuery}%,country.ilike.%${searchQuery}%`)
        }

        const { data, error } = await query
        if (error) throw error
        const rows = (data ?? []) as { id: string; name: string; country: string }[]
        for (const row of rows) {
            all.push({ id: row.id, name: row.name, country: row.country, city: row.country, type: 'Landing Station' })
        }
        if (rows.length < PAGE) break
        from += PAGE
    }

    // Sort merged results by country → name
    all.sort((a, b) => a.country.localeCompare(b.country) || a.name.localeCompare(b.name))
    return all
}

// Fetch merged locations with cable associations for landing stations (Reference Data page)
export async function fetchAllLocations() {
    type LocationRow = { id: string; name: string; country: string; city: string; type: string; cable_names?: string[] }

    // 1. Fetch handover_locations
    const handovers = await fetchAllPaginated<{ id: string; name: string; country: string; city: string; type: string }>(
        'handover_locations', 'id, name, country, city, type', 'country'
    )
    const all: LocationRow[] = handovers.map((h) => ({ ...h, cable_names: [] }))

    // 2. Fetch landing_stations with cable associations
    type StationRow = { id: string; name: string; country: string; cable_landing_stations: { cable_systems: { name: string } | null }[] }
    const stations = await fetchAllPaginated<StationRow>(
        'landing_stations', 'id, name, country, cable_landing_stations(cable_systems(name))', 'country'
    )
    for (const s of stations) {
        all.push({
            id: s.id,
            name: s.name,
            country: s.country,
            city: s.country,
            type: 'Landing Station',
            cable_names: (s.cable_landing_stations ?? [])
                .map((cls) => cls.cable_systems?.name)
                .filter(Boolean)
                .sort() as string[],
        })
    }

    all.sort((a, b) => a.country.localeCompare(b.country) || a.name.localeCompare(b.name))
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
    return (data ?? []) as InventoryCircuit[]
}

export interface CircuitCreatePayload {
    inventory_resource_id: string
    circuit_number: number
    capacity: number
    original_interface_type_id: string
    current_interface_type_id: string
    landing_station_a_id?: string | null
    landing_station_z_id?: string | null
    handover_location_a_id?: string | null
    handover_location_z_id?: string | null
    batch_id?: string
    status?: 'Available' | 'Allocated' | 'Reserved' | 'Planned'
    notes?: string
}

export type CircuitUpdatePayload = Partial<
    Pick<
        InventoryCircuit,
        | 'capacity'
        | 'current_interface_type_id'
        | 'original_interface_type_id'
        | 'landing_station_a_id'
        | 'landing_station_z_id'
        | 'handover_location_a_id'
        | 'handover_location_z_id'
        | 'batch_id'
        | 'status'
        | 'notes'
    >
>

export async function createCircuit(circuit: CircuitCreatePayload) {
    const { data, error } = await supabase
        .from('inventory_circuits')
        .insert(circuit)
        .select()
        .single()
    if (error) throw error
    return data as InventoryCircuit
}

export async function updateCircuit(id: string, updates: CircuitUpdatePayload) {
    const { data, error } = await supabase
        .from('inventory_circuits')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
    if (error) throw error
    return data as InventoryCircuit
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
    return (data ?? []) as InventoryBatch[]
}

export interface BatchCreatePayload {
    inventory_resource_id: string
    batch_number: number
    capacity: number
    model: InventoryBatchModel
    start_date?: string
    term_months?: number
    otc?: number
    om_rate?: number
    annual_om_cost?: number
    mrc?: number
    status?: InventoryBatchStatus
}

export type BatchUpdatePayload = Partial<
    Pick<
        InventoryBatch,
        | 'batch_number'
        | 'capacity'
        | 'model'
        | 'start_date'
        | 'term_months'
        | 'otc'
        | 'om_rate'
        | 'annual_om_cost'
        | 'mrc'
        | 'status'
    >
>

export async function createBatch(batch: BatchCreatePayload) {
    const { data, error } = await supabase
        .from('inventory_batches')
        .insert(batch)
        .select()
        .single()
    if (error) throw error
    return data as InventoryBatch
}

export async function updateBatch(id: string, updates: BatchUpdatePayload) {
    const { data, error } = await supabase
        .from('inventory_batches')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
    if (error) throw error
    return data as InventoryBatch
}

export async function deleteBatch(id: string) {
    const { error } = await supabase
        .from('inventory_batches')
        .delete()
        .eq('id', id)
    if (error) throw error
}
