import { Ban, Loader2 } from 'lucide-react'
import type { TerminateItemDraft } from '@/features/sales/sales-detail-helpers'
import { SalesModalFrame } from '@/features/sales/components/lifecycle/SalesModalFrame'

interface TerminateOrderModalProps {
    open: boolean
    orderId: string
    terminateDate: string
    terminateReason: string
    items: TerminateItemDraft[]
    loading: boolean
    onClose: () => void
    onConfirm: () => void
    onTerminateDateChange: (value: string) => void
    onTerminateReasonChange: (value: string) => void
    onToggleItem: (index: number) => void
    onFeeChange: (index: number, fee: number) => void
}

export function TerminateOrderModal({
    open,
    orderId,
    terminateDate,
    terminateReason,
    items,
    loading,
    onClose,
    onConfirm,
    onTerminateDateChange,
    onTerminateReasonChange,
    onToggleItem,
    onFeeChange,
}: TerminateOrderModalProps) {
    return (
        <SalesModalFrame open={open} onClose={onClose} maxWidthClassName="max-w-lg">
            <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
                <Ban className="h-5 w-5 text-red-400" /> Terminate Order
            </h3>
            <p className="text-sm text-text-muted mb-4">
                Terminating <span className="font-medium text-text">{orderId}</span> - select items to terminate. Unselected items remain active.
            </p>

            <div className="space-y-3 mb-4">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs text-text-dim block mb-1">Termination Date</label>
                        <input
                            type="date"
                            value={terminateDate}
                            onChange={(event) => onTerminateDateChange(event.target.value)}
                            className="w-full bg-background border border-border-subtle rounded-lg px-3 py-2 text-sm"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-text-dim block mb-1">Reason (optional)</label>
                        <input
                            type="text"
                            value={terminateReason}
                            onChange={(event) => onTerminateReasonChange(event.target.value)}
                            placeholder="e.g. SLA breach"
                            className="w-full bg-background border border-border-subtle rounded-lg px-3 py-2 text-sm"
                        />
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                {items.map((item, index) => (
                    <div key={item.itemId} className={`bg-background rounded-lg border ${item.selected ? 'border-red-500/30' : 'border-border-subtle/50 opacity-50'} p-3 transition-opacity`}>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={item.selected}
                                onChange={() => onToggleItem(index)}
                                className="h-4 w-4 rounded border-border accent-red-500 cursor-pointer"
                            />
                            <span className="text-sm font-medium flex-1">{item.label}</span>
                        </label>
                        {item.selected && (
                            <div className="mt-2 ml-6">
                                <label className="text-xs text-text-dim block mb-1">Early Termination Fee ($)</label>
                                <input
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    value={item.fee}
                                    onChange={(event) => onFeeChange(index, parseFloat(event.target.value) || 0)}
                                    className="w-full max-w-[200px] bg-surface border border-border-subtle rounded-lg px-3 py-1.5 text-sm"
                                />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="flex justify-end gap-2 mt-4">
                <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg hover:bg-surface-hover transition-colors cursor-pointer">
                    Back
                </button>
                <button
                    onClick={onConfirm}
                    disabled={loading || !items.some((item) => item.selected)}
                    className="flex items-center gap-2 px-4 py-2 bg-destructive text-white rounded-lg text-sm font-medium hover:bg-destructive/90 transition-colors cursor-pointer disabled:opacity-50"
                >
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Confirm Terminate
                </button>
            </div>
        </SalesModalFrame>
    )
}
