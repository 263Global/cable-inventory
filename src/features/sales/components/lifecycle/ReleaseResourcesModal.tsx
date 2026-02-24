import { Loader2, Unlock } from 'lucide-react'
import type { ReleaseItemDraft } from '@/features/sales/sales-detail-helpers'
import { SalesModalFrame } from '@/features/sales/components/lifecycle/SalesModalFrame'

interface ReleaseResourcesModalProps {
    open: boolean
    items: ReleaseItemDraft[]
    loading: boolean
    onClose: () => void
    onConfirm: () => void
    onToggleItem: (index: number) => void
}

export function ReleaseResourcesModal({
    open,
    items,
    loading,
    onClose,
    onConfirm,
    onToggleItem,
}: ReleaseResourcesModalProps) {
    return (
        <SalesModalFrame open={open} onClose={onClose} maxWidthClassName="max-w-md">
            <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
                <Unlock className="h-5 w-5 text-amber-400" /> 释放资源
            </h3>
            <p className="text-sm text-text-muted mb-4">
                合同已到期，选择要释放的 item，电路将被回收、容量重新计算。
            </p>
            <div className="space-y-2">
                {items.map((item, index) => (
                    <div key={item.itemId} className={`bg-background rounded-lg border ${item.selected ? 'border-amber-500/30' : 'border-border-subtle/50 opacity-50'} p-3 transition-opacity`}>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={item.selected}
                                onChange={() => onToggleItem(index)}
                                className="h-4 w-4 rounded border-border accent-amber-500 cursor-pointer"
                            />
                            <span className="text-sm font-medium">{item.label}</span>
                        </label>
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
                    className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg text-sm font-medium hover:bg-amber-500/20 transition-colors cursor-pointer disabled:opacity-50"
                >
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    确认释放
                </button>
            </div>
        </SalesModalFrame>
    )
}
