// ============================================
// Reference Data Types
// ============================================

export interface CableSystem {
    id: string
    name: string
    rfs_year: number | null
    status: 'Active' | 'Planned' | 'Retired'
    notes: string | null
    created_at: string
    updated_at: string
}

export interface LandingStation {
    id: string
    name: string
    country: string
    cable_system_id: string | null
    cable_system_name?: string // joined
    latitude: number | null
    longitude: number | null
    notes: string | null
    created_at: string
    updated_at: string
}

export interface Country {
    id: string
    name: string
    code: string // ISO 3166-1 alpha-2
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
    cable_system_name?: string // joined
    supplier_id: string | null
    supplier_name?: string // joined
    acquisition_type: AcquisitionType
    status: ResourceStatus
    protection: 'Protected' | 'Unprotected'
    contract_ref: string | null
    notes: string | null

    // Locations
    country_a: string | null
    country_z: string | null
    landing_station_a_id: string | null
    landing_station_z_id: string | null
    handover_location_a_id: string | null
    handover_location_z_id: string | null
    route_description: string | null

    // Contract
    cost_mode: CostMode
    term_months: number | null
    start_date: string | null
    end_date: string | null

    // IRU financials
    otc: number | null
    om_rate: number | null // default 4%
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
