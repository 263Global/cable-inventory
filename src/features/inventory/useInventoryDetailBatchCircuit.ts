import { useState } from 'react'
import { toast } from 'sonner'
import type { InventoryBatch, InventoryCircuit, InventoryResource } from '@/types'
import type { PendingDeleteItem } from '@/features/inventory/inventory-detail-controller-types'
import { useInventoryDetailBatchActions } from '@/features/inventory/useInventoryDetailBatchActions'
import { useInventoryDetailCircuitActions } from '@/features/inventory/useInventoryDetailCircuitActions'

interface UseInventoryDetailBatchCircuitParams {
    id: string | undefined
    resource: InventoryResource | null
    circuits: InventoryCircuit[]
    batches: InventoryBatch[]
    loadCircuits: () => Promise<void>
    loadBatches: () => Promise<void>
}

export function useInventoryDetailBatchCircuit({
    id,
    resource,
    circuits,
    batches,
    loadCircuits,
    loadBatches,
}: UseInventoryDetailBatchCircuitParams) {
    const [pendingDelete, setPendingDelete] = useState<PendingDeleteItem | null>(null)
    const [deletingItem, setDeletingItem] = useState(false)

    const circuitActions = useInventoryDetailCircuitActions({
        id,
        resource,
        circuits,
        batches,
        loadCircuits,
    })

    const batchActions = useInventoryDetailBatchActions({
        id,
        resource,
        batches,
        loadBatches,
    })

    const handleDeleteCircuit = (circuitId: string) => {
        setPendingDelete({ type: 'circuit', id: circuitId, label: 'circuit' })
    }

    const handleDeleteBatch = (batchId: string) => {
        const batch = batches.find((item) => item.id === batchId)
        setPendingDelete({
            type: 'batch',
            id: batchId,
            label: `Batch #${batch?.batch_number ?? ''}`,
        })
    }

    const confirmPendingDelete = async () => {
        if (!pendingDelete) return

        setDeletingItem(true)
        try {
            if (pendingDelete.type === 'circuit') {
                await circuitActions.deleteCircuitById(pendingDelete.id)
                toast.success('Circuit deleted')
            } else {
                await batchActions.deleteBatchById(pendingDelete.id)
                toast.success('Batch deleted')
            }
        } catch (error) {
            console.error(error)
            toast.error(`Failed to delete ${pendingDelete.type}`)
        } finally {
            setDeletingItem(false)
            setPendingDelete(null)
        }
    }

    return {
        ...circuitActions,
        ...batchActions,
        pendingDelete,
        deletingItem,
        setPendingDelete,
        handleDeleteCircuit,
        handleDeleteBatch,
        confirmPendingDelete,
    }
}
