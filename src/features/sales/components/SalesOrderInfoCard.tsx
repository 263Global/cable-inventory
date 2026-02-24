import type { SalesOrder } from '@/types'

export function SalesOrderInfoCard({ order }: { order: SalesOrder }) {
    return (
        <div className="bg-surface rounded-xl border border-border-subtle p-6 mb-6">
            <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-4">Order Information</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                    <span className="text-xs text-text-dim">Customer</span>
                    <p className="text-sm font-medium mt-0.5">{order.customer_name || '—'}</p>
                </div>
                <div>
                    <span className="text-xs text-text-dim">Internal Ref</span>
                    <p className="text-sm font-medium mt-0.5">{order.internal_ref || '—'}</p>
                </div>
                <div>
                    <span className="text-xs text-text-dim">Created</span>
                    <p className="text-sm font-medium mt-0.5">{new Date(order.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                    <span className="text-xs text-text-dim">Updated</span>
                    <p className="text-sm font-medium mt-0.5">{new Date(order.updated_at).toLocaleDateString()}</p>
                </div>
            </div>
            {order.notes && (
                <div className="mt-4 pt-4 border-t border-border-subtle">
                    <span className="text-xs text-text-dim">Notes</span>
                    <p className="text-sm mt-1 text-text-muted">{order.notes}</p>
                </div>
            )}
        </div>
    )
}
