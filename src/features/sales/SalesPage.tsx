import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Search, Plus, Trash2, Filter } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { fetchSalesOrders, deleteSalesOrder } from './api'
import type { SalesOrder, SalesStatus } from '@/types'

const STATUS_COLORS: Record<SalesStatus, string> = {
    Draft: 'bg-gray-500/15 text-gray-400',
    'Pre-sold': 'bg-amber-500/15 text-amber-400',
    Active: 'bg-emerald-500/15 text-emerald-400',
    Expired: 'bg-red-500/15 text-red-400',
    Terminated: 'bg-red-500/15 text-red-400',
    Cancelled: 'bg-gray-500/15 text-gray-400',
}

const ALL_STATUSES: SalesStatus[] = ['Draft', 'Pre-sold', 'Active', 'Expired', 'Terminated', 'Cancelled']

export function SalesPage() {
    const navigate = useNavigate()
    const [orders, setOrders] = useState<SalesOrder[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<SalesStatus[]>([])
    const [showFilters, setShowFilters] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<SalesOrder | null>(null)
    const [deleting, setDeleting] = useState(false)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const data = await fetchSalesOrders()
            setOrders(data)
        } catch (err) {
            console.error(err)
            toast.error('Failed to load sales orders')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { load() }, [load])

    const filtered = orders.filter((o) => {
        const q = search.toLowerCase()
        const matchesSearch =
            !q ||
            o.order_id.toLowerCase().includes(q) ||
            (o.internal_ref ?? '').toLowerCase().includes(q) ||
            (o.customer_name ?? '').toLowerCase().includes(q) ||
            (o.notes ?? '').toLowerCase().includes(q)

        const matchesStatus = statusFilter.length === 0 || statusFilter.includes(o.status)
        return matchesSearch && matchesStatus
    })

    const activeFilterCount = statusFilter.length

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <FileText className="h-7 w-7 text-primary" />
                    <h1 className="text-2xl font-bold">Sales Orders</h1>
                    <span className="text-sm text-text-muted bg-surface-hover px-2 py-0.5 rounded-full">
                        {filtered.length}
                    </span>
                </div>
                <button
                    onClick={() => navigate('/cable-inventory/sales/new')}
                    className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                >
                    <Plus className="h-4 w-4" /> New Sales Order
                </button>
            </div>

            {/* Search + Filters */}
            <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-dim" />
                    <input
                        type="text"
                        placeholder="Search orders..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-surface border border-border-subtle rounded-lg text-sm text-text placeholder:text-text-dim focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                </div>
                <div className="relative">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors cursor-pointer ${activeFilterCount > 0
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'bg-surface border-border-subtle text-text-muted hover:text-text'
                            }`}
                    >
                        <Filter className="h-4 w-4" />
                        Filters
                        {activeFilterCount > 0 && (
                            <span className="bg-primary text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                    {showFilters && (
                        <div className="absolute right-0 top-full mt-2 bg-surface border border-border-subtle rounded-xl shadow-xl p-4 z-50 w-64">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-medium text-text">Status</span>
                                {statusFilter.length > 0 && (
                                    <button onClick={() => setStatusFilter([])} className="text-xs text-primary cursor-pointer">Clear</button>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {ALL_STATUSES.map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => setStatusFilter((prev) =>
                                            prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
                                        )}
                                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${statusFilter.includes(s)
                                            ? 'bg-primary text-white'
                                            : 'bg-surface-hover text-text-muted hover:text-text'
                                            }`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="text-center py-20 text-text-muted">Loading...</div>
            ) : filtered.length === 0 ? (
                <div className="bg-surface rounded-xl border border-border-subtle p-12 text-center">
                    <FileText className="h-12 w-12 text-text-dim mx-auto mb-4" />
                    <p className="text-text-muted text-lg">
                        {orders.length === 0 ? 'No sales orders yet' : 'No orders match your filters'}
                    </p>
                </div>
            ) : (
                <div className="bg-surface rounded-xl border border-border-subtle overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border-subtle text-text-muted text-left">
                                <th className="px-4 py-3 font-medium">Order ID</th>
                                <th className="px-4 py-3 font-medium">Internal Ref</th>
                                <th className="px-4 py-3 font-medium">Customer</th>
                                <th className="px-4 py-3 font-medium">Status</th>
                                <th className="px-4 py-3 font-medium">Created</th>
                                <th className="px-4 py-3 font-medium w-16"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((order) => (
                                <tr
                                    key={order.id}
                                    onClick={() => navigate(`/cable-inventory/sales/${order.id}`)}
                                    className="border-b border-border-subtle/50 hover:bg-surface-hover/50 cursor-pointer transition-colors"
                                >
                                    <td className="px-4 py-3 font-mono text-primary font-medium">{order.order_id}</td>
                                    <td className="px-4 py-3 text-text-muted">{order.internal_ref || '—'}</td>
                                    <td className="px-4 py-3">{order.customer_name || '—'}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                                            {order.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-text-muted">
                                        {new Date(order.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setDeleteTarget(order) }}
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
            )}

            {/* Delete Confirmation */}
            <ConfirmDialog
                open={!!deleteTarget}
                title={`Delete ${deleteTarget?.order_id ?? 'order'}?`}
                message="This will permanently delete this sales order and all its items. This action cannot be undone."
                confirmLabel="Delete Order"
                variant="danger"
                loading={deleting}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={async () => {
                    if (!deleteTarget) return
                    setDeleting(true)
                    try {
                        await deleteSalesOrder(deleteTarget.id)
                        toast.success(`${deleteTarget.order_id} deleted`)
                        load()
                    } catch (err) {
                        console.error(err)
                        toast.error('Failed to delete')
                    } finally {
                        setDeleting(false)
                        setDeleteTarget(null)
                    }
                }}
            />
        </div>
    )
}
