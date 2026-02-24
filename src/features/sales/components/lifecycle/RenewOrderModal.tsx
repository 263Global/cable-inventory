import { Loader2, RefreshCw } from 'lucide-react'
import type { RenewItemDraft } from '@/features/sales/sales-detail-helpers'
import { SalesModalFrame } from '@/features/sales/components/lifecycle/SalesModalFrame'

interface RenewOrderModalProps {
    open: boolean
    orderId: string
    items: RenewItemDraft[]
    loading: boolean
    onClose: () => void
    onConfirm: () => void
    onToggleItem: (index: number) => void
    onUpdateItem: (index: number, field: string, value: string | number) => void
}

export function RenewOrderModal({
    open,
    orderId,
    items,
    loading,
    onClose,
    onConfirm,
    onToggleItem,
    onUpdateItem,
}: RenewOrderModalProps) {
    return (
        <SalesModalFrame open={open} onClose={onClose} maxWidthClassName="max-w-lg">
            <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-emerald-400" /> Renew Order
            </h3>
            <p className="text-sm text-text-muted mb-4">
                Renewing <span className="font-medium text-text">{orderId}</span> - only Lease Out / Swap Out items shown.
            </p>
            <div className="space-y-4">
                {items.map((item, index) => (
                    <div key={item.itemId} className={`bg-background rounded-lg border ${item.selected ? 'border-border-subtle' : 'border-border-subtle/50 opacity-50'} p-4 transition-opacity`}>
                        <label className="flex items-center gap-2 mb-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={item.selected}
                                onChange={() => onToggleItem(index)}
                                className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                            />
                            <span className="text-sm font-medium">{item.label}</span>
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-text-dim block mb-1">Start Date</label>
                                <input
                                    type="date"
                                    value={item.startDate}
                                    onChange={(event) => onUpdateItem(index, 'startDate', event.target.value)}
                                    className="w-full bg-surface border border-border-subtle rounded-lg px-3 py-2 text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-text-dim block mb-1">Term (months)</label>
                                <input
                                    type="number"
                                    min={1}
                                    value={item.termMonths}
                                    onChange={(event) => onUpdateItem(index, 'termMonths', parseInt(event.target.value, 10) || 1)}
                                    className="w-full bg-surface border border-border-subtle rounded-lg px-3 py-2 text-sm"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="text-xs text-text-dim block mb-1">End Date</label>
                                <input
                                    type="date"
                                    value={item.endDate}
                                    readOnly
                                    className="w-full bg-surface border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-dim"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-text-dim block mb-1">MRC</label>
                                <input
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    value={item.mrc}
                                    onChange={(event) => onUpdateItem(index, 'mrc', parseFloat(event.target.value) || 0)}
                                    className="w-full bg-surface border border-border-subtle rounded-lg px-3 py-2 text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-text-dim block mb-1">NRC</label>
                                <input
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    value={item.nrc}
                                    onChange={(event) => onUpdateItem(index, 'nrc', parseFloat(event.target.value) || 0)}
                                    className="w-full bg-surface border border-border-subtle rounded-lg px-3 py-2 text-sm"
                                />
                            </div>
                        </div>
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
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-sm font-medium hover:bg-emerald-500/20 transition-colors cursor-pointer disabled:opacity-50"
                >
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Confirm Renew
                </button>
            </div>
        </SalesModalFrame>
    )
}
