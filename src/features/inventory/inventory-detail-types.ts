import type { InventoryBatch, InventoryBatchModel } from '@/types'

export type BatchRecord = InventoryBatch

export interface NewBatchForm {
    capacity: string
    model: InventoryBatchModel
    start_date: string
    otc: string
    om_rate: string
    mrc: string
    annual_om_cost: string
}

export interface NewCircuitForm {
    capacity: string
    quantity: string
    interface_type_id: string
    handover_a_id: string
    handover_z_id: string
    batch_id: string
}

export interface InterfaceTypeOption {
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
