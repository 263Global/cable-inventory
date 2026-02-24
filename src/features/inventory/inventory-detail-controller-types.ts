import type { InventoryBatch, InventoryResource } from '@/types'

export interface PendingDeleteItem {
    type: 'batch' | 'circuit'
    id: string
    label: string
}

export interface TerminateWarning {
    activeOrders: { order_id: string; customer_name: string | null }[]
    allocatedCircuitCount: number
}

export interface RenewFormState {
    startDate: string
    termMonths: number
    endDate: string
    mrc: number
    nrc: number
}

export interface InventoryCapacityStats {
    isBatchMode: boolean
    isIRU: boolean
    isLease: boolean
    totalCap: number
    usedCap: number
    batchTotalCap: number
    batchPct: number
    capUsedByCircuits: number
    capAvailable: number
    capUnlit: number
    plannedLit: number
    pctUsed: number
    pctAvailable: number
    pctPlanned: number
}

export function computeInventoryCapacityStats(
    resource: InventoryResource | null,
    batches: InventoryBatch[],
): InventoryCapacityStats {
    const totalCap = Number(resource?.total_capacity ?? 0)
    const usedCap = Number(resource?.used_capacity ?? 0)
    const activeLit = batches
        .filter((batch) => batch.status === 'Active')
        .reduce((sum, batch) => sum + Number(batch.capacity ?? 0), 0)
    const plannedLit = batches
        .filter((batch) => batch.status === 'Planned')
        .reduce((sum, batch) => sum + Number(batch.capacity ?? 0), 0)
    const batchTotalCap = activeLit + plannedLit
    const batchPct = totalCap > 0 ? Math.min((batchTotalCap / totalCap) * 100, 100) : 0
    const capUsedByCircuits = usedCap
    const capAvailable = Math.max(0, activeLit - capUsedByCircuits)
    const capUnlit = Math.max(0, totalCap - activeLit - plannedLit)
    const pctUsed = totalCap > 0 ? (capUsedByCircuits / totalCap) * 100 : 0
    const pctAvailable = totalCap > 0 ? (capAvailable / totalCap) * 100 : 0
    const pctPlanned = totalCap > 0 ? (plannedLit / totalCap) * 100 : 0

    return {
        isBatchMode: resource?.cost_mode === 'Base+Batch',
        isIRU: resource?.acquisition_type === 'IRU',
        isLease: resource?.acquisition_type === 'Lease',
        totalCap,
        usedCap,
        batchTotalCap,
        batchPct,
        capUsedByCircuits,
        capAvailable,
        capUnlit,
        plannedLit,
        pctUsed,
        pctAvailable,
        pctPlanned,
    }
}
