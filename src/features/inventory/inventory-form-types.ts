import type { AcquisitionType, CostMode, InventoryResource, ResourceType } from '@/types'

export interface InventoryFormState {
    type: ResourceType
    internal_ref: string
    spec: string
    capacity_value: string
    cable_system_id: string
    supplier_id: string
    acquisition_type: AcquisitionType
    protection: InventoryResource['protection']
    contract_ref: string
    notes: string
    cost_mode: CostMode
    country_a: string
    country_z: string
    landing_station_a_id: string
    landing_station_z_id: string
    handover_location_a_id: string
    handover_location_z_id: string
    route_description: string
    term_months: string
    start_date: string
    end_date: string
    otc: string
    om_rate: string
    annual_om_cost: string
    mrc: string
    nrc: string
}

export interface CableSystemOption {
    id: string
    name: string
    status: string
}

export interface SupplierOption {
    id: string
    name: string
}

export interface StationOption {
    id: string
    name: string
}

export interface HandoverLocationOption {
    id: string
    name: string
    country: string
    city: string
    type: string
}
