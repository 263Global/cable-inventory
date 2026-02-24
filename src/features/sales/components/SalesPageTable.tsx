import type { MouseEvent } from 'react'
import { FileText, Loader2, Trash2 } from 'lucide-react'
import { salesStatusBadgeClass } from '@/lib/status-styles'
import type { SalesColumnDef } from '@/features/sales/sales-page-config'
import type { SalesOrder } from '@/types'

interface SalesPageTableProps {
    activeColumns: SalesColumnDef[]
    filteredOrders: SalesOrder[]
    loading: boolean
    ordersCount: number
    search: string
    onOpenDetail: (orderId: string) => void
    onRequestDelete: (order: SalesOrder) => void
}

export function SalesPageTable({
    activeColumns,
    filteredOrders,
    loading,
    ordersCount,
    search,
    onOpenDetail,
    onRequestDelete,
}: SalesPageTableProps) {
    const handleDeleteClick = (
        event: MouseEvent<HTMLButtonElement>,
        order: SalesOrder,
    ) => {
        event.stopPropagation()
        onRequestDelete(order)
    }

    if (loading) {
        return (
            <div className="bg-surface rounded-xl border border-border-subtle p-12 text-center">
                <Loader2 className="h-6 w-6 text-primary animate-spin mx-auto" />
            </div>
        )
    }

    if (filteredOrders.length === 0) {
        return (
            <div className="bg-surface rounded-xl border border-border-subtle p-12 text-center">
                <FileText className="h-12 w-12 text-text-dim mx-auto mb-4" />
                <p className="text-text-muted text-lg">
                    {ordersCount === 0 ? 'No sales orders yet' : 'No orders match your filters'}
                </p>
            </div>
        )
    }

    return (
        <div className="bg-surface rounded-xl border border-border-subtle overflow-hidden">
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border-subtle text-text-muted text-left">
                            {activeColumns.map((column) => (
                                <th key={column.key} className="px-4 py-3 text-xs font-semibold uppercase tracking-wider">
                                    {column.label}
                                </th>
                            ))}
                            <th className="w-12 px-4 py-3"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle/50">
                        {filteredOrders.map((order) => (
                            <tr
                                key={order.id}
                                onClick={() => onOpenDetail(order.id)}
                                className="hover:bg-surface-hover/50 cursor-pointer transition-colors"
                            >
                                {activeColumns.map((column) => (
                                    <td key={column.key} className="px-4 py-3">
                                        {column.render(order)}
                                    </td>
                                ))}
                                <td className="px-4 py-3">
                                    <button
                                        onClick={(event) => handleDeleteClick(event, order)}
                                        className="p-1.5 rounded-md hover:bg-destructive/10 text-text-dim hover:text-destructive transition-colors cursor-pointer"
                                        title="Delete"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="md:hidden divide-y divide-border-subtle/50">
                {filteredOrders.map((order) => (
                    <div
                        key={order.id}
                        onClick={() => onOpenDetail(order.id)}
                        className="px-4 py-3 hover:bg-surface-hover/50 cursor-pointer transition-colors active:bg-surface-hover"
                    >
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm font-semibold font-mono text-primary">{order.order_id}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${salesStatusBadgeClass[order.status]}`}>
                                {order.status}
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-text-muted">
                            <span>{order.customer_name || '—'}</span>
                            <span>{new Date(order.created_at).toLocaleDateString()}</span>
                        </div>
                        {order.internal_ref && <p className="text-xs text-text-dim mt-1">Ref: {order.internal_ref}</p>}
                    </div>
                ))}
            </div>

            <div className="px-4 py-3 border-t border-border-subtle text-xs text-text-dim">
                {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''}
                {search && ` (filtered from ${ordersCount})`}
            </div>
        </div>
    )
}
