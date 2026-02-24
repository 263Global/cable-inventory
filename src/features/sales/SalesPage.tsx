import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Search, Plus, Trash2, Filter, Settings2, X } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { fetchSalesOrders, deleteSalesOrder, syncOrderStatuses } from './api'
import type { SalesOrder, SalesStatus } from '@/types'
import { salesStatusBadgeClass } from '@/lib/status-styles'
import { useClickOutside } from '@/hooks/useClickOutside'
import { usePersistentColumnVisibility } from '@/hooks/usePersistentColumnVisibility'

const ALL_STATUSES: SalesStatus[] = ['Draft', 'Pre-sold', 'Active', 'Expired', 'Terminated', 'Cancelled']

// ─── Column definitions ───
interface ColumnDef {
    key: string
    label: string
    group: string
    defaultVisible: boolean
    render: (item: SalesOrder) => React.ReactNode
}

const allColumns: ColumnDef[] = [
    {
        key: 'order_id', label: 'Order ID', group: 'Basic', defaultVisible: true,
        render: (item) => <span className="font-mono text-primary font-medium">{item.order_id}</span>,
    },
    {
        key: 'internal_ref', label: 'Internal Ref', group: 'Basic', defaultVisible: true,
        render: (item) => <span className="text-text-muted">{item.internal_ref || '—'}</span>,
    },
    {
        key: 'customer', label: 'Customer', group: 'Basic', defaultVisible: true,
        render: (item) => <span>{item.customer_name || '—'}</span>,
    },
    {
        key: 'status', label: 'Status', group: 'Basic', defaultVisible: true,
        render: (item) => (
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${salesStatusBadgeClass[item.status]}`}>
                {item.status}
            </span>
        ),
    },
    {
        key: 'created_at', label: 'Created', group: 'Basic', defaultVisible: true,
        render: (item) => <span className="text-text-muted">{new Date(item.created_at).toLocaleDateString()}</span>,
    },
    {
        key: 'updated_at', label: 'Updated', group: 'Basic', defaultVisible: false,
        render: (item) => <span className="text-text-muted">{new Date(item.updated_at).toLocaleDateString()}</span>,
    },
    {
        key: 'notes', label: 'Notes', group: 'Basic', defaultVisible: false,
        render: (item) => (
            <span className="text-text-muted text-sm truncate max-w-[200px] block">
                {item.notes || '—'}
            </span>
        ),
    },
]

const STORAGE_KEY = 'sales-visible-columns'
const defaultCols = allColumns.filter((c) => c.defaultVisible).map((c) => c.key)
const allColumnKeys = allColumns.map((column) => column.key)

export function SalesPage() {
    const navigate = useNavigate()
    const [orders, setOrders] = useState<SalesOrder[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<SalesStatus[]>([])
    const [showFilters, setShowFilters] = useState(false)
    const [showColPicker, setShowColPicker] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<SalesOrder | null>(null)
    const [deleting, setDeleting] = useState(false)
    const { visibleKeys, toggleKey, reset } = usePersistentColumnVisibility({
        storageKey: STORAGE_KEY,
        allKeys: allColumnKeys,
        defaultKeys: defaultCols,
    })
    const pickerRef = useClickOutside<HTMLDivElement>(showColPicker, () => setShowColPicker(false))
    const filterRef = useClickOutside<HTMLDivElement>(showFilters, () => setShowFilters(false))

    const activeColumns = allColumns.filter((c) => visibleKeys.includes(c.key))
    const groups = Array.from(new Set(allColumns.map((c) => c.group)))

    const load = useCallback(async () => {
        setLoading(true)
        try {
            // Auto-transition Pre-sold→Active, Active→Expired based on dates
            const transitioned = await syncOrderStatuses()
            if (transitioned > 0) toast.info(`${transitioned} order(s) auto-transitioned`)
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
                    onClick={() => navigate('/sales/new')}
                    className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                >
                    <Plus className="h-4 w-4" /> New Sales Order
                </button>
            </div>

            {/* Search + Filters + Column Picker */}
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
                <div className="relative" ref={filterRef}>
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
                                    <button onClick={() => setStatusFilter([])} className="text-xs text-primary cursor-pointer flex items-center gap-1">
                                        <X className="h-3 w-3" /> Clear
                                    </button>
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
                {/* Column Picker */}
                <div className="relative" ref={pickerRef}>
                    <button
                        onClick={() => setShowColPicker(!showColPicker)}
                        className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-colors cursor-pointer ${showColPicker ? 'border-primary text-primary bg-primary/5' : 'border-border text-text-muted hover:text-text hover:bg-surface-hover'}`}
                        title="Choose columns"
                    >
                        <Settings2 className="h-4 w-4" />
                        Columns
                    </button>
                    {showColPicker && (
                        <div className="absolute right-0 top-full mt-2 w-64 bg-surface border border-border-subtle rounded-xl shadow-xl z-50 p-3 max-h-96 overflow-y-auto">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Visible Columns</span>
                                <button onClick={reset} className="text-xs text-primary hover:underline cursor-pointer">Reset</button>
                            </div>
                            {groups.map((group) => (
                                <div key={group} className="mb-3">
                                    <p className="text-xs text-text-dim font-medium mb-1.5">{group}</p>
                                    {allColumns.filter((c) => c.group === group).map((col) => (
                                        <label key={col.key} className="flex items-center gap-2 py-1 px-1 rounded hover:bg-surface-hover cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={visibleKeys.includes(col.key)}
                                                onChange={() => toggleKey(col.key)}
                                                className="rounded border-border text-primary focus:ring-primary accent-[var(--color-primary)] cursor-pointer"
                                            />
                                            <span className="text-sm">{col.label}</span>
                                        </label>
                                    ))}
                                </div>
                            ))}
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
                    {/* Desktop table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border-subtle text-text-muted text-left">
                                    {activeColumns.map((col) => (
                                        <th key={col.key} className="px-4 py-3 text-xs font-semibold uppercase tracking-wider">
                                            {col.label}
                                        </th>
                                    ))}
                                    <th className="w-12 px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-subtle/50">
                                {filtered.map((order) => (
                                    <tr
                                        key={order.id}
                                        onClick={() => navigate(`/sales/${order.id}`)}
                                        className="hover:bg-surface-hover/50 cursor-pointer transition-colors"
                                    >
                                        {activeColumns.map((col) => (
                                            <td key={col.key} className="px-4 py-3">
                                                {col.render(order)}
                                            </td>
                                        ))}
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
                    {/* Mobile cards */}
                    <div className="md:hidden divide-y divide-border-subtle/50">
                        {filtered.map((order) => (
                            <div
                                key={order.id}
                                onClick={() => navigate(`/sales/${order.id}`)}
                                className="px-4 py-3 hover:bg-surface-hover/50 cursor-pointer transition-colors active:bg-surface-hover"
                            >
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-sm font-semibold font-mono text-primary">{order.order_id}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${salesStatusBadgeClass[order.status]}`}>
                                        {order.status}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-xs text-text-muted">
                                    <span>{order.customer_name || '—'}</span>
                                    <span>{new Date(order.created_at).toLocaleDateString()}</span>
                                </div>
                                {order.internal_ref && (
                                    <p className="text-xs text-text-dim mt-1">Ref: {order.internal_ref}</p>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="px-4 py-3 border-t border-border-subtle text-xs text-text-dim">
                        {filtered.length} order{filtered.length !== 1 ? 's' : ''}
                        {search && ` (filtered from ${orders.length})`}
                    </div>
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
