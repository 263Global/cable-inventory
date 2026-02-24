import { Layers, Plus } from 'lucide-react'

interface InventoryBatchSummaryProps {
    totalCap: number
    batchTotalCap: number
    batchPct: number
    onToggleShowAddBatch: () => void
}

export function InventoryBatchSummary({
    totalCap,
    batchTotalCap,
    batchPct,
    onToggleShowAddBatch,
}: InventoryBatchSummaryProps) {
    return (
        <>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Batches</h2>
                    <span className="text-xs text-text-dim ml-2">{batchTotalCap}G lit of {totalCap}G base ({Math.round(batchPct)}%)</span>
                </div>
                <button
                    onClick={onToggleShowAddBatch}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                    <Plus className="h-3.5 w-3.5" /> Add Batch
                </button>
            </div>
            <div className="w-full h-2 bg-surface-hover rounded-full overflow-hidden mb-4">
                <div
                    className={`h-full rounded-full transition-all ${batchPct > 100 ? 'bg-destructive' : 'bg-primary'}`}
                    style={{ width: `${Math.min(batchPct, 100)}%` }}
                />
            </div>
        </>
    )
}
