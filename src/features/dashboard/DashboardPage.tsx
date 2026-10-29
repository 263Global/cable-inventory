import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    LayoutDashboard, Database, HardDrive, FileText, AlertTriangle,
    TrendingUp, Clock, ExternalLink, Loader2, Repeat, DollarSign, PackageCheck,
} from 'lucide-react'
import { ContractStateBadge } from '@/components/contract/ContractStateBadge'
import { formatCapacity } from '@/lib/circuit-codes'
import { CapacitySegmentsBar } from '@/components/capacity/CapacitySegmentsBar'
import { capacitySegmentStyles, capacityUsageLabel } from '@/components/capacity/capacity-styles'
import { formatCurrency } from '@/lib/utils'
import { salesStatusBadgeClass, resourceTypeTextClass } from '@/lib/status-styles'
import { useDashboardData } from '@/features/dashboard/useDashboardData'

export function DashboardPage() {
    const navigate = useNavigate()
    const [showFull, setShowFull] = useState(false)
    const { loading, kpi, resources, pipeline, expiring, recent, expiredUnreleased, rolling, revenue } = useDashboardData()

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
        )
    }

    const utilizationPct = kpi.totalCapacity > 0 ? Math.round(((kpi.hardCapacity + kpi.softCapacity + kpi.selfUseCapacity) / kpi.totalCapacity) * 100) : 0
    const hardPctAll = kpi.totalCapacity > 0 ? Math.round((kpi.hardCapacity / kpi.totalCapacity) * 100) : 0
    const softPctAll = kpi.totalCapacity > 0 ? Math.round((kpi.softCapacity / kpi.totalCapacity) * 100) : 0

    return (
        <div>
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <LayoutDashboard className="h-7 w-7 text-primary" />
                <h1 className="text-2xl font-bold">Dashboard</h1>
            </div>

            {/* Row 1: KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
                <KPICard
                    icon={<Database className="h-5 w-5" />}
                    label="Total Resources"
                    value={kpi.totalResources}
                    color="text-primary"
                />
                <KPICard
                    icon={<HardDrive className="h-5 w-5" />}
                    label="Total Capacity"
                    value={`${kpi.totalCapacity}G`}
                    sub={`${utilizationPct}% 占用 · 硬 ${hardPctAll}% / 软 ${softPctAll}%`}
                    color="text-info"
                />
                <KPICard
                    icon={<PackageCheck className="h-5 w-5" />}
                    label="可售 · 已交付"
                    value={formatCapacity(kpi.sellableCapacity)}
                    sub={`交付中 ${formatCapacity(kpi.pendingCapacity)}（未交付不可售）`}
                    color={kpi.sellableCapacity > 0 ? 'text-status-available' : 'text-text-dim'}
                />
                <KPICard
                    icon={<FileText className="h-5 w-5" />}
                    label="Active Orders"
                    value={kpi.activeOrders}
                    color="text-status-available"
                />
                <KPICard
                    icon={<AlertTriangle className="h-5 w-5" />}
                    label="Expiring (90d)"
                    value={kpi.expiringSoon}
                    color={kpi.expiringSoon > 0 ? 'text-warning' : 'text-text-dim'}
                />
                <KPICard
                    icon={<Repeat className="h-5 w-5" />}
                    label="滚动合同 · 软占用"
                    value={kpi.rollingCount}
                    sub={`${kpi.softCapacity}G 可随时被退`}
                    color={kpi.rollingCount > 0 ? 'text-sky-600 dark:text-sky-400' : 'text-text-dim'}
                />
            </div>

            {/* Expired orders alert */}
            {expiredUnreleased.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 dark:border-amber-500/20 rounded-xl p-4 mb-6 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                    <div className="flex-1">
                        <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                            {expiredUnreleased.length} 张订单合同期满未续签，已进入滚动续期（软占用）
                        </p>
                        <p className="text-xs text-text-muted mt-1">资源仍在用，任一方提前通知即可撤租。客户确认撤租后，请在订单上标记"已通知"或走 Terminate 释放端口。</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {expiredUnreleased.map(o => (
                                <button key={o.id}
                                    onClick={() => navigate(`/sales/${o.id}`)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 dark:border-amber-500/20 rounded-lg text-xs font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 transition-colors cursor-pointer"
                                >
                                    {o.order_id}{o.customer_name ? ` — ${o.customer_name}` : ''}
                                    <ExternalLink className="h-3 w-3" />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Row 2: Capacity + Pipeline */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                {/* Capacity by Resource */}
                <div className="bg-surface rounded-xl border border-border-subtle p-5">
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Capacity by Resource</h2>
                        <span className="ml-auto flex items-center gap-3 text-xs text-text-dim">
                            {capacitySegmentStyles.map((style) => (
                                <span key={style.key} className="flex items-center gap-1"><span className={`inline-block w-2 h-2 rounded-full ${style.dot}`} />{style.label}</span>
                            ))}
                        </span>
                    </div>
                    {resources.length === 0 ? (
                        <p className="text-sm text-text-dim text-center py-6">No resources yet</p>
                    ) : (() => {
                        const active = resources.filter(r => r.status !== 'Terminated' && r.status !== 'Expired')
                        // 与 Inventory 列表 / 资源详情同一套拆分：可售只算已交付空闲（老资源 = 合同 − 占用）
                        const free = (r: typeof active[number]) => r.segments.sellable
                        const isFull = (r: typeof active[number]) => r.segments.sellable === 0 && r.segments.pending === 0 && r.segments.unlit === 0
                        // Sellable first: most free capacity on top; fully used ones are collapsed below
                        const open = active
                            .filter(r => !isFull(r))
                            .sort((a, b) => free(b) - free(a))
                        const full = active.filter(isFull)
                        const shown = [...open.slice(0, 10), ...(showFull ? full : [])]
                        return (
                            <div className="space-y-3">
                                {open.length === 0 && !showFull && (
                                    <p className="text-sm text-text-dim text-center py-2">No available capacity</p>
                                )}
                                {shown.map((r) => (
                                    <button
                                        key={r.resource_id}
                                        type="button"
                                        onClick={() => navigate(`/inventory/${r.id}`)}
                                        className="group w-full text-left cursor-pointer"
                                    >
                                        <div className="flex items-center justify-between text-sm mb-1">
                                            <div className="flex items-center gap-2">
                                                <span className={`font-mono font-medium ${resourceTypeTextClass[r.type as keyof typeof resourceTypeTextClass] ?? 'text-text'}`}>{r.resource_id}</span>
                                                <span className="text-text-dim text-xs">{r.cable_system_name || r.type}</span>
                                            </div>
                                            <span className="text-text-muted text-xs">{capacityUsageLabel(r.total_capacity, r.segments)}</span>
                                        </div>
                                        <CapacitySegmentsBar total={r.total_capacity} segments={r.segments} delivery={r.delivery} showSummary />
                                    </button>
                                ))}
                                {full.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setShowFull(v => !v)}
                                        className="w-full text-center text-xs text-text-dim hover:text-text-muted py-1 cursor-pointer transition-colors"
                                    >
                                        {showFull ? 'Hide' : 'Show'} {full.length} fully used
                                    </button>
                                )}
                                {open.length > 10 && (
                                    <button
                                        onClick={() => navigate('/inventory')}
                                        className="w-full text-center text-xs text-primary hover:text-primary/80 py-2 cursor-pointer transition-colors"
                                    >
                                        View all {active.length} resources →
                                    </button>
                                )}
                            </div>
                        )
                    })()}
                </div>

                {/* Sales Pipeline */}
                <div className="bg-surface rounded-xl border border-border-subtle p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <FileText className="h-4 w-4 text-primary" />
                        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Sales Pipeline</h2>
                        <span className="text-xs text-text-dim ml-auto">{pipeline.reduce((s, x) => s + x.count, 0)} orders</span>
                    </div>
                    {pipeline.length === 0 ? (
                        <p className="text-sm text-text-dim text-center py-6">No orders yet</p>
                    ) : (() => {
                        const total = pipeline.reduce((s, x) => s + x.count, 0)
                        const barColors: Record<string, string> = {
                            Draft: 'bg-gray-500',
                            'Pre-sold': 'bg-amber-500',
                            Active: 'bg-emerald-500',
                            Expired: 'bg-red-500',
                            Terminated: 'bg-red-400',
                            Cancelled: 'bg-gray-400',
                        }
                        const dotColors: Record<string, string> = {
                            Draft: 'bg-gray-500',
                            'Pre-sold': 'bg-amber-500',
                            Active: 'bg-emerald-500',
                            Expired: 'bg-red-500',
                            Terminated: 'bg-red-400',
                            Cancelled: 'bg-gray-400',
                        }
                        return (
                            <div>
                                {/* Stacked bar */}
                                <div className="w-full h-4 bg-surface-hover rounded-full overflow-hidden flex" aria-label="Sales pipeline distribution">
                                    {pipeline.map((p) => {
                                        const pct = (p.count / total) * 100
                                        return (
                                            <div
                                                key={p.status}
                                                className={`h-full ${barColors[p.status] ?? 'bg-primary'} transition-all first:rounded-l-full last:rounded-r-full`}
                                                style={{ width: `${pct}%` }}
                                                title={`${p.status}: ${p.count} (${Math.round(pct)}%)`}
                                            />
                                        )
                                    })}
                                </div>
                                {/* Legend */}
                                <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4">
                                    {pipeline.map((p) => {
                                        const pct = Math.round((p.count / total) * 100)
                                        return (
                                            <div key={p.status} className="flex items-center gap-1.5">
                                                <span className={`inline-block w-2.5 h-2.5 rounded-full ${dotColors[p.status]}`} />
                                                <span className="text-xs text-text-muted">{p.status}</span>
                                                <span className="text-xs font-semibold">{p.count}</span>
                                                <span className="text-xs text-text-dim">({pct}%)</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })()}
                </div>
            </div>

            {/* Row 2b: Rolling contracts (soft occupancy) + Recurring revenue */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                <div className="bg-surface rounded-xl border border-border-subtle p-5 lg:col-span-2">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                        <Repeat className="h-4 w-4 text-sky-500" />
                        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">滚动合同 · 软占用</h2>
                        <span className="text-xs text-text-dim ml-auto">{rolling.length} 条 · {kpi.softCapacity}G</span>
                    </div>
                    <p className="text-xs text-text-dim mb-3">合同期满未续签，自动顺延为开口合同；任一方提前通知即可撤租。</p>
                    {rolling.length === 0 ? (
                        <p className="text-sm text-text-dim text-center py-6">暂无滚动合同</p>
                    ) : (
                        <div className="overflow-x-auto -mx-1">
                            <table className="w-full text-sm min-w-[560px]">
                                <thead>
                                    <tr className="text-xs text-text-dim text-left border-b border-border-subtle">
                                        <th className="py-2 px-1 font-medium">订单</th>
                                        <th className="py-2 px-1 font-medium">客户</th>
                                        <th className="py-2 px-1 font-medium text-right">容量</th>
                                        <th className="py-2 px-1 font-medium text-right">MRC</th>
                                        <th className="py-2 px-1 font-medium">滚动起始</th>
                                        <th className="py-2 px-1 font-medium">最早可退出</th>
                                        <th className="py-2 px-1 font-medium">状态</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rolling.map((row) => (
                                        <tr
                                            key={row.sales_order_item_id}
                                            onClick={() => navigate(`/sales/${row.sales_order_id}`)}
                                            className="border-b border-border-subtle/60 last:border-0 hover:bg-surface-hover cursor-pointer"
                                        >
                                            <td className="py-2 px-1">
                                                <span className="font-mono text-primary">{row.order_id}</span>
                                                {row.resource_id && <span className="block text-xs text-text-dim font-mono">{row.resource_id}</span>}
                                            </td>
                                            <td className="py-2 px-1 text-text-muted">{row.customer_name ?? '—'}</td>
                                            <td className="py-2 px-1 text-right">{row.capacity}G</td>
                                            <td className="py-2 px-1 text-right">{row.sell_mrc != null ? formatCurrency(row.sell_mrc) : '—'}</td>
                                            <td className="py-2 px-1 text-text-muted">{row.contract.rollingSince ?? '—'}</td>
                                            <td className="py-2 px-1">{row.contract.earliestExitDate ?? '—'}</td>
                                            <td className="py-2 px-1"><ContractStateBadge derived={row.contract} compact /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="bg-surface rounded-xl border border-border-subtle p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <DollarSign className="h-4 w-4 text-primary" />
                        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">经常性收入（MRC）</h2>
                    </div>
                    <div className="space-y-3">
                        <div>
                            <p className="text-xs text-text-dim">合同期内 MRC / 月</p>
                            <p className="text-lg font-semibold">{formatCurrency(revenue.inTermMrc)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-text-dim">滚动合同 MRC / 月 <span className="text-sky-600 dark:text-sky-400">（只计未来 1 个月）</span></p>
                            <p className="text-lg font-semibold text-sky-600 dark:text-sky-400">{formatCurrency(revenue.rollingMrc)}</p>
                        </div>
                        <div className="pt-3 border-t border-border-subtle">
                            <p className="text-xs text-text-dim">未来 12 个月确定收入</p>
                            <p className="text-xl font-bold">{formatCurrency(revenue.committed12m)}</p>
                            {revenue.naive12m > revenue.committed12m && (
                                <p className="text-xs text-text-dim mt-1">
                                    若滚动合同全年续用，可再多 {formatCurrency(revenue.naive12m - revenue.committed12m)}（不计入确定收入）
                                </p>
                            )}
                        </div>
                        <p className="text-[11px] leading-relaxed text-text-dim">
                            口径：合同期内按剩余月数计（封顶 12 个月）；滚动合同客户随时可退，只计 1 个月；已通知按到退出日折算。
                            MRC 按订单原币直接加总、未换汇；IRU 一次性收入（OTC/NRC）不计入。
                        </p>
                    </div>
                </div>
            </div>

            {/* Row 3: Expiring + Recent */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Expiring Contracts */}
                <div className="bg-surface rounded-xl border border-border-subtle p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <AlertTriangle className="h-4 w-4 text-warning" />
                        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Expiring Contracts</h2>
                        <span className="text-xs text-text-dim ml-auto">Next 90 days</span>
                    </div>
                    {expiring.length === 0 ? (
                        <p className="text-sm text-text-dim text-center py-6">No contracts expiring soon</p>
                    ) : (
                        <div className="space-y-2">
                            {expiring.map((item) => (
                                <button
                                    key={`${item.sales_order_id}-${item.resource_id ?? 'na'}-${item.end_date}`}
                                    type="button"
                                    onClick={() => navigate(`/sales/${item.sales_order_id}`)}
                                    className="w-full text-left flex items-center justify-between p-3 bg-background rounded-lg border border-border-subtle hover:border-warning/30 cursor-pointer transition-colors"
                                >
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-mono font-medium text-primary">{item.order_id}</span>
                                            <span className="text-xs text-text-dim truncate">{item.customer_name ?? '—'}</span>
                                        </div>
                                        {item.resource_id && (
                                            <span className="text-xs text-text-dim">{item.resource_id}</span>
                                        )}
                                    </div>
                                    <div className="text-right shrink-0 ml-3">
                                        <div className="text-sm font-medium">{new Date(item.end_date).toLocaleDateString()}</div>
                                        <div className={`text-xs font-medium ${item.days_remaining <= 30 ? 'text-destructive' : item.days_remaining <= 60 ? 'text-warning' : 'text-text-muted'}`}>
                                            {item.days_remaining} days remaining
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Activity */}
                <div className="bg-surface rounded-xl border border-border-subtle p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Clock className="h-4 w-4 text-primary" />
                        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Recent Activity</h2>
                    </div>
                    {recent.length === 0 ? (
                        <p className="text-sm text-text-dim text-center py-6">No activity yet</p>
                    ) : (
                        <div className="space-y-2">
                            {recent.map((order) => (
                                <button
                                    key={order.id}
                                    type="button"
                                    onClick={() => navigate(`/sales/${order.id}`)}
                                    className="w-full text-left flex items-center justify-between p-3 bg-background rounded-lg border border-border-subtle hover:border-primary/30 cursor-pointer transition-colors"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <ExternalLink className="h-3.5 w-3.5 text-text-dim shrink-0" />
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-mono font-medium text-primary">{order.order_id}</span>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${salesStatusBadgeClass[order.status] ?? ''}`}>
                                                    {order.status}
                                                </span>
                                            </div>
                                            <span className="text-xs text-text-dim truncate block">{order.customer_name ?? '—'}</span>
                                        </div>
                                    </div>
                                    <span className="text-xs text-text-dim shrink-0 ml-3">
                                        {new Date(order.updated_at).toLocaleDateString()}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

// ─── KPI Card Component ───
function KPICard({ icon, label, value, sub, color }: {
    icon: ReactNode
    label: string
    value: string | number
    sub?: string
    color: string
}) {
    return (
        <div className="bg-surface rounded-xl border border-border-subtle p-5">
            <div className={`${color} mb-3`}>{icon}</div>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-xs text-text-muted mt-1">{label}</div>
            {sub && <div className="text-xs text-text-dim mt-0.5">{sub}</div>}
        </div>
    )
}
