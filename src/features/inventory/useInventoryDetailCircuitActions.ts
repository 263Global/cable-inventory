import { useState } from 'react'
import { toast } from 'sonner'
import { createCircuit, deleteCircuit, updateCircuit } from '@/lib/reference-api'
import type {
    InventoryBatch,
    InventoryCircuit,
    InventoryResource,
} from '@/types'
import type { HandoverLocationOption, NewCircuitForm } from '@/features/inventory/inventory-detail-types'

function createEmptyCircuitForm(): NewCircuitForm {
    return { capacity: '', interface_type_id: '', handover_a_id: '', handover_z_id: '', batch_id: '' }
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message
    if (error && typeof error === 'object' && 'message' in error) {
        return String((error as { message?: unknown }).message)
    }
    return 'Unknown error'
}

function getCircuitLocationFields(
    side: 'a' | 'z',
    locationId: string,
    locations: HandoverLocationOption[],
) {
    if (!locationId) return {}

    const location = locations.find((item) => item.id === locationId)
    if (!location) return null

    if (location.type === 'Landing Station') {
        return side === 'a'
            ? { landing_station_a_id: locationId, handover_location_a_id: null }
            : { landing_station_z_id: locationId, handover_location_z_id: null }
    }

    return side === 'a'
        ? { handover_location_a_id: locationId, landing_station_a_id: null }
        : { handover_location_z_id: locationId, landing_station_z_id: null }
}

interface UseInventoryDetailCircuitActionsParams {
    id: string | undefined
    resource: InventoryResource | null
    circuits: InventoryCircuit[]
    batches: InventoryBatch[]
    handoverLocations: HandoverLocationOption[]
    loadCircuits: () => Promise<void>
}

export function useInventoryDetailCircuitActions({
    id,
    resource,
    circuits,
    batches,
    handoverLocations,
    loadCircuits,
}: UseInventoryDetailCircuitActionsParams) {
    const [showAddCircuit, setShowAddCircuit] = useState(false)
    const [newCircuit, setNewCircuit] = useState(createEmptyCircuitForm)
    const [savingCircuit, setSavingCircuit] = useState(false)

    const handleAddCircuit = async () => {
        if (!id || !newCircuit.capacity || !newCircuit.interface_type_id) return

        const cap = Number(newCircuit.capacity)

        if (newCircuit.batch_id) {
            const batch = batches.find((item) => item.id === newCircuit.batch_id)
            if (batch) {
                const usedCapacity = circuits
                    .filter((item) => item.batch_id === newCircuit.batch_id)
                    .reduce((sum, item) => sum + item.capacity, 0)
                if (usedCapacity + cap > batch.capacity) {
                    toast.error(`Exceeds batch capacity: ${usedCapacity}G used + ${cap}G = ${usedCapacity + cap}G > ${batch.capacity}G`)
                    return
                }
            }
        }

        const totalCircuits = circuits.reduce((sum, item) => sum + item.capacity, 0)
        if (resource?.total_capacity && totalCircuits + cap > resource.total_capacity) {
            toast.error(`Exceeds total capacity: ${totalCircuits}G used + ${cap}G = ${totalCircuits + cap}G > ${resource.total_capacity}G`)
            return
        }

        setSavingCircuit(true)
        try {
            const locationAFields = getCircuitLocationFields('a', newCircuit.handover_a_id, handoverLocations)
            const locationZFields = getCircuitLocationFields('z', newCircuit.handover_z_id, handoverLocations)

            if (locationAFields === null || locationZFields === null) {
                toast.error('Selected circuit location is no longer available')
                return
            }

            const nextNum =
                circuits.length > 0
                    ? Math.max(...circuits.map((item) => item.circuit_number)) + 1
                    : 1

            await createCircuit({
                inventory_resource_id: id,
                circuit_number: nextNum,
                capacity: cap,
                original_interface_type_id: newCircuit.interface_type_id,
                current_interface_type_id: newCircuit.interface_type_id,
                ...(newCircuit.batch_id ? { batch_id: newCircuit.batch_id } : {}),
                ...(newCircuit.batch_id
                    ? {
                        status:
                            batches.find((item) => item.id === newCircuit.batch_id)?.status === 'Active'
                                ? 'Available'
                                : 'Planned',
                    }
                    : {}),
                ...locationAFields,
                ...locationZFields,
            })
            setNewCircuit(createEmptyCircuitForm())
            setShowAddCircuit(false)
            await loadCircuits()
            toast.success('Circuit added')
        } catch (error) {
            console.error(error)
            toast.error(`Failed to add circuit: ${getErrorMessage(error)}`)
        } finally {
            setSavingCircuit(false)
        }
    }

    const handleChangeInterfaceType = async (circuitId: string, newTypeId: string) => {
        await updateCircuit(circuitId, { current_interface_type_id: newTypeId })
        await loadCircuits()
        toast.success('Interface type updated')
    }

    const deleteCircuitById = async (circuitId: string) => {
        await deleteCircuit(circuitId)
        await loadCircuits()
    }

    const handleCancelAddCircuit = () => {
        setShowAddCircuit(false)
        setNewCircuit(createEmptyCircuitForm())
    }

    return {
        showAddCircuit,
        newCircuit,
        savingCircuit,
        setShowAddCircuit,
        setNewCircuit,
        handleAddCircuit,
        handleChangeInterfaceType,
        deleteCircuitById,
        handleCancelAddCircuit,
    }
}
