// ============================================
// Reference Data Types
// ============================================

export interface CableSystem {
    id: string
    slug: string | null
    name: string
    rfs_year: number | null
    length: string | null
    owners: string | null
    status: 'Active' | 'Planned' | 'Retired'
    notes: string | null
    created_at: string
    updated_at: string
}

export interface LandingStation {
    id: string
    slug: string | null
    name: string
    country: string
    latitude: number | null
    longitude: number | null
    notes: string | null
    cable_names?: string[] // joined from cable_landing_stations
    created_at: string
    updated_at: string
}

export interface Country {
    id: string
    name: string
    code: string | null
    region: string | null
    created_at: string
    updated_at: string
}

export interface HandoverLocation {
    id: string
    name: string
    country: string
    city: string | null
    address: string | null
    type: 'PoP' | 'Data Center' | 'Exchange' | 'Other'
    notes: string | null
    created_at: string
    updated_at: string
}

export interface InterfaceType {
    id: string
    name: string
    description: string | null
    created_at: string
    updated_at: string
}

// ============================================
// Inventory Types
// ============================================

export type ResourceType = 'Capacity' | 'Terrestrial' | 'Fiber' | 'Spectrum'
export type AcquisitionType = 'IRU' | 'Lease' | 'Swap-In' | 'Owned'
export type CostMode = 'Single' | 'Base+Batch'
export type ResourceStatus = 'Available' | 'Partially Used' | 'Fully Used' | 'Expired' | 'Terminated'

export interface InventoryResource {
    id: string
    resource_id: string // RES-XXXXX
    internal_ref: string | null
    type: ResourceType
    spec: string | null
    capacity_value: number | null
    cable_system_id: string | null
    cable_system_name?: string | null // joined
    supplier_id: string | null
    supplier_name: string | null
    acquisition_type: AcquisitionType
    status: ResourceStatus
    protection: 'Protected' | 'Unprotected'
    contract_ref: string | null
    notes: string | null

    // Locations (FK-based)
    country_a_id: string | null
    country_z_id: string | null
    country_a?: string | null // joined name
    country_z?: string | null // joined name
    landing_station_a_id: string | null
    landing_station_z_id: string | null
    landing_station_a_name?: string | null // joined
    landing_station_z_name?: string | null // joined
    handover_location_a_id: string | null
    handover_location_z_id: string | null
    handover_a_name?: string | null // joined
    handover_z_name?: string | null // joined
    route_description: string | null

    // Contract
    cost_mode: CostMode
    term_months: number | null
    start_date: string | null
    end_date: string | null

    // IRU financials
    otc: number | null
    om_rate: number | null
    annual_om_cost: number | null

    // Lease financials
    mrc: number | null
    nrc: number | null

    // Capacity tracking
    total_capacity: number | null
    used_capacity: number | null

    created_at: string
    updated_at: string
}

export interface InventoryCircuit {
    id: string
    inventory_resource_id: string
    circuit_number: number
    capacity: number
    original_interface_type_id: string | null
    current_interface_type_id: string | null
    original_type?: { name: string } | null // joined
    current_type?: { name: string } | null // joined
    handover_location_a_id: string | null
    handover_location_z_id: string | null
    status: 'Available' | 'Allocated' | 'Reserved'
    notes: string | null
    created_at: string
    updated_at: string
}
