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
    batch_id: string | null
    status: 'Available' | 'Allocated' | 'Reserved' | 'Planned'
    notes: string | null
    created_at: string
    updated_at: string
}

// ============================================
// Sales Types
// ============================================

export type DisposalType = 'IRU Out' | 'Lease Out' | 'Swap Out'
export type SalesStatus = 'Draft' | 'Pre-sold' | 'Active' | 'Expired' | 'Terminated' | 'Cancelled'
export type SalesItemType = 'Capacity' | 'Backhaul' | 'Local Access' | 'Cross-Connect' | 'NRC' | 'Other'

export interface SalesOrder {
    id: string
    order_id: string          // SO-XXXXX
    internal_ref: string | null
    customer_id: string | null
    customer_name?: string    // joined
    status: SalesStatus
    notes: string | null
    created_at: string
    updated_at: string
}

export interface SalesOrderItem {
    id: string
    sales_order_id: string
    type: SalesItemType
    inventory_resource_id: string | null
    resource_id?: string      // joined (RES-XXXXX)
    cable_system_name?: string // joined
    description: string | null
    disposal_type: DisposalType | null
    capacity: number | null
    spec: string | null
    start_date: string | null
    end_date: string | null
    term_months: number | null
    // Revenue (sell price)
    sell_otc: number | null
    sell_mrc: number | null
    sell_nrc: number | null
    sell_om_rate: number | null
    sell_annual_om: number | null
    // Per-item status
    status: SalesStatus
    // Allocated circuits (joined)
    allocated_circuits?: SalesItemCircuit[]
    created_at: string
    updated_at: string
}

export interface SalesItemCircuit {
    id: string
    sales_order_item_id: string
    inventory_circuit_id: string
    // Joined fields
    circuit_number?: number
    capacity?: number
    interface_type_name?: string
    status?: string
}
