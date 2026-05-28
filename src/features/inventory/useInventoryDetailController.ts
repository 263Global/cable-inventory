import { useMemo } from 'react'
import { useInventoryDetailBatchCircuit } from '@/features/inventory/useInventoryDetailBatchCircuit'
import { useInventoryDetailData } from '@/features/inventory/useInventoryDetailData'
import { useInventoryDetailLifecycle } from '@/features/inventory/useInventoryDetailLifecycle'
import { computeInventoryCapacityStats } from '@/features/inventory/inventory-detail-controller-types'

export function useInventoryDetailController(id: string | undefined) {
    const {
        resource,
        loading,
        circuits,
        batches,
        interfaceTypes,
        handoverLocations,
        linkedSales,
        setResource,
        loadCircuits,
        loadBatches,
    } = useInventoryDetailData(id)

    const batchCircuit = useInventoryDetailBatchCircuit({
        id,
        resource,
        circuits,
        batches,
        handoverLocations,
        loadCircuits,
        loadBatches,
    })

    const lifecycle = useInventoryDetailLifecycle({
        resource,
        setResource,
        loadCircuits,
    })

    const capacityStats = useMemo(
        () => computeInventoryCapacityStats(resource, batches),
        [resource, batches],
    )

    return {
        resource,
        loading,
        circuits,
        batches,
        interfaceTypes,
        handoverLocations,
        linkedSales,
        ...batchCircuit,
        ...lifecycle,
        ...capacityStats,
    }
}
