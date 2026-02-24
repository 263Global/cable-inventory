import { History } from 'lucide-react'
import { salesStatusBadgeClass } from '@/lib/status-styles'
import { formatCurrency } from '@/lib/utils'
import type { SalesOrder, SalesStatus } from '@/types'

export function SalesRenewalHistoryCard({ order }: { order: SalesOrder }) {
    if (!order.renewal_history || order.renewal_history.length === 0) return null

    return (
        <div className="bg-surface rounded-xl border border-border-subtle p-6 mb-6">
            <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                <History className="h-4 w-4" />
                Renewal History ({order.renewal_history.length})
            </h2>
            <div className="space-y-3">
                {[...order.renewal_history].reverse().map((snapshot, idx) => {
                    const key = `${snapshot.renewed_at}-${idx}`
                    return (
                        <div key={key} className="bg-background rounded-lg border border-border-subtle p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-text-dim">
                                    Renewed on {new Date(snapshot.renewed_at).toLocaleDateString()}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${salesStatusBadgeClass[(snapshot.old_status as SalesStatus) ?? 'Draft']}`}>
                                    was {snapshot.old_status}
                                </span>
                            </div>
                            {snapshot.items.map((item, index) => (
                                <div key={index} className="text-xs text-text-muted mt-1">
                                    {item.old_start_date ?? '—'} → {item.old_end_date ?? '—'}
                                    {item.old_term_months ? <span className="ml-1">({item.old_term_months}mo)</span> : null}
                                    {item.old_mrc != null ? <span className="ml-2">MRC: {formatCurrency(item.old_mrc)}</span> : null}
                                </div>
                            ))}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
