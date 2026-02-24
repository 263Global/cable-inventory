import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
    fetchInventoryById,
    fetchLinkedSalesItems,
    type LinkedSalesItem,
} from '@/features/inventory/api'
import {
    fetchBatches,
    fetchCircuits,
    fetchHandoverLocations,
    fetchInterfaceTypes,
    updateBatch,
} from '@/lib/reference-api'
import type { InventoryBatch, InventoryCircuit, InventoryResource } from '@/types'
import type {
    HandoverLocationOption,
    InterfaceTypeOption,
} from '@/features/inventory/inventory-detail-types'

export function useInventoryDetailData(id: string | undefined) {
    const [resource, setResource] = useState<InventoryResource | null>(null)
    const [loading, setLoading] = useState(true)
    const [circuits, setCircuits] = useState<InventoryCircuit[]>([])
    const [batches, setBatches] = useState<InventoryBatch[]>([])
    const [interfaceTypes, setInterfaceTypes] = useState<InterfaceTypeOption[]>([])
    const [handoverLocations, setHandoverLocations] = useState<HandoverLocationOption[]>([])
    const [linkedSales, setLinkedSales] = useState<LinkedSalesItem[]>([])

    const loadResource = useCallback(async () => {
        if (!id) return
        setLoading(true)
        try {
            const resourceData = await fetchInventoryById(id)
            setResource(resourceData)
        } finally {
            setLoading(false)
        }
    }, [id])

    const loadCircuits = useCallback(async () => {
        if (!id) return
        try {
            setCircuits(await fetchCircuits(id))
        } catch (error) {
            console.error(error)
        }
    }, [id])

    const loadBatches = useCallback(async () => {
        if (!id) return
        try {
            setBatches(await fetchBatches(id))
        } catch (error) {
            console.error(error)
        }
    }, [id])

    useEffect(() => {
        if (!id) return

        loadResource().catch(console.error)
        loadCircuits()
        loadBatches()
        fetchInterfaceTypes().then(setInterfaceTypes).catch(console.error)
        fetchHandoverLocations().then(setHandoverLocations).catch(console.error)
        fetchLinkedSalesItems(id).then(setLinkedSales).catch(console.error)
    }, [id, loadBatches, loadCircuits, loadResource])

    const autoTransitionDone = useRef(false)
    useEffect(() => {
        autoTransitionDone.current = false
    }, [id])

    useEffect(() => {
        if (!batches.length || autoTransitionDone.current) return

        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const toUpdate = batches.filter(
            (batch) =>
                batch.status === 'Planned' &&
                batch.start_date &&
                new Date(batch.start_date) <= today,
        )
        if (toUpdate.length === 0) return

        autoTransitionDone.current = true
        ;(async () => {
            try {
                await Promise.all(
                    toUpdate.map((batch) => updateBatch(batch.id, { status: 'Active' })),
                )
                await loadBatches()
                toast.info(
                    `${toUpdate.length} batch${toUpdate.length > 1 ? 'es' : ''} auto-transitioned to Active`,
                )
            } catch (error) {
                console.error(error)
            }
        })()
    }, [batches, loadBatches])

    return {
        resource,
        loading,
        circuits,
        batches,
        interfaceTypes,
        handoverLocations,
        linkedSales,
        setResource,
        loadResource,
        loadCircuits,
        loadBatches,
    }
}
