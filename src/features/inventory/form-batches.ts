import {
    fetchBatches,
    createBatch,
    updateBatch,
    deleteBatch,
} from '@/lib/reference-api'

export interface BatchRow {
    id: string
    capacity: string
    model: 'IRU' | 'Lease'
    start_date: string
    term_months: string
    otc: string
    om_rate: string
    annual_om_cost: string
    mrc: string
    status: 'Planned' | 'Active' | 'Ended'
}

interface BatchWritePayload {
    batch_number: number
    capacity: number
    model: 'IRU' | 'Lease'
    start_date: string | null
    term_months: number | null
    otc: number | null
    om_rate: number | null
    annual_om_cost: number | null
    mrc: number | null
    status: 'Planned' | 'Active' | 'Ended'
}

export function newBatchRow(): BatchRow {
    return {
        id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        capacity: '',
        model: 'IRU',
        start_date: '',
        term_months: '',
        otc: '',
        om_rate: '4.0',
        annual_om_cost: '',
        mrc: '',
        status: 'Planned',
    }
}

function isTempBatchId(id: string): boolean {
    return id.startsWith('temp-')
}

function buildBatchWritePayload(batch: BatchRow, batchNumber: number): BatchWritePayload {
    return {
        batch_number: batchNumber,
        capacity: parseFloat(batch.capacity) || 0,
        model: batch.model,
        start_date: batch.start_date || null,
        term_months: batch.term_months ? parseInt(batch.term_months, 10) : null,
        otc: batch.model === 'IRU' && batch.otc ? parseFloat(batch.otc) : null,
        om_rate: batch.model === 'IRU' && batch.om_rate ? parseFloat(batch.om_rate) : null,
        annual_om_cost: batch.model === 'IRU' && batch.annual_om_cost ? parseFloat(batch.annual_om_cost) : null,
        mrc: batch.model === 'Lease' && batch.mrc ? parseFloat(batch.mrc) : null,
        status: batch.status,
    }
}

export async function syncResourceBatches(
    resourceId: string,
    draftBatches: BatchRow[],
    isBatchMode: boolean,
): Promise<void> {
    const existing = (await fetchBatches(resourceId)) as Array<{ id: string }>

    if (!isBatchMode) {
        await Promise.all(existing.map((batch) => deleteBatch(batch.id)))
        return
    }

    const existingIds = new Set(existing.map((batch) => batch.id))
    const persistedDraftIds = new Set(
        draftBatches.filter((batch) => !isTempBatchId(batch.id)).map((batch) => batch.id),
    )

    const deleteIds = existing
        .filter((batch) => !persistedDraftIds.has(batch.id))
        .map((batch) => batch.id)
    if (deleteIds.length > 0) {
        await Promise.all(deleteIds.map((batchId) => deleteBatch(batchId)))
    }

    for (let index = 0; index < draftBatches.length; index++) {
        const draft = draftBatches[index]
        const payload = buildBatchWritePayload(draft, index + 1)

        if (isTempBatchId(draft.id) || !existingIds.has(draft.id)) {
            await createBatch({
                inventory_resource_id: resourceId,
                batch_number: payload.batch_number,
                capacity: payload.capacity,
                model: payload.model,
                start_date: payload.start_date ?? undefined,
                term_months: payload.term_months ?? undefined,
                otc: payload.otc ?? undefined,
                om_rate: payload.om_rate ?? undefined,
                annual_om_cost: payload.annual_om_cost ?? undefined,
                mrc: payload.mrc ?? undefined,
                status: payload.status,
            })
        } else {
            await updateBatch(draft.id, payload as unknown as Record<string, unknown>)
        }
    }
}
