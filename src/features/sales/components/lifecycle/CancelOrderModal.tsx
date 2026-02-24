import { Loader2, XCircle } from 'lucide-react'
import { SalesModalFrame } from '@/features/sales/components/lifecycle/SalesModalFrame'

interface CancelOrderModalProps {
    open: boolean
    orderId: string
    reason: string
    loading: boolean
    onReasonChange: (value: string) => void
    onClose: () => void
    onConfirm: () => void
}

export function CancelOrderModal({
    open,
    orderId,
    reason,
    loading,
    onReasonChange,
    onClose,
    onConfirm,
}: CancelOrderModalProps) {
    return (
        <SalesModalFrame open={open} onClose={onClose} maxWidthClassName="max-w-md">
            <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
                <XCircle className="h-5 w-5 text-amber-400" /> Cancel Order
            </h3>
            <p className="text-sm text-text-muted mb-4">
                This will cancel <span className="font-medium text-text">{orderId}</span> and release any allocated circuits.
            </p>
            <div className="space-y-3">
                <div>
                    <label className="text-xs text-text-dim block mb-1">Reason (optional)</label>
                    <textarea
                        value={reason}
                        onChange={(event) => onReasonChange(event.target.value)}
                        placeholder="e.g. Customer withdrew before service start"
                        className="w-full bg-background border border-border-subtle rounded-lg px-3 py-2 text-sm resize-none h-20"
                    />
                </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
                <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg hover:bg-surface-hover transition-colors cursor-pointer">
                    Back
                </button>
                <button
                    onClick={onConfirm}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg text-sm font-medium hover:bg-amber-500/20 transition-colors cursor-pointer disabled:opacity-50"
                >
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Confirm Cancel
                </button>
            </div>
        </SalesModalFrame>
    )
}
