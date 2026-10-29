import { formatCapacity, occupiedOf, type DeliverySegments, type DeliverySummary } from '@/lib/circuit-codes'
import { capacitySegmentStyles } from '@/components/capacity/capacity-styles'


interface CapacitySegmentsBarProps {
    total: number
    segments: DeliverySegments
    delivery: DeliverySummary
    /** 条下面是否显示合同 / 已点亮 / 已交付 / 可售 … 一行 */
    showSummary?: boolean
    height?: string
}

export function CapacitySegmentsBar({ total, segments, delivery, showSummary = false, height = 'h-2' }: CapacitySegmentsBarProps) {
    const share = (v: number) => (total > 0 ? Math.min((v / total) * 100, 100) : 0)
    const occupied = occupiedOf(segments)
    return (
        <div className="w-full">
            <div
                className={`w-full ${height} bg-surface-hover rounded-full overflow-hidden flex`}
                aria-label={`occupied ${occupied}G, sellable ${segments.sellable}G of ${total}G`}
            >
                {capacitySegmentStyles.map((style) => {
                    const value = segments[style.key]
                    // 未按交付编号判定的资源：空闲部分保持浅底色（原"可用"样式），不涂成可售绿
                    if (style.key === 'sellable' && !delivery.tracked) return null
                    return value > 0 ? (
                        <div key={style.key} className={`h-full ${style.bar}`} style={{ width: `${share(value)}%` }} title={`${style.label} ${value}G`} />
                    ) : null
                })}
            </div>
            {showSummary && <CapacitySummaryLine segments={segments} delivery={delivery} />}
        </div>
    )
}

/** 条下面的一行数字：按交付编号判定的资源写全六项；其余只在有复用 / 软占用时提示 */
export function CapacitySummaryLine({ segments, delivery }: { segments: DeliverySegments; delivery: DeliverySummary }) {
    const occupied = occupiedOf(segments)
    if (!delivery.tracked && segments.selfUse === 0 && segments.soft === 0) return null
    return (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] text-text-dim">
            {delivery.tracked ? (
                <>
                    <span>合同 {formatCapacity(delivery.contract)}</span>
                    <span>已点亮 {formatCapacity(delivery.lit)}</span>
                    <span className="text-text-muted">已交付 {formatCapacity(delivery.delivered)}（占用 {formatCapacity(occupied)}）</span>
                    <span className="font-semibold text-status-available">可售 {formatCapacity(segments.sellable)}</span>
                    {segments.pending > 0 && <span className="text-amber-600 dark:text-amber-400">交付中 {formatCapacity(segments.pending)}</span>}
                    {segments.unlit > 0 && <span>未点亮 {formatCapacity(segments.unlit)}</span>}
                </>
            ) : (
                <>
                    {segments.selfUse > 0 && <span className="font-medium text-violet-600 dark:text-violet-400">复用（自用） {formatCapacity(segments.selfUse)}</span>}
                    {segments.soft > 0 && <span className="text-sky-600 dark:text-sky-400">软占用·滚动 {formatCapacity(segments.soft)}</span>}
                </>
            )}
        </div>
    )
}
