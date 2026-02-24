import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    LayoutDashboard, Database, HardDrive, FileText, AlertTriangle,
    TrendingUp, Clock, ExternalLink, Loader2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

// ─── Status colors (reused from other pages) ───
const salesStatusColors: Record<string, string> = {
    Draft: 'bg-gray-500/15 text-gray-400',
    'Pre-sold': 'bg-amber-500/15 text-amber-400',
    Active: 'bg-emerald-500/15 text-emerald-400',
    Expired: 'bg-red-500/15 text-red-400',
    Terminated: 'bg-red-500/15 text-red-400',
    Cancelled: 'bg-gray-500/15 text-gray-400',
}

const resourceTypeColors: Record<string, string> = {
    Capacity: 'text-primary',
    Terrestrial: 'text-info',
    Fiber: 'text-warning',
    Spectrum: 'text-purple-400',
}

// ─── Types ───
interface KPI {
    totalResources: number
    totalCapacity: number
    usedCapacity: number
    activeOrders: number
    expiringSoon: number
}

interface ResourceRow {
    resource_id: string
    type: string
    cable_system_name: string | null
    total_capacity: number
    used_capacity: number
    status: string
}

interface PipelineItem {
    status: string
    count: number
}

interface ExpiringItem {
    order_id: string
    customer_name: string | null
    resource_id: string | null
    end_date: string
    days_remaining: number
    sales_order_id: string
}

interface RecentOrder {
    id: string
    order_id: string
    customer_name: string | null
    status: string
    updated_at: string
}

interface ExpiredUnreleased {
    id: string
    order_id: string
    customer_name: string | null
    end_date: string
}

