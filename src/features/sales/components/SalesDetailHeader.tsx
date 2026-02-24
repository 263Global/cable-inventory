import { ArrowLeft, Ban, FileText, Pencil, RefreshCw, Trash2, XCircle } from 'lucide-react'
import { salesStatusBadgeClass } from '@/lib/status-styles'
import type { SalesOrder } from '@/types'

interface SalesDetailHeaderProps {
    order: SalesOrder
    canRenew: boolean
    onBack: () => void
    onOpenCancel: () => void
    onOpenTerminate: () => void
    onOpenRenew: () => void
    onEdit: () => void
    onDeleteOrder: () => void
}

export function SalesDetailHeader({
    order,
    canRenew,
    onBack,
    onOpenCancel,
    onOpenTerminate,
    onOpenRenew,
    onEdit,
    onDeleteOrder,
}: SalesDetailHeaderProps) {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
                <button onClick={onBack} className="p-2 rounded-lg hover:bg-surface-hover transition-colors cursor-pointer">
                    <ArrowLeft className="h-5 w-5 text-text-muted" />
                </button>
                <FileText className="h-6 w-6 text-primary shrink-0" />
                <h1 className="text-xl font-bold font-mono">{order.order_id}</h1>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${salesStatusBadgeClass[order.status]}`}>
                    {order.status}
                </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
                {order.status === 'Pre-sold' && (
                    <button
                        onClick={onOpenCancel}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm font-medium text-amber-400 hover:bg-amber-500/20 transition-colors cursor-pointer"
                    >
                        <XCircle className="h-4 w-4" /> Cancel
                    </button>
                )}
                {order.status === 'Active' && (
                    <button
                        onClick={onOpenTerminate}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
                    >
                        <Ban className="h-4 w-4" /> Terminate
                    </button>
                )}
                {canRenew && order.status === 'Active' && (
                    <button
                        onClick={onOpenRenew}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                    >
                        <RefreshCw className="h-4 w-4" /> Renew
                    </button>
                )}
                <button
                    onClick={onEdit}
                    className="flex items-center gap-2 px-4 py-2 bg-surface border border-border-subtle rounded-lg text-sm font-medium text-text hover:bg-surface-hover transition-colors cursor-pointer"
                >
                    <Pencil className="h-4 w-4" /> Edit
                </button>
                <button
                    onClick={onDeleteOrder}
                    className="flex items-center gap-2 px-4 py-2 bg-destructive/10 border border-destructive/20 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/20 transition-colors cursor-pointer"
                >
                    <Trash2 className="h-4 w-4" /> Delete
                </button>
            </div>
        </div>
    )
}
