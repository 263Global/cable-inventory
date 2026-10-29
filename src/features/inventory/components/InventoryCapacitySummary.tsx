import { formatCapacity, occupiedOf, type DeliverySegments, type DeliverySummary } from '@/lib/circuit-codes'
import { CapacitySegmentsBar, CapacitySummaryLine } from '@/components/capacity/CapacitySegmentsBar'
import { capacitySegmentStyles } from '@/components/capacity/capacity-styles'

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
        const parts = capacitySegmentStyles.map((style) => ({ ...style, value: segments[style.key] }))
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

    // 未录交付编号的资源保持原版式，但占用数与列表 / 看板同一套（含滚动软占用、复用（自用））
    const occupied = segments ? occupiedOf(segments) : usedCap
    return (
        <div className="mb-3">
            <div className="flex justify-between text-sm mb-2">
                <span className="font-medium">{occupied}G / {totalCap}G Allocated</span>
                <span className="text-text-muted">{totalCap > 0 ? Math.round((occupied / totalCap) * 100) : 0}%</span>
            </div>
            {segments && delivery ? (
                <CapacitySegmentsBar total={totalCap} segments={segments} delivery={delivery} height="h-3" />
            ) : (
                <div className="w-full h-3 bg-surface-hover rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all ${occupied >= totalCap ? 'bg-status-full' : 'bg-status-partial'}`}
                        style={{ width: `${totalCap > 0 ? Math.min((occupied / totalCap) * 100, 100) : 0}%` }}
                    />
                </div>
            )}
            <div className="flex gap-6 text-sm mt-2">
                <div>
                    <span className="inline-block w-2 h-2 rounded-full bg-status-available mr-2" />
                    <span className="text-text-muted">Remaining: </span>
                    <span className="font-medium">{totalCap - occupied}G</span>
                </div>
                <div>
                    <span className="inline-block w-2 h-2 rounded-full bg-status-partial mr-2" />
                    <span className="text-text-muted">Allocated: </span>
                    <span className="font-medium">{occupied}G</span>
                </div>
            </div>
            {segments && delivery && <CapacitySummaryLine segments={segments} delivery={delivery} />}
        </div>
    )
}
