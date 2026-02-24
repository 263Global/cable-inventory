import { AlertTriangle, Ban, Loader2, RefreshCw } from 'lucide-react'

export interface ResourceTerminateWarning {
    activeOrders: { order_id: string; customer_name: string | null }[]
    allocatedCircuitCount: number
}

export interface ResourceRenewForm {
    startDate: string
    termMonths: number
    endDate: string
    mrc: number
    nrc: number
}

export function TerminateResourceModal({
    open,
    resourceId,
    terminateWarning,
    terminateDate,
    terminateReason,
    loading,
    onClose,
    onConfirm,
    onTerminateDateChange,
    onTerminateReasonChange,
}: {
    open: boolean
    resourceId: string
    terminateWarning: ResourceTerminateWarning | null
    terminateDate: string
    terminateReason: string
    loading: boolean
    onClose: () => void
    onConfirm: () => void
    onTerminateDateChange: (value: string) => void
    onTerminateReasonChange: (value: string) => void
}) {
    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
            <div className="bg-surface rounded-xl border border-border-subtle p-6 w-full max-w-md mx-4" onClick={(event) => event.stopPropagation()}>
                <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
                    <Ban className="h-5 w-5 text-red-400" /> Terminate Resource
                </h3>
                <p className="text-sm text-text-muted mb-4">
                    This will terminate <span className="font-medium text-text">{resourceId}</span> and release all allocated circuits.
                </p>

                {terminateWarning && (terminateWarning.activeOrders.length > 0 || terminateWarning.allocatedCircuitCount > 0) && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-4">
                        <p className="text-sm font-medium text-amber-400 flex items-center gap-1.5 mb-1">
                            <AlertTriangle className="h-4 w-4" /> Warning
                        </p>
                        {terminateWarning.allocatedCircuitCount > 0 && (
                            <p className="text-xs text-text-muted">{terminateWarning.allocatedCircuitCount} allocated circuit(s) will be released.</p>
                        )}
                        {terminateWarning.activeOrders.length > 0 && (
                            <div className="mt-1">
                                <p className="text-xs text-text-muted">Linked Active/Pre-sold orders:</p>
                                {terminateWarning.activeOrders.map((order) => (
                                    <p key={order.order_id} className="text-xs text-amber-400 mt-0.5">
                                        {order.order_id} - {order.customer_name ?? 'Unknown'}
                                    </p>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className="space-y-3">
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
                        <textarea
                            value={terminateReason}
                            onChange={(event) => onTerminateReasonChange(event.target.value)}
                            placeholder="e.g. SLA breach, cost optimization"
                            className="w-full bg-background border border-border-subtle rounded-lg px-3 py-2 text-sm resize-none h-20"
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                    <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg hover:bg-surface-hover transition-colors cursor-pointer">Back</button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-destructive text-white rounded-lg text-sm font-medium hover:bg-destructive/90 transition-colors cursor-pointer disabled:opacity-50"
                    >
                        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                        Confirm Terminate
                    </button>
                </div>
            </div>
        </div>
    )
}

export function RenewResourceModal({
    open,
    resourceId,
    acquisitionType,
    renewForm,
    loading,
    onClose,
    onConfirm,
    onStartDateChange,
    onTermMonthsChange,
    onMrcChange,
    onNrcChange,
}: {
    open: boolean
    resourceId: string
    acquisitionType: string
    renewForm: ResourceRenewForm
    loading: boolean
    onClose: () => void
    onConfirm: () => void
    onStartDateChange: (value: string) => void
    onTermMonthsChange: (value: number) => void
    onMrcChange: (value: number) => void
    onNrcChange: (value: number) => void
}) {
    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
            <div className="bg-surface rounded-xl border border-border-subtle p-6 w-full max-w-md mx-4" onClick={(event) => event.stopPropagation()}>
                <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
                    <RefreshCw className="h-5 w-5 text-emerald-400" /> Renew Resource
                </h3>
                <p className="text-sm text-text-muted mb-4">
                    Renewing <span className="font-medium text-text">{resourceId}</span>
                </p>
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-text-dim block mb-1">Start Date</label>
                            <input
                                type="date"
                                value={renewForm.startDate}
                                onChange={(event) => onStartDateChange(event.target.value)}
                                className="w-full bg-background border border-border-subtle rounded-lg px-3 py-2 text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-text-dim block mb-1">Term (months)</label>
                            <input
                                type="number"
                                min={1}
                                value={renewForm.termMonths}
                                onChange={(event) => onTermMonthsChange(parseInt(event.target.value, 10) || 1)}
                                className="w-full bg-background border border-border-subtle rounded-lg px-3 py-2 text-sm"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs text-text-dim block mb-1">End Date</label>
                        <input
                            type="date"
                            value={renewForm.endDate}
                            readOnly
                            className="w-full bg-background border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-dim"
                        />
                    </div>
                    {acquisitionType === 'Swap-In' ? (
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-text-dim block mb-1">OTC</label>
                                <input
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    value={renewForm.mrc}
                                    onChange={(event) => onMrcChange(parseFloat(event.target.value) || 0)}
                                    className="w-full bg-background border border-border-subtle rounded-lg px-3 py-2 text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-text-dim block mb-1">O&M Rate (%)</label>
                                <input
                                    type="number"
                                    min={0}
                                    step={0.1}
                                    value={renewForm.nrc}
                                    onChange={(event) => onNrcChange(parseFloat(event.target.value) || 0)}
                                    className="w-full bg-background border border-border-subtle rounded-lg px-3 py-2 text-sm"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-text-dim block mb-1">MRC</label>
                                <input
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    value={renewForm.mrc}
                                    onChange={(event) => onMrcChange(parseFloat(event.target.value) || 0)}
                                    className="w-full bg-background border border-border-subtle rounded-lg px-3 py-2 text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-text-dim block mb-1">NRC</label>
                                <input
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    value={renewForm.nrc}
                                    onChange={(event) => onNrcChange(parseFloat(event.target.value) || 0)}
                                    className="w-full bg-background border border-border-subtle rounded-lg px-3 py-2 text-sm"
                                />
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex justify-end gap-2 mt-4">
                    <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg hover:bg-surface-hover transition-colors cursor-pointer">Back</button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-sm font-medium hover:bg-emerald-500/20 transition-colors cursor-pointer disabled:opacity-50"
                    >
                        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                        Confirm Renew
                    </button>
                </div>
            </div>
        </div>
    )
}
