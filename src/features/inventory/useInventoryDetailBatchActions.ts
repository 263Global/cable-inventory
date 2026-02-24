import { useState } from 'react'
import { toast } from 'sonner'
import {
    calcBatchTermToBaseEnd,
    calculateAnnualOm,
    suggestBatchStatusFromBaseEnd,
} from '@/lib/contract-utils'
import {
    createBatch,
    deleteBatch,
    updateBatch,
    type BatchUpdatePayload,
} from '@/lib/reference-api'
import type {
    InventoryBatch,
    InventoryBatchModel,
    InventoryBatchStatus,
    InventoryResource,
} from '@/types'
import type { NewBatchForm } from '@/features/inventory/inventory-detail-types'

function createEmptyBatchForm(): NewBatchForm {
    return { capacity: '', model: 'IRU', start_date: '', otc: '', om_rate: '4.0', mrc: '', annual_om_cost: '' }
}

function toNumberishOrNull(value: string | number): number | null {
    if (value === '') return null
    if (typeof value === 'number') return value
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
}

function buildBatchUpdatePayload(
    field: string,
    value: string | number,
): BatchUpdatePayload {
    const numeric = toNumberishOrNull(value)
    const updateValue = value === '' ? null : value

    switch (field) {
        case 'annual_om_cost':
            return { annual_om_cost: numeric ?? 0 }
        case 'batch_number':
            return { batch_number: numeric ?? 0 }
        case 'capacity':
            return { capacity: numeric ?? 0 }
        case 'mrc':
            return { mrc: numeric }
        case 'om_rate':
            return { om_rate: numeric }
        case 'otc':
            return { otc: numeric }
        case 'start_date':
            return { start_date: updateValue === null ? null : String(updateValue) }
        case 'status':
            return {
                status: (updateValue === null ? 'Planned' : String(updateValue)) as InventoryBatchStatus,
            }
        case 'model':
            return {
                model: (updateValue === null ? 'IRU' : String(updateValue)) as InventoryBatchModel,
            }
        case 'term_months':
            return { term_months: numeric }
        default:
            return {}
    }
}

interface UseInventoryDetailBatchActionsParams {
    id: string | undefined
    resource: InventoryResource | null
    batches: InventoryBatch[]
    loadBatches: () => Promise<void>
}

export function useInventoryDetailBatchActions({
    id,
    resource,
    batches,
    loadBatches,
}: UseInventoryDetailBatchActionsParams) {
    const [editingBatchId, setEditingBatchId] = useState<string | null>(null)
    const [showAddBatch, setShowAddBatch] = useState(false)
    const [newBatch, setNewBatch] = useState(createEmptyBatchForm)
    const [newBatchOmUnlocked, setNewBatchOmUnlocked] = useState(false)
    const [omUnlockedBatches, setOmUnlockedBatches] = useState<Set<string>>(new Set())

    const handleSaveNewBatch = async () => {
        if (!id || !newBatch.capacity || !resource) return

        const nextNum =
            batches.length > 0
                ? Math.max(...batches.map((batch) => batch.batch_number)) + 1
                : 1
        const termMonths = newBatch.start_date
            ? calcBatchTermToBaseEnd(resource.start_date, resource.term_months, newBatch.start_date)
            : undefined
        const status = newBatch.start_date
            ? suggestBatchStatusFromBaseEnd(newBatch.start_date, resource.end_date)
            : 'Planned'
        const otcVal = parseFloat(newBatch.otc) || 0
        const rateVal = parseFloat(newBatch.om_rate) || 4.0
        const calcOm = calculateAnnualOm(otcVal, rateVal)

        await createBatch({
            inventory_resource_id: id,
            batch_number: nextNum,
            capacity: parseFloat(newBatch.capacity) || 0,
            model: newBatch.model,
            start_date: newBatch.start_date || undefined,
            term_months: termMonths && termMonths > 0 ? termMonths : undefined,
            otc: newBatch.model === 'IRU' ? otcVal : undefined,
            om_rate: newBatch.model === 'IRU' ? rateVal : undefined,
            annual_om_cost:
                newBatch.model === 'IRU'
                    ? newBatchOmUnlocked && newBatch.annual_om_cost
                        ? parseFloat(newBatch.annual_om_cost)
                        : calcOm
                    : undefined,
            mrc: newBatch.model === 'Lease' ? parseFloat(newBatch.mrc) || 0 : undefined,
            status,
        })
        setNewBatch(createEmptyBatchForm())
        setNewBatchOmUnlocked(false)
        setShowAddBatch(false)
        await loadBatches()
        toast.success('Batch saved')
    }

    const deleteBatchById = async (batchId: string) => {
        await deleteBatch(batchId)
        if (editingBatchId === batchId) setEditingBatchId(null)
        await loadBatches()
    }

    const handleUpdateBatchField = async (
        batchId: string,
        field: string,
        value: string | number,
    ) => {
        try {
            const updates = buildBatchUpdatePayload(field, value)
            if ((field === 'otc' || field === 'om_rate') && !omUnlockedBatches.has(batchId)) {
                const batch = batches.find((item) => item.id === batchId)
                if (batch) {
                    const otc = field === 'otc' ? Number(value) || 0 : Number(batch.otc) || 0
                    const rate = field === 'om_rate' ? Number(value) || 0 : Number(batch.om_rate) || 0
                    updates.annual_om_cost = calculateAnnualOm(otc, rate)
                }
            }
            if (field === 'start_date' && value && resource) {
                const term = calcBatchTermToBaseEnd(resource.start_date, resource.term_months, String(value))
                if (term > 0) updates.term_months = term
                updates.status = suggestBatchStatusFromBaseEnd(String(value), resource.end_date)
            }
            await updateBatch(batchId, updates)
            await loadBatches()
        } catch (error) {
            console.error(error)
            toast.error('Failed to update batch')
        }
    }

    const handleCancelAddBatch = () => {
        setShowAddBatch(false)
        setNewBatch(createEmptyBatchForm())
        setNewBatchOmUnlocked(false)
    }

    const handleDoneBatchEdit = (batchId: string) => {
        setEditingBatchId(null)
        setOmUnlockedBatches((state) => {
            const next = new Set(state)
            next.delete(batchId)
            return next
        })
    }

    const handleToggleBatchOmUnlocked = (batchId: string) => {
        setOmUnlockedBatches((state) => {
            const next = new Set(state)
            if (next.has(batchId)) next.delete(batchId)
            else next.add(batchId)
            return next
        })
    }

    return {
        editingBatchId,
        showAddBatch,
        newBatch,
        newBatchOmUnlocked,
        omUnlockedBatches,
        setEditingBatchId,
        setShowAddBatch,
        setNewBatch,
        setNewBatchOmUnlocked,
        handleSaveNewBatch,
        deleteBatchById,
        handleUpdateBatchField,
        handleCancelAddBatch,
        handleDoneBatchEdit,
        handleToggleBatchOmUnlocked,
    }
}
