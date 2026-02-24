import { Check, Lock, Pencil, Trash2, Unlock } from 'lucide-react'
import { BatchField } from '@/features/inventory/components/BatchField'
import { formatCurrency } from '@/lib/utils'
import { batchStatusColors } from '@/features/inventory/inventory-batch-ui'
import type { BatchRecord } from '@/features/inventory/inventory-detail-types'

interface InventoryBatchListProps {
    batches: BatchRecord[]
    showAddBatch: boolean
    editingBatchId: string | null
    omUnlockedBatches: Set<string>
    onSetEditingBatchId: (batchId: string | null) => void
    onDoneBatchEdit: (batchId: string) => void
    onToggleBatchOmUnlocked: (batchId: string) => void
    onDeleteBatch: (batchId: string) => void
    onUpdateBatchField: (batchId: string, field: string, value: string | number) => void
}

export function InventoryBatchList({
    batches,
    showAddBatch,
    editingBatchId,
    omUnlockedBatches,
    onSetEditingBatchId,
    onDoneBatchEdit,
    onToggleBatchOmUnlocked,
    onDeleteBatch,
    onUpdateBatchField,
}: InventoryBatchListProps) {
    if (batches.length === 0 && !showAddBatch) {
        return <p className="text-sm text-text-dim text-center py-4">No batches defined yet.</p>
    }

    return (
        <div className="space-y-2">
            {batches.map((batch) => {
                const isEditing = editingBatchId === batch.id
                const isOmUnlocked = omUnlockedBatches.has(batch.id)
                const calcOm = (Number(batch.otc) || 0) * (Number(batch.om_rate) || 0) / 100

                return (
                    <div key={batch.id} className={`p-3 bg-background rounded-lg border ${isEditing ? 'border-primary/30' : 'border-border-subtle'} transition-colors`}>
                        {isEditing ? (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-text-muted bg-surface px-2 py-1 rounded-full">B{batch.batch_number}</span>
                                        <select
                                            value={batch.model}
                                            onChange={(event) => onUpdateBatchField(batch.id, 'model', event.target.value)}
                                            className="px-2 py-1 bg-surface border border-border rounded text-xs cursor-pointer"
                                        >
                                            <option value="IRU">IRU</option>
                                            <option value="Lease">Lease</option>
                                        </select>
                                        <select
                                            value={batch.status}
                                            onChange={(event) => onUpdateBatchField(batch.id, 'status', event.target.value)}
                                            className={`px-2 py-1 rounded text-xs font-medium border-0 cursor-pointer ${batchStatusColors[batch.status]}`}
                                        >
                                            <option value="Planned">Planned</option>
                                            <option value="Active">Active</option>
                                            <option value="Ended">Ended</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => onDoneBatchEdit(batch.id)}
                                            className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors cursor-pointer"
                                        >
                                            <Check className="h-3 w-3" /> Done
                                        </button>
                                        <button
                                            onClick={() => onDeleteBatch(batch.id)}
                                            className="p-1.5 rounded-md hover:bg-destructive/10 text-text-dim hover:text-destructive transition-colors cursor-pointer"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <BatchField label="Capacity (G)" type="number" value={batch.capacity ?? ''} onSave={(value) => onUpdateBatchField(batch.id, 'capacity', Number(value))} />
                                    <BatchField label="Start Date" type="date" value={batch.start_date ?? ''} onSave={(value) => onUpdateBatchField(batch.id, 'start_date', value)} />
                                    <div>
                                        <label className="block text-xs text-text-dim mb-1">Term (auto)</label>
                                        <p className="px-2.5 py-1.5 bg-surface/50 border border-border rounded-lg text-text text-sm opacity-60">
                                            {batch.term_months ? `${batch.term_months} months` : '—'}
                                        </p>
                                    </div>
                                </div>
                                {batch.model === 'IRU' ? (
                                    <div className="grid grid-cols-3 gap-3">
                                        <BatchField label="OTC ($)" type="number" value={batch.otc ?? ''} onSave={(value) => onUpdateBatchField(batch.id, 'otc', Number(value))} />
                                        <BatchField label="O&M Rate (%)" type="number" value={batch.om_rate ?? ''} onSave={(value) => onUpdateBatchField(batch.id, 'om_rate', Number(value))} />
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="text-xs text-text-dim">Annual O&M ($)</label>
                                                <button
                                                    onClick={() => onToggleBatchOmUnlocked(batch.id)}
                                                    type="button"
                                                    className="p-0.5 rounded hover:bg-surface-hover text-text-dim hover:text-text transition-colors cursor-pointer"
                                                    title={isOmUnlocked ? 'Lock to auto-calculate' : 'Unlock to manually override'}
                                                >
                                                    {isOmUnlocked ? <Unlock className="h-3.5 w-3.5 text-warning" /> : <Lock className="h-3.5 w-3.5" />}
                                                </button>
                                            </div>
                                            {isOmUnlocked ? (
                                                <>
                                                    <BatchField label="" type="number" value={batch.annual_om_cost ?? ''} onSave={(value) => onUpdateBatchField(batch.id, 'annual_om_cost', Number(value))} />
                                                    <p className="text-xs text-text-dim mt-1">Calculated: {formatCurrency(calcOm)}</p>
                                                </>
                                            ) : (
                                                <p className="px-2.5 py-1.5 bg-surface/50 border border-border rounded-lg text-text text-sm opacity-70">
                                                    {batch.annual_om_cost ? formatCurrency(Number(batch.annual_om_cost)) : '—'}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-3 gap-3">
                                        <BatchField label="MRC ($)" type="number" value={batch.mrc ?? ''} onSave={(value) => onUpdateBatchField(batch.id, 'mrc', Number(value))} />
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-surface text-xs font-bold text-text-muted shrink-0">
                                    B{batch.batch_number}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium">{batch.capacity}G</span>
                                        <span className="text-xs text-text-dim">{batch.model}</span>
                                        <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${batchStatusColors[batch.status]}`}>{batch.status}</span>
                                    </div>
                                    <div className="text-xs text-text-dim mt-0.5">
                                        {batch.start_date || '—'} · {batch.term_months ? `${batch.term_months}mo` : '—'}
                                        {batch.model === 'IRU' && batch.otc ? ` · OTC ${formatCurrency(Number(batch.otc))}` : ''}
                                        {batch.model === 'IRU' && batch.annual_om_cost ? ` · O&M ${formatCurrency(Number(batch.annual_om_cost))}/yr` : ''}
                                        {batch.model === 'Lease' && batch.mrc ? ` · MRC ${formatCurrency(Number(batch.mrc))}` : ''}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <button
                                        onClick={() => onSetEditingBatchId(batch.id)}
                                        className="p-1.5 rounded-md hover:bg-surface-hover text-text-dim hover:text-text transition-colors cursor-pointer"
                                        title="Edit"
                                    >
                                        <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                        onClick={() => onDeleteBatch(batch.id)}
                                        className="p-1.5 rounded-md hover:bg-destructive/10 text-text-dim hover:text-destructive transition-colors cursor-pointer"
                                        title="Delete"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
