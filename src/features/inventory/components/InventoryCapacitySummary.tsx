import { formatCapacity, type DeliverySegments, type DeliverySummary } from '@/lib/circuit-codes'

interface InventoryCapacitySummaryProps {
    /** 按交付编号判定的资源（有端口录了 SR / JOC）用六段拆分，其余保持原样 */
    delivery?: DeliverySummary
    segments?: DeliverySegments
    isBatchMode: boolean
    totalCap: number
    usedCap: number
    capUsedByCircuits: number
    capAvailable: number
    capUnlit: number
    plannedLit: number
    pctUsed: number
    pctAvailable: number
    pctPlanned: number
    provisionedCap: number
    circuitCount: number
}

export function InventoryCapacitySummary({
    isBatchMode,
    totalCap,
    usedCap,
    capUsedByCircuits,
    capAvailable,
    capUnlit,
    plannedLit,
    pctUsed,
    pctAvailable,
    pctPlanned,
    provisionedCap,
    circuitCount,
    delivery,
    segments,
}: InventoryCapacitySummaryProps) {
    if (delivery?.tracked && segments) {
        const share = (v: number) => (totalCap > 0 ? Math.min((v / totalCap) * 100, 100) : 0)
        const parts = [
            { key: 'hard', label: '硬占用', value: segments.hard, bar: 'bg-status-partial', dot: 'bg-status-partial' },
            { key: 'soft', label: '软占用·滚动', value: segments.soft, bar: 'bg-sky-500', dot: 'bg-sky-500' },
            { key: 'other', label: '其他占用', value: segments.other, bar: 'bg-text-dim/50', dot: 'bg-text-dim/50' },
            { key: 'sellable', label: '可售', value: segments.sellable, bar: 'bg-status-available', dot: 'bg-status-available' },
            { key: 'pending', label: '交付中（不可售）', value: segments.pending, bar: 'bg-pending-stripes', dot: 'bg-pending-stripes border border-amber-500/50' },
        ]
        return (
            <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium">Capacity Breakdown</span>
                    <span className="text-text-muted">
                        合同 {formatCapacity(delivery.contract)} · 已点亮 {formatCapacity(delivery.lit)} · 已交付 {formatCapacity(delivery.delivered)}
                    </span>
                </div>
                <div className="w-full h-3 bg-surface-hover rounded-full overflow-hidden flex">
                    {parts.map((part) => part.value > 0 && (
                        <div key={part.key} className={`h-full transition-all ${part.bar}`} style={{ width: `${share(part.value)}%` }} title={`${part.label}: ${part.value}G`} />
                    ))}
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs mt-3">
                    {[...parts, { key: 'unlit', label: '未点亮', value: segments.unlit, bar: '', dot: 'bg-surface-hover border border-border' }].map((part) => (
                        <div key={part.key} className="flex items-center gap-1.5">
                            <span className={`inline-block w-2.5 h-2.5 rounded-full ${part.dot}`} />
                            <span className="text-text-muted">{part.label}:</span>
                            <span className={`font-medium ${part.key === 'sellable' ? 'text-status-available' : ''}`}>{formatCapacity(part.value)}</span>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    if (isBatchMode) {
        return (
            <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium">Capacity Breakdown</span>
                    <span className="text-text-muted">{totalCap}G base</span>
                </div>
                <div className="w-full h-3 bg-surface-hover rounded-full overflow-hidden flex">
                    {pctUsed > 0 && (
                        <div className="h-full bg-status-partial transition-all" style={{ width: `${pctUsed}%` }} title={`Allocated: ${capUsedByCircuits}G`} />
                    )}
                    {pctAvailable > 0 && (
                        <div className="h-full bg-status-available transition-all" style={{ width: `${pctAvailable}%` }} title={`Available: ${capAvailable}G`} />
                    )}
                    {pctPlanned > 0 && (
                        <div className="h-full bg-info/40 transition-all" style={{ width: `${pctPlanned}%` }} title={`Planned: ${plannedLit}G`} />
                    )}
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs mt-3">
                    <div className="flex items-center gap-1.5">
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-status-partial" />
                        <span className="text-text-muted">Allocated:</span>
                        <span className="font-medium">{capUsedByCircuits}G</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-status-available" />
                        <span className="text-text-muted">Available:</span>
                        <span className="font-medium">{capAvailable}G</span>
                        {provisionedCap < capAvailable + capUsedByCircuits && (
                            <span className="text-text-dim">({circuitCount} circuit{circuitCount !== 1 ? 's' : ''}, {provisionedCap}G provisioned)</span>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-info/40" />
                        <span className="text-text-muted">Planned:</span>
                        <span className="font-medium">{plannedLit}G</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-surface-hover border border-border" />
                        <span className="text-text-muted">Unlit:</span>
                        <span className="font-medium">{capUnlit}G</span>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="mb-3">
            <div className="flex justify-between text-sm mb-2">
                <span className="font-medium">{usedCap}G / {totalCap}G Allocated</span>
                <span className="text-text-muted">{totalCap > 0 ? Math.round((usedCap / totalCap) * 100) : 0}%</span>
            </div>
            <div className="w-full h-3 bg-surface-hover rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all ${usedCap >= totalCap ? 'bg-status-full' : 'bg-status-partial'}`}
                    style={{ width: `${totalCap > 0 ? Math.min((usedCap / totalCap) * 100, 100) : 0}%` }}
                />
            </div>
            <div className="flex gap-6 text-sm mt-2">
                <div>
                    <span className="inline-block w-2 h-2 rounded-full bg-status-available mr-2" />
                    <span className="text-text-muted">Remaining: </span>
                    <span className="font-medium">{totalCap - usedCap}G</span>
                </div>
                <div>
                    <span className="inline-block w-2 h-2 rounded-full bg-status-partial mr-2" />
                    <span className="text-text-muted">Allocated: </span>
                    <span className="font-medium">{usedCap}G</span>
                </div>
            </div>
        </div>
    )
}