export function DashboardPage() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [kpi, setKpi] = useState<KPI>({ totalResources: 0, totalCapacity: 0, usedCapacity: 0, activeOrders: 0, expiringSoon: 0 })
    const [resources, setResources] = useState<ResourceRow[]>([])
    const [pipeline, setPipeline] = useState<PipelineItem[]>([])
    const [expiring, setExpiring] = useState<ExpiringItem[]>([])
    const [recent, setRecent] = useState<RecentOrder[]>([])
    const [expiredUnreleased, setExpiredUnreleased] = useState<ExpiredUnreleased[]>([])

    useEffect(() => {
        (async () => {
            try {
                const today = new Date()
                const in90 = new Date(today)
                in90.setDate(in90.getDate() + 90)
                const todayStr = today.toISOString().split('T')[0]
                const in90Str = in90.toISOString().split('T')[0]

                // 1. Resources
                const { data: res } = await supabase
                    .from('inventory_resources')
                    .select('resource_id, type, total_capacity, used_capacity, status, cable_system:cable_systems(name)')
                    .order('resource_id')

                const resRows = (res ?? []).map((r: Record<string, unknown>) => ({
                    resource_id: r.resource_id as string,
                    type: r.type as string,
                    cable_system_name: (r.cable_system as { name: string } | null)?.name ?? null,
                    total_capacity: Number(r.total_capacity ?? 0),
                    used_capacity: Number(r.used_capacity ?? 0),
                    status: r.status as string,
                }))
                setResources(resRows)

                const totalCap = resRows.reduce((s, r) => s + r.total_capacity, 0)
                const usedCap = resRows.reduce((s, r) => s + r.used_capacity, 0)

                // 2. Sales orders
                const { data: orders } = await supabase
                    .from('sales_orders')
                    .select('id, order_id, status, updated_at, customers(name)')
                    .order('updated_at', { ascending: false })

                const allOrders = (orders ?? []).map((o: Record<string, unknown>) => ({
                    id: o.id as string,
                    order_id: o.order_id as string,
                    status: o.status as string,
                    customer_name: (o.customers as { name: string } | null)?.name ?? null,
                    updated_at: o.updated_at as string,
                }))

                const activeCount = allOrders.filter(o => o.status === 'Active').length
                setRecent(allOrders.slice(0, 10))

                // Pipeline
                const statusCounts: Record<string, number> = {}
                for (const o of allOrders) {
                    statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1
                }
                const pipelineOrder = ['Draft', 'Pre-sold', 'Active', 'Expired', 'Terminated', 'Cancelled']
                setPipeline(pipelineOrder.filter(s => statusCounts[s]).map(s => ({ status: s, count: statusCounts[s] })))

                // 3. Expiring items (within 90 days)
                const { data: expiringItems } = await supabase
                    .from('sales_order_items')
                    .select('end_date, sales_orders!inner(id, order_id, status, customers(name)), inventory_resources(resource_id)')
                    .gte('end_date', todayStr)
                    .lte('end_date', in90Str)
                    .in('sales_orders.status', ['Active', 'Pre-sold'])
                    .order('end_date', { ascending: true })
                    .limit(10)

                const expiringRows = (expiringItems ?? []).map((item: Record<string, unknown>) => {
                    const so = item.sales_orders as { id: string; order_id: string; customers: { name: string } | null } | null
                    const inv = item.inventory_resources as { resource_id: string } | null
                    const endDate = item.end_date as string
                    const daysRem = Math.ceil((new Date(endDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                    return {
                        order_id: so?.order_id ?? '',
                        customer_name: so?.customers?.name ?? null,
                        resource_id: inv?.resource_id ?? null,
                        end_date: endDate,
                        days_remaining: daysRem,
                        sales_order_id: so?.id ?? '',
                    }
                })
                setExpiring(expiringRows)

                setKpi({
                    totalResources: resRows.length,
                    totalCapacity: totalCap,
                    usedCapacity: usedCap,
                    activeOrders: activeCount,
                    expiringSoon: expiringRows.length,
                })

                // 4. Expired orders that haven't been terminated (resources still held)
                const expiredOrders = allOrders.filter(o => o.status === 'Expired')
                if (expiredOrders.length > 0) {
                    // Get end_date from items for display
                    const { data: expiredDetails } = await supabase
                        .from('sales_orders')
                        .select('id, order_id, customers(name)')
                        .eq('status', 'Expired')
                        .is('terminated_at', null)
                        .limit(10)

                    setExpiredUnreleased((expiredDetails ?? []).map((o: Record<string, unknown>) => ({
                        id: o.id as string,
                        order_id: o.order_id as string,
                        customer_name: (o.customers as { name: string } | null)?.name ?? null,
                        end_date: '',
                    })))
                }
            } catch (err) {
                console.error('Dashboard load error:', err)
            } finally {
                setLoading(false)
            }
        })()
    }, [])

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
        )
    }

    const utilizationPct = kpi.totalCapacity > 0 ? Math.round((kpi.usedCapacity / kpi.totalCapacity) * 100) : 0

    return (
        <div>
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <LayoutDashboard className="h-7 w-7 text-primary" />
                <h1 className="text-2xl font-bold">Dashboard</h1>
            </div>

            {/* Row 1: KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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
                    sub={`${utilizationPct}% utilized`}
                    color="text-info"
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
            </div>

            {/* Expired orders alert */}
            {expiredUnreleased.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
                    <div className="flex-1">
                        <p className="text-sm font-medium text-amber-400">
                            {expiredUnreleased.length} 个已到期订单资源未释放
                        </p>
                        <p className="text-xs text-text-muted mt-1">请确认是否续约，如不续约请终止以释放电路和容量。</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {expiredUnreleased.map(o => (
                                <button key={o.id}
                                    onClick={() => navigate(`/sales/${o.id}`)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs font-medium text-amber-400 hover:bg-amber-500/20 transition-colors cursor-pointer"
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
                    <div className="flex items-center gap-2 mb-4">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Capacity by Resource</h2>
                    </div>
                    {resources.length === 0 ? (
                        <p className="text-sm text-text-dim text-center py-6">No resources yet</p>
                    ) : (() => {
                        const active = resources
                            .filter(r => r.status !== 'Terminated' && r.status !== 'Expired')
                            .sort((a, b) => {
                                const pctA = a.total_capacity > 0 ? a.used_capacity / a.total_capacity : 0
                                const pctB = b.total_capacity > 0 ? b.used_capacity / b.total_capacity : 0
                                return pctB - pctA
                            })
                        const top10 = active.slice(0, 10)
                        return (
                            <div className="space-y-3">
                                {top10.map((r) => {
                                    const pct = r.total_capacity > 0 ? Math.round((r.used_capacity / r.total_capacity) * 100) : 0
                                    return (
                                        <div key={r.resource_id} className="group cursor-pointer" onClick={() => navigate('/inventory')}>
                                            <div className="flex items-center justify-between text-sm mb-1">
                                                <div className="flex items-center gap-2">
                                                    <span className={`font-mono font-medium ${resourceTypeColors[r.type] ?? 'text-text'}`}>{r.resource_id}</span>
                                                    <span className="text-text-dim text-xs">{r.cable_system_name || r.type}</span>
                                                </div>
                                                <span className="text-text-muted text-xs">{r.used_capacity}G / {r.total_capacity}G ({pct}%)</span>
                                            </div>
                                            <div className="w-full h-2 bg-surface-hover rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-status-full' : 'bg-status-partial'}`}
                                                    style={{ width: `${Math.min(pct, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    )
                                })}
                                {active.length > 10 && (
                                    <button
                                        onClick={() => navigate('/inventory')}
                                        className="w-full text-center text-xs text-primary hover:text-primary/80 py-2 cursor-pointer transition-colors"
                                    >
                                        查看全部 {active.length} 个资源 →
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
                                <div className="w-full h-4 bg-surface-hover rounded-full overflow-hidden flex">
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
                        <p className="text-sm text-text-dim text-center py-6">No contracts expiring soon 🎉</p>
                    ) : (
                        <div className="space-y-2">
                            {expiring.map((item, i) => (
                                <div
                                    key={i}
                                    onClick={() => navigate(`/sales/${item.sales_order_id}`)}
                                    className="flex items-center justify-between p-3 bg-background rounded-lg border border-border-subtle hover:border-warning/30 cursor-pointer transition-colors"
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
                                            {item.days_remaining}d remaining
                                        </div>
                                    </div>
                                </div>
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
                                <div
                                    key={order.id}
                                    onClick={() => navigate(`/sales/${order.id}`)}
                                    className="flex items-center justify-between p-3 bg-background rounded-lg border border-border-subtle hover:border-primary/30 cursor-pointer transition-colors"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <ExternalLink className="h-3.5 w-3.5 text-text-dim shrink-0" />
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-mono font-medium text-primary">{order.order_id}</span>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${salesStatusColors[order.status] ?? ''}`}>
                                                    {order.status}
                                                </span>
                                            </div>
                                            <span className="text-xs text-text-dim truncate block">{order.customer_name ?? '—'}</span>
                                        </div>
                                    </div>
                                    <span className="text-xs text-text-dim shrink-0 ml-3">
                                        {new Date(order.updated_at).toLocaleDateString()}
                                    </span>
                                </div>
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
    icon: React.ReactNode
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
