import type { Dispatch, SetStateAction } from 'react'
import { InventoryBatchAddForm } from '@/features/inventory/components/InventoryBatchAddForm'
import { InventoryBatchList } from '@/features/inventory/components/InventoryBatchList'
import { InventoryBatchSummary } from '@/features/inventory/components/InventoryBatchSummary'
import type { BatchRecord, NewBatchForm } from '@/features/inventory/inventory-detail-types'

interface InventoryBatchCardProps {
    totalCap: number
    batchTotalCap: number
    batchPct: number
    baseStartDate: string | null
    baseTermMonths: number | null
    showAddBatch: boolean
    editingBatchId: string | null
    newBatch: NewBatchForm
    batches: BatchRecord[]
    newBatchOmUnlocked: boolean
    omUnlockedBatches: Set<string>
    setNewBatch: Dispatch<SetStateAction<NewBatchForm>>
    onToggleShowAddBatch: () => void
    onToggleNewBatchOmUnlocked: () => void
    onCancelAddBatch: () => void
    onSaveNewBatch: () => void
    onSetEditingBatchId: (batchId: string | null) => void
    onDoneBatchEdit: (batchId: string) => void
    onToggleBatchOmUnlocked: (batchId: string) => void
    onDeleteBatch: (batchId: string) => void
    onUpdateBatchField: (batchId: string, field: string, value: string | number) => void
}

export function InventoryBatchCard({
    totalCap,
    batchTotalCap,
    batchPct,
    baseStartDate,
    baseTermMonths,
    showAddBatch,
    editingBatchId,
    newBatch,
    batches,
    newBatchOmUnlocked,
    omUnlockedBatches,
    setNewBatch,
    onToggleShowAddBatch,
    onToggleNewBatchOmUnlocked,
    onCancelAddBatch,
    onSaveNewBatch,
    onSetEditingBatchId,
    onDoneBatchEdit,
    onToggleBatchOmUnlocked,
    onDeleteBatch,
    onUpdateBatchField,
}: InventoryBatchCardProps) {
    return (
        <div className="bg-surface rounded-xl border border-border-subtle p-6">
            <InventoryBatchSummary
                totalCap={totalCap}
                batchTotalCap={batchTotalCap}
                batchPct={batchPct}
                onToggleShowAddBatch={onToggleShowAddBatch}
            />

            <InventoryBatchAddForm
                showAddBatch={showAddBatch}
                newBatch={newBatch}
                newBatchOmUnlocked={newBatchOmUnlocked}
                baseStartDate={baseStartDate}
                baseTermMonths={baseTermMonths}
                setNewBatch={setNewBatch}
                onToggleNewBatchOmUnlocked={onToggleNewBatchOmUnlocked}
                onCancelAddBatch={onCancelAddBatch}
                onSaveNewBatch={onSaveNewBatch}
            />

            <InventoryBatchList
                batches={batches}
                showAddBatch={showAddBatch}
                editingBatchId={editingBatchId}
                omUnlockedBatches={omUnlockedBatches}
                onSetEditingBatchId={onSetEditingBatchId}
                onDoneBatchEdit={onDoneBatchEdit}
                onToggleBatchOmUnlocked={onToggleBatchOmUnlocked}
                onDeleteBatch={onDeleteBatch}
                onUpdateBatchField={onUpdateBatchField}
            />
        </div>
    )
}
