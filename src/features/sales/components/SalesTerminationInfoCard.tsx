import { AlertTriangle } from 'lucide-react'
import type { SalesOrder } from '@/types'

export function SalesTerminationInfoCard({ order }: { order: SalesOrder }) {
    if (!order.terminated_at) return null

    return (
        <div className="bg-red-500/5 rounded-xl border border-red-500/20 p-6 mb-6">
            <h2 className="text-sm font-medium text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                {order.status === 'Cancelled' ? 'Cancellation' : 'Termination'} Info
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                    <span className="text-xs text-text-dim">Date</span>
                    <p className="text-sm font-medium mt-0.5">{order.terminated_at}</p>
                </div>
                <div className="col-span-2">
                    <span className="text-xs text-text-dim">Reason</span>
                    <p className="text-sm mt-0.5 text-text-muted">{order.termination_reason || '—'}</p>
                </div>
            </div>
        </div>
    )
}
