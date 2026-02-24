import { Plus, Trash2 } from 'lucide-react'
import { InventoryFormField } from '@/features/inventory/components/InventoryFormField'
import type { BatchRow } from '@/features/inventory/form-batches'
import type { InventoryFormState } from '@/features/inventory/inventory-form-types'

interface InventoryContractCostsStepProps {
    form: InventoryFormState
    isBatchMode: boolean
    isIRU: boolean
    isLease: boolean
    batches: BatchRow[]
    batchTotalCapacity: number
    baseCapacity: number
    batchCapacityExceeded: boolean
    onUpdateForm: (key: keyof InventoryFormState, value: string) => void
    onUpdateBatchRow: (batchId: string, key: keyof BatchRow, value: string) => void
    onAddBatch: () => void
    onRemoveBatch: (batchId: string) => void
}

export function InventoryContractCostsStep({
    form,
    isBatchMode,
    isIRU,
    isLease,
    batches,
    batchTotalCapacity,
    baseCapacity,
    batchCapacityExceeded,
    onUpdateForm,
    onUpdateBatchRow,
    onAddBatch,
    onRemoveBatch,
}: InventoryContractCostsStepProps) {
    return (
        <div className="space-y-5">
            <div>
                <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">
                    {isBatchMode ? 'Base Contract' : 'Contract Period'}
                </h3>
                <div className="grid grid-cols-3 gap-4">
                    <InventoryFormField
                        label={isBatchMode ? 'Base Term (Months)' : 'Term (Months)'}
                        value={form.term_months}
                        onChange={(value) => onUpdateForm('term_months', value)}
                        type="number"
                        placeholder="e.g. 180"
                    />
                    <InventoryFormField
                        label="Start Date"
                        value={form.start_date}
                        onChange={(value) => onUpdateForm('start_date', value)}
                        type="date"
                    />
                    <InventoryFormField
                        label="End Date (auto)"
                        value={form.end_date}
                        onChange={(value) => onUpdateForm('end_date', value)}
                        type="date"
                    />
                </div>
            </div>

            {!isBatchMode && isIRU && (
                <div className="p-4 rounded-lg border border-border-subtle bg-background">
                    <h3 className="text-sm font-semibold mb-4 text-primary">IRU Financials</h3>
                    <div className="grid grid-cols-3 gap-4">
                        <InventoryFormField label="OTC ($)" value={form.otc} onChange={(value) => onUpdateForm('otc', value)} type="number" placeholder="450000" />
                        <InventoryFormField label="O&M Rate (%)" value={form.om_rate} onChange={(value) => onUpdateForm('om_rate', value)} type="number" placeholder="4.0" />
                        <InventoryFormField label="Annual O&M ($)" value={form.annual_om_cost} onChange={(value) => onUpdateForm('annual_om_cost', value)} type="number" placeholder="Auto or override" />
                    </div>
                </div>
            )}

            {!isBatchMode && isLease && (
                <div className="p-4 rounded-lg border border-border-subtle bg-background">
                    <h3 className="text-sm font-semibold mb-4 text-primary">Lease Financials</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <InventoryFormField label="MRC ($)" value={form.mrc} onChange={(value) => onUpdateForm('mrc', value)} type="number" placeholder="5000" />
                        <InventoryFormField label="NRC ($)" value={form.nrc} onChange={(value) => onUpdateForm('nrc', value)} type="number" placeholder="10000" />
                    </div>
                </div>
            )}

            {isBatchMode && (
                <div className="p-4 rounded-lg border border-border-subtle bg-background">
                    <h3 className="text-sm font-semibold mb-4 text-primary">Base Cost (IRU)</h3>
                    <div className="grid grid-cols-3 gap-4">
                        <InventoryFormField label="Base OTC ($)" value={form.otc} onChange={(value) => onUpdateForm('otc', value)} type="number" placeholder="450000" />
                        <InventoryFormField label="Base O&M Rate (%)" value={form.om_rate} onChange={(value) => onUpdateForm('om_rate', value)} type="number" placeholder="4.0" />
                        <InventoryFormField label="Base Annual O&M ($)" value={form.annual_om_cost} onChange={(value) => onUpdateForm('annual_om_cost', value)} type="number" placeholder="Auto or override" />
                    </div>
                </div>
            )}

            {isBatchMode && (
                <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-sm font-semibold text-primary">Batches</h3>
                            <p className="text-xs text-text-dim mt-0.5">
                                {batches.length} batch{batches.length !== 1 ? 'es' : ''} · {batchTotalCapacity}G of {baseCapacity || '—'}G base
                                {batchCapacityExceeded && <span className="text-destructive ml-2 font-medium">⚠ Exceeds base capacity!</span>}
                            </p>
                        </div>
                        <button
                            onClick={onAddBatch}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-medium transition-colors cursor-pointer"
                        >
                            <Plus className="h-3.5 w-3.5" /> Add Batch
                        </button>
                    </div>

                    {baseCapacity > 0 && (
                        <div className="mb-4">
                            <div className="w-full h-2 bg-surface-hover rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all ${batchCapacityExceeded ? 'bg-destructive' : 'bg-primary'}`}
                                    style={{ width: `${Math.min((batchTotalCapacity / baseCapacity) * 100, 100)}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {batches.length === 0 ? (
                        <p className="text-sm text-text-dim text-center py-6">No batches yet. Add batches to define lit capacity portions.</p>
                    ) : (
                        <div className="space-y-3">
                            {batches.map((batch, index) => (
                                <div key={batch.id} className="p-3 bg-background rounded-lg border border-border-subtle">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs font-bold text-text-muted">Batch #{index + 1}</span>
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={batch.model}
                                                onChange={(event) => onUpdateBatchRow(batch.id, 'model', event.target.value)}
                                                className="px-2 py-1 bg-surface border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                                            >
                                                <option value="IRU">IRU</option>
                                                <option value="Lease">Lease</option>
                                            </select>
                                            <select
                                                value={batch.status}
                                                onChange={(event) => onUpdateBatchRow(batch.id, 'status', event.target.value)}
                                                className="px-2 py-1 bg-surface border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                                            >
                                                <option value="Planned">Planned</option>
                                                <option value="Active">Active</option>
                                                <option value="Ended">Ended</option>
                                            </select>
                                            <button
                                                onClick={() => onRemoveBatch(batch.id)}
                                                className="p-1 rounded hover:bg-destructive/10 text-text-dim hover:text-destructive cursor-pointer"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-4 gap-3">
                                        <InventoryFormField label="Capacity (G)" value={batch.capacity} onChange={(value) => onUpdateBatchRow(batch.id, 'capacity', value)} type="number" placeholder="100" />
                                        <InventoryFormField label="Start Date" value={batch.start_date} onChange={(value) => onUpdateBatchRow(batch.id, 'start_date', value)} type="date" />
                                        <InventoryFormField label="Term (auto)" value={batch.term_months} onChange={(value) => onUpdateBatchRow(batch.id, 'term_months', value)} type="number" placeholder="Auto" />
                                        {batch.model === 'IRU' ? (
                                            <InventoryFormField label="OTC ($)" value={batch.otc} onChange={(value) => onUpdateBatchRow(batch.id, 'otc', value)} type="number" placeholder="0" />
                                        ) : (
                                            <InventoryFormField label="MRC ($)" value={batch.mrc} onChange={(value) => onUpdateBatchRow(batch.id, 'mrc', value)} type="number" placeholder="0" />
                                        )}
                                    </div>

                                    {batch.model === 'IRU' && (
                                        <div className="grid grid-cols-2 gap-3 mt-3">
                                            <InventoryFormField label="O&M Rate (%)" value={batch.om_rate} onChange={(value) => onUpdateBatchRow(batch.id, 'om_rate', value)} type="number" placeholder="4.0" />
                                            <InventoryFormField label="Annual O&M ($)" value={batch.annual_om_cost} onChange={(value) => onUpdateBatchRow(batch.id, 'annual_om_cost', value)} type="number" placeholder="Auto or override" />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
