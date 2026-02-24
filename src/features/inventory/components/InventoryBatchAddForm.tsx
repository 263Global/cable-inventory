import type { Dispatch, SetStateAction } from 'react'
import { Lock, Unlock } from 'lucide-react'
import { calcBatchTermToBaseEnd } from '@/lib/contract-utils'
import { formatCurrency } from '@/lib/utils'
import type { NewBatchForm } from '@/features/inventory/inventory-detail-types'

interface InventoryBatchAddFormProps {
    showAddBatch: boolean
    newBatch: NewBatchForm
    newBatchOmUnlocked: boolean
    baseStartDate: string | null
    baseTermMonths: number | null
    setNewBatch: Dispatch<SetStateAction<NewBatchForm>>
    onToggleNewBatchOmUnlocked: () => void
    onCancelAddBatch: () => void
    onSaveNewBatch: () => void
}

export function InventoryBatchAddForm({
    showAddBatch,
    newBatch,
    newBatchOmUnlocked,
    baseStartDate,
    baseTermMonths,
    setNewBatch,
    onToggleNewBatchOmUnlocked,
    onCancelAddBatch,
    onSaveNewBatch,
}: InventoryBatchAddFormProps) {
    if (!showAddBatch) return null

    return (
        <div className="mb-4 p-4 bg-background rounded-lg border border-primary/30 space-y-3">
            <h4 className="text-xs font-semibold text-primary uppercase tracking-wider">New Batch</h4>
            <div className="grid grid-cols-3 gap-3">
                <div>
                    <label className="block text-xs text-text-dim mb-1">Capacity (G) *</label>
                    <input
                        type="number"
                        value={newBatch.capacity}
                        onChange={(event) => setNewBatch((prev) => ({ ...prev, capacity: event.target.value }))}
                        placeholder="100"
                        className="w-full px-2.5 py-2 bg-surface border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                </div>
                <div>
                    <label className="block text-xs text-text-dim mb-1">Model</label>
                    <select
                        value={newBatch.model}
                        onChange={(event) => setNewBatch((prev) => ({ ...prev, model: event.target.value as NewBatchForm['model'] }))}
                        className="w-full px-2.5 py-2 bg-surface border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                    >
                        <option value="IRU">IRU</option>
                        <option value="Lease">Lease</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs text-text-dim mb-1">Start Date</label>
                    <input
                        type="date"
                        value={newBatch.start_date}
                        onChange={(event) => setNewBatch((prev) => ({ ...prev, start_date: event.target.value }))}
                        className="w-full px-2.5 py-2 bg-surface border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
                {newBatch.model === 'IRU' ? (
                    <>
                        <div>
                            <label className="block text-xs text-text-dim mb-1">OTC ($)</label>
                            <input
                                type="number"
                                value={newBatch.otc}
                                onChange={(event) => setNewBatch((prev) => ({ ...prev, otc: event.target.value }))}
                                placeholder="0"
                                className="w-full px-2.5 py-2 bg-surface border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-text-dim mb-1">O&M Rate (%)</label>
                            <input
                                type="number"
                                value={newBatch.om_rate}
                                onChange={(event) => setNewBatch((prev) => ({ ...prev, om_rate: event.target.value }))}
                                placeholder="4.0"
                                className="w-full px-2.5 py-2 bg-surface border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-xs text-text-dim">Annual O&M ($)</label>
                                <button
                                    onClick={onToggleNewBatchOmUnlocked}
                                    type="button"
                                    className="p-0.5 rounded hover:bg-surface-hover text-text-dim hover:text-text transition-colors cursor-pointer"
                                    title={newBatchOmUnlocked ? 'Lock to auto-calculate' : 'Unlock to manually override'}
                                >
                                    {newBatchOmUnlocked ? <Unlock className="h-3.5 w-3.5 text-warning" /> : <Lock className="h-3.5 w-3.5" />}
                                </button>
                            </div>
                            {newBatchOmUnlocked ? (
                                <>
                                    <input
                                        type="number"
                                        value={newBatch.annual_om_cost}
                                        onChange={(event) => setNewBatch((prev) => ({ ...prev, annual_om_cost: event.target.value }))}
                                        placeholder={String(Math.round((parseFloat(newBatch.otc) || 0) * (parseFloat(newBatch.om_rate) || 0) / 100))}
                                        className="w-full px-2.5 py-2 bg-surface border border-warning/50 rounded-lg text-text text-sm focus:outline-none focus:ring-1 focus:ring-warning"
                                    />
                                    <p className="text-xs text-text-dim mt-1">Calculated: {formatCurrency((parseFloat(newBatch.otc) || 0) * (parseFloat(newBatch.om_rate) || 0) / 100)}</p>
                                </>
                            ) : (
                                <p className="px-2.5 py-2 bg-surface/50 border border-border rounded-lg text-text text-sm opacity-70">
                                    {formatCurrency((parseFloat(newBatch.otc) || 0) * (parseFloat(newBatch.om_rate) || 0) / 100)}
                                </p>
                            )}
                        </div>
                    </>
                ) : (
                    <div>
                        <label className="block text-xs text-text-dim mb-1">MRC ($)</label>
                        <input
                            type="number"
                            value={newBatch.mrc}
                            onChange={(event) => setNewBatch((prev) => ({ ...prev, mrc: event.target.value }))}
                            placeholder="0"
                            className="w-full px-2.5 py-2 bg-surface border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                    </div>
                )}
            </div>
            {newBatch.start_date && baseStartDate && baseTermMonths && (
                <p className="text-xs text-text-dim">
                    Term: <span className="text-text font-medium">{calcBatchTermToBaseEnd(baseStartDate, baseTermMonths, newBatch.start_date)} months</span> (auto-calculated to Base end date)
                </p>
            )}
            <div className="flex justify-end gap-2">
                <button
                    onClick={onCancelAddBatch}
                    className="px-3 py-1.5 text-sm text-text-muted hover:text-text hover:bg-surface-hover rounded-lg transition-colors cursor-pointer"
                >
                    Cancel
                </button>
                <button
                    onClick={onSaveNewBatch}
                    disabled={!newBatch.capacity}
                    className="px-4 py-1.5 bg-primary hover:bg-primary-hover disabled:opacity-50 text-primary-foreground rounded-lg text-sm font-medium transition-colors cursor-pointer"
                >
                    Save Batch
                </button>
            </div>
        </div>
    )
}
