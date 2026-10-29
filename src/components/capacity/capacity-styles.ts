import { occupiedOf, type DeliverySegments } from '@/lib/circuit-codes'

/** 容量条各段：颜色与看板 / 资源详情图例一致 */
export const capacitySegmentStyles = [
    { key: 'hard', label: '硬占用', bar: 'bg-status-partial', dot: 'bg-status-partial' },
    { key: 'soft', label: '软占用·滚动', bar: 'bg-sky-500', dot: 'bg-sky-500' },
    { key: 'selfUse', label: '复用（自用）', bar: 'bg-violet-500', dot: 'bg-violet-500' },
    { key: 'other', label: '其他占用', bar: 'bg-text-dim/50', dot: 'bg-text-dim/50' },
    { key: 'sellable', label: '可售', bar: 'bg-status-available', dot: 'bg-status-available' },
    { key: 'pending', label: '交付中（不可售）', bar: 'bg-pending-stripes', dot: 'bg-pending-stripes border border-amber-500/50' },
] as const

/** 列表 / 看板右侧的数字：已占用 / 合同（占用率） */
export function capacityUsageLabel(total: number, segments: DeliverySegments): string {
    const occupied = occupiedOf(segments)
    const pct = total > 0 ? Math.round((occupied / total) * 100) : 0
    return `${occupied}/${total}G (${pct}%)`
}
