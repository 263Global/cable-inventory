import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Package, Plus, Search, Filter, Loader2, Trash2, Settings2, X } from 'lucide-react'
import { toast } from 'sonner'
import { fetchInventoryResources, deleteInventoryResource, checkResourceDeletable } from './api'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { formatCurrency } from '@/lib/utils'
import type { InventoryResource, ResourceType } from '@/types'

const typeTabs: { label: string; filter: string }[] = [
    { label: 'All', filter: 'All' },
    { label: 'Capacity', filter: 'Capacity' },
    { label: 'Terrestrial', filter: 'Terrestrial' },
    { label: 'Fiber', filter: 'Fiber' },
    { label: 'Spectrum', filter: 'Spectrum' },
]

const statusColors: Record<string, string> = {
    'Available': 'bg-status-available/15 text-status-available',
    'Partially Used': 'bg-status-partial/15 text-status-partial',
    'Fully Used': 'bg-status-full/15 text-status-full',
    'Expired': 'bg-status-expired/15 text-status-expired',
    'Terminated': 'bg-status-expired/15 text-status-expired',
}
const statusLabel: Record<string, string> = { 'Partially Used': 'Partial', 'Fully Used': 'Full' }

const typeColors: Record<ResourceType, string> = {
    'Capacity': 'bg-primary/15 text-primary',
    'Terrestrial': 'bg-info/15 text-info',
    'Fiber': 'bg-warning/15 text-warning',
    'Spectrum': 'bg-purple-500/15 text-purple-400',
}

// ─── Column definitions ───
interface ColumnDef {
    key: string
    label: string
    group: string
    defaultVisible: boolean
    minWidth?: string
    render: (item: InventoryResource) => React.ReactNode
}

const allColumns: ColumnDef[] = [
    {
        key: 'resource_id', label: 'Resource ID', group: 'Basic', defaultVisible: true,
        render: (item) => (
            <div>
                <span className="text-sm font-medium">{item.resource_id}</span>
                {item.internal_ref && <span className="text-xs text-text-dim ml-2">({item.internal_ref})</span>}
            </div>
        ),
    },
    {
        key: 'type', label: 'Type', group: 'Basic', defaultVisible: true,
        render: (item) => <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeColors[item.type]}`}>{item.type}</span>,
    },
    {
        key: 'cable_system', label: 'Cable System', group: 'Basic', defaultVisible: true,
        render: (item) => <span className="text-sm">{item.cable_system_name ?? '—'}</span>,
    },
    {
        key: 'spec', label: 'Spec', group: 'Basic', defaultVisible: true,
        render: (item) => <span className="text-sm font-medium">{item.spec ?? '—'}</span>,
    },
    {
        key: 'route', label: 'Route', group: 'Location', defaultVisible: true,
        render: (item) => <span className="text-sm text-text-muted">{`${item.country_a || '—'} → ${item.country_z || '—'}`}</span>,
    },
    {
        key: 'status', label: 'Status', group: 'Basic', defaultVisible: true,
        render: (item) => <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${statusColors[item.status]}`}>{statusLabel[item.status] || item.status}</span>,
    },
    {
        key: 'capacity', label: 'Capacity Usage', group: 'Basic', defaultVisible: true, minWidth: '200px',
        render: (item) => <CapacityBar used={Number(item.used_capacity ?? 0)} total={Number(item.total_capacity ?? 0)} />,
    },
    // ─── Additional columns ───
    {
        key: 'supplier', label: 'Supplier', group: 'Basic', defaultVisible: false,
        render: (item) => <span className="text-sm">{item.supplier_name ?? '—'}</span>,
    },
    {
        key: 'acquisition_type', label: 'Acquisition', group: 'Contract', defaultVisible: false,
        render: (item) => <span className="text-sm">{item.acquisition_type}</span>,
    },
    {
        key: 'cost_mode', label: 'Cost Mode', group: 'Contract', defaultVisible: false,
        render: (item) => <span className="text-sm">{item.cost_mode}</span>,
    },
    {
        key: 'protection', label: 'Protection', group: 'Basic', defaultVisible: false,
        render: (item) => <span className="text-sm">{item.protection}</span>,
    },
    {
        key: 'contract_ref', label: 'Contract Ref', group: 'Contract', defaultVisible: false,
        render: (item) => <span className="text-sm text-text-muted">{item.contract_ref ?? '—'}</span>,
    },
    {
        key: 'start_date', label: 'Start Date', group: 'Contract', defaultVisible: false,
        render: (item) => <span className="text-sm">{item.start_date ?? '—'}</span>,
    },
    {
        key: 'end_date', label: 'End Date', group: 'Contract', defaultVisible: false,
        render: (item) => <span className="text-sm">{item.end_date ?? '—'}</span>,
    },
    {
        key: 'term_months', label: 'Term', group: 'Contract', defaultVisible: false,
        render: (item) => <span className="text-sm">{item.term_months ? `${item.term_months}mo` : '—'}</span>,
    },
    {
        key: 'otc', label: 'OTC', group: 'Financial', defaultVisible: false,
        render: (item) => <span className="text-sm">{item.otc ? formatCurrency(Number(item.otc)) : '—'}</span>,
    },
    {
        key: 'annual_om', label: 'Annual O&M', group: 'Financial', defaultVisible: false,
        render: (item) => <span className="text-sm">{item.annual_om_cost ? formatCurrency(Number(item.annual_om_cost)) : '—'}</span>,
    },
    {
        key: 'mrc', label: 'MRC', group: 'Financial', defaultVisible: false,
        render: (item) => <span className="text-sm">{item.mrc ? formatCurrency(Number(item.mrc)) : '—'}</span>,
    },
    {
        key: 'nrc', label: 'NRC', group: 'Financial', defaultVisible: false,
        render: (item) => <span className="text-sm">{item.nrc ? formatCurrency(Number(item.nrc)) : '—'}</span>,
    },
    {
        key: 'landing_a', label: 'Station A', group: 'Location', defaultVisible: false,
        render: (item) => <span className="text-sm text-text-muted">{item.landing_station_a_name ?? '—'}</span>,
    },
    {
        key: 'landing_z', label: 'Station Z', group: 'Location', defaultVisible: false,
        render: (item) => <span className="text-sm text-text-muted">{item.landing_station_z_name ?? '—'}</span>,
    },
    {
        key: 'handover_a', label: 'Handover A', group: 'Location', defaultVisible: false,
        render: (item) => <span className="text-sm text-text-muted">{item.handover_a_name ?? '—'}</span>,
    },
    {
        key: 'handover_z', label: 'Handover Z', group: 'Location', defaultVisible: false,
        render: (item) => <span className="text-sm text-text-muted">{item.handover_z_name ?? '—'}</span>,
    },
]

const STORAGE_KEY = 'inventory-visible-columns'
const defaultCols = allColumns.filter((c) => c.defaultVisible).map((c) => c.key)

function loadVisibleCols(): string[] {
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) return JSON.parse(stored)
    } catch { /* ignore */ }
    return defaultCols
}

function CapacityBar({ used, total }: { used: number; total: number }) {
    if (!total) return <span className="text-text-dim text-xs">—</span>
    const pct = Math.min((used / total) * 100, 100)
    const color = pct >= 100 ? 'bg-status-full' : 'bg-status-partial'

    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-surface-hover rounded-full overflow-hidden min-w-[80px]">
                <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-text-muted whitespace-nowrap">
                {used}/{total}G ({Math.round(pct)}%)
            </span>
        </div>
    )
}

export function InventoryPage() {
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState('All')
    const [data, setData] = useState<InventoryResource[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [visibleCols, setVisibleCols] = useState<string[]>(loadVisibleCols)
    const [showColPicker, setShowColPicker] = useState(false)
    const [showFilters, setShowFilters] = useState(false)
    const [filters, setFilters] = useState<{ status: string[]; acquisition: string[]; protection: string[]; costMode: string[] }>({
        status: [], acquisition: [], protection: [], costMode: [],
    })
    const [deleteTarget, setDeleteTarget] = useState<InventoryResource | null>(null)
    const [deleteMessage, setDeleteMessage] = useState('')
    const [deleting, setDeleting] = useState(false)
    const pickerRef = useRef<HTMLDivElement>(null)
    const filterRef = useRef<HTMLDivElement>(null)

    // Close picker on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
                setShowColPicker(false)
            }
        }
        if (showColPicker) document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [showColPicker])

    // Close filter on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (filterRef.current && !filterRef.current.contains(e.target as Node)) setShowFilters(false)
        }
        if (showFilters) document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [showFilters])

    const toggleFilter = (group: keyof typeof filters, val: string) => {
        setFilters((prev) => ({
            ...prev,
            [group]: prev[group].includes(val) ? prev[group].filter((v) => v !== val) : [...prev[group], val],
        }))
    }
    const clearFilters = () => setFilters({ status: [], acquisition: [], protection: [], costMode: [] })
    const activeFilterCount = filters.status.length + filters.acquisition.length + filters.protection.length + filters.costMode.length

    const toggleCol = (key: string) => {
        setVisibleCols((prev) => {
            const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
            return next
        })
    }

    const resetCols = () => {
        setVisibleCols(defaultCols)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultCols))
    }

    const activeColumns = allColumns.filter((c) => visibleCols.includes(c.key))

    const loadData = useCallback(async () => {
        try {
            setLoading(true)
            const filter = activeTab === 'All' ? undefined : activeTab
            const result = await fetchInventoryResources(filter)
            setData(result)
        } catch (err) {
            console.error('Failed to load inventory:', err)
        } finally {
            setLoading(false)
        }
    }, [activeTab])

    useEffect(() => {
        loadData()
    }, [loadData])

    const filteredData = data.filter((item) => {
        // Text search
        if (search) {
            const s = search.toLowerCase()
            const match =
                item.resource_id.toLowerCase().includes(s) ||
                (item.internal_ref ?? '').toLowerCase().includes(s) ||
                (item.cable_system_name ?? '').toLowerCase().includes(s) ||
                (item.spec ?? '').toLowerCase().includes(s) ||
                (item.country_a ?? '').toLowerCase().includes(s) ||
                (item.country_z ?? '').toLowerCase().includes(s) ||
                (item.supplier_name ?? '').toLowerCase().includes(s) ||
                (item.contract_ref ?? '').toLowerCase().includes(s)
            if (!match) return false
        }
        // Filters
        if (filters.status.length > 0 && !filters.status.includes(item.status)) return false
        if (filters.acquisition.length > 0 && !filters.acquisition.includes(item.acquisition_type)) return false
        if (filters.protection.length > 0 && !filters.protection.includes(item.protection)) return false
        if (filters.costMode.length > 0 && !filters.costMode.includes(item.cost_mode)) return false
        return true
    })

    // Group columns for picker
    const groups = Array.from(new Set(allColumns.map((c) => c.group)))

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <Package className="h-7 w-7 text-primary" />
                    <h1 className="text-2xl font-bold">Inventory</h1>
                    <span className="text-sm text-text-dim ml-2">{data.length} resources</span>
                </div>
                <button
                    onClick={() => navigate('/inventory/new')}
                    className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover text-primary-foreground rounded-lg text-sm font-medium transition-colors cursor-pointer"
                >
                    <Plus className="h-4 w-4" />
                    Add Resource
                </button>
            </div>

            {/* Type tabs */}
            <div className="flex gap-1 mb-6 border-b border-border-subtle">
                {typeTabs.map((tab) => (
                    <button
                        key={tab.filter}
                        onClick={() => setActiveTab(tab.filter)}
                        className={`px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer border-b-2 ${activeTab === tab.filter
                            ? 'border-primary text-primary'
                            : 'border-transparent text-text-muted hover:text-text'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Search + Filters + Column Picker */}
            <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-dim" />
                    <input
                        type="text"
                        placeholder="Search by ID, cable system, spec, route..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-text-dim"
                    />
                </div>
                <div className="relative" ref={filterRef}>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-colors cursor-pointer ${showFilters || activeFilterCount > 0 ? 'border-primary text-primary bg-primary/5' : 'border-border text-text-muted hover:text-text hover:bg-surface-hover'}`}
                    >
                        <Filter className="h-4 w-4" />
                        Filters
                        {activeFilterCount > 0 && (
                            <span className="ml-1 px-1.5 py-0.5 bg-primary text-primary-foreground rounded-full text-xs font-bold">{activeFilterCount}</span>
                        )}
                    </button>
                    {showFilters && (
                        <div className="absolute left-0 top-full mt-2 w-72 bg-surface border border-border-subtle rounded-xl shadow-xl z-50 p-4 max-h-96 overflow-y-auto">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Filters</span>
                                {activeFilterCount > 0 && (
                                    <button onClick={clearFilters} className="text-xs text-primary hover:underline cursor-pointer flex items-center gap-1">
                                        <X className="h-3 w-3" /> Clear all
                                    </button>
                                )}
                            </div>
                            {/* Status */}
                            <div className="mb-3">
                                <p className="text-xs text-text-dim font-medium mb-1.5">Status</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {['Available', 'Partially Used', 'Fully Used', 'Expired', 'Terminated'].map((s) => (
                                        <button key={s} onClick={() => toggleFilter('status', s)}
                                            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${filters.status.includes(s) ? 'bg-primary text-primary-foreground' : 'bg-surface-hover text-text-muted hover:text-text'}`}>{statusLabel[s] || s}</button>
                                    ))}
                                </div>
                            </div>
                            {/* Acquisition Type */}
                            <div className="mb-3">
                                <p className="text-xs text-text-dim font-medium mb-1.5">Acquisition Type</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {['IRU', 'Lease', 'Swap-In', 'Owned'].map((a) => (
                                        <button key={a} onClick={() => toggleFilter('acquisition', a)}
                                            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${filters.acquisition.includes(a) ? 'bg-primary text-primary-foreground' : 'bg-surface-hover text-text-muted hover:text-text'}`}>{a}</button>
                                    ))}
                                </div>
                            </div>
                            {/* Protection */}
                            <div className="mb-3">
                                <p className="text-xs text-text-dim font-medium mb-1.5">Protection</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {['Protected', 'Unprotected'].map((p) => (
                                        <button key={p} onClick={() => toggleFilter('protection', p)}
                                            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${filters.protection.includes(p) ? 'bg-primary text-primary-foreground' : 'bg-surface-hover text-text-muted hover:text-text'}`}>{p}</button>
                                    ))}
                                </div>
                            </div>
                            {/* Cost Mode */}
                            <div>
                                <p className="text-xs text-text-dim font-medium mb-1.5">Cost Mode</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {['Single', 'Base+Batch'].map((c) => (
                                        <button key={c} onClick={() => toggleFilter('costMode', c)}
                                            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${filters.costMode.includes(c) ? 'bg-primary text-primary-foreground' : 'bg-surface-hover text-text-muted hover:text-text'}`}>{c}</button>
                                    ))}
                                </div>
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
                                <button onClick={resetCols} className="text-xs text-primary hover:underline cursor-pointer">Reset</button>
                            </div>
                            {groups.map((group) => (
                                <div key={group} className="mb-3">
                                    <p className="text-xs text-text-dim font-medium mb-1.5">{group}</p>
                                    {allColumns.filter((c) => c.group === group).map((col) => (
                                        <label key={col.key} className="flex items-center gap-2 py-1 px-1 rounded hover:bg-surface-hover cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={visibleCols.includes(col.key)}
                                                onChange={() => toggleCol(col.key)}
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
            <div className="bg-surface rounded-xl border border-border-subtle overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-6 w-6 text-primary animate-spin" />
                    </div>
                ) : filteredData.length === 0 ? (
                    <div className="text-center py-20">
                        <Package className="h-12 w-12 text-text-dim mx-auto mb-4" />
                        <p className="text-text-muted text-lg">
                            {data.length === 0 ? 'No inventory resources yet' : 'No matching results'}
                        </p>
                        <p className="text-text-dim text-sm mt-1">
                            {data.length === 0
                                ? 'Click "Add Resource" to create your first inventory item'
                                : 'Try adjusting your search or filters'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border-subtle">
                                    {activeColumns.map((col) => (
                                        <th key={col.key}
                                            className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider"
                                            style={col.minWidth ? { minWidth: col.minWidth } : undefined}
                                        >
                                            {col.label}
                                        </th>
                                    ))}
                                    <th className="w-12 px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-subtle">
                                {filteredData.map((item) => (
                                    <tr
                                        key={item.id}
                                        onClick={() => navigate(`/inventory/${item.id}`)}
                                        className="hover:bg-surface-hover transition-colors cursor-pointer"
                                    >
                                        {activeColumns.map((col) => (
                                            <td key={col.key} className="px-4 py-3">
                                                {col.render(item)}
                                            </td>
                                        ))}
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={async (e) => {
                                                    e.stopPropagation()
                                                    const check = await checkResourceDeletable(item.id)
                                                    if (check.status === 'blocked') {
                                                        toast.error(`Cannot delete — linked to active orders: ${check.activeOrders.join(', ')}`)
                                                        return
                                                    }
                                                    if (check.status === 'warn') {
                                                        setDeleteMessage(`This resource is linked to orders: ${check.otherOrders.join(', ')}. Deleting will remove these associations.`)
                                                    } else {
                                                        setDeleteMessage('This will permanently delete the resource and all its batches and circuits.')
                                                    }
                                                    setDeleteTarget(item)
                                                }}
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
                <div className="px-4 py-3 border-t border-border-subtle text-xs text-text-dim">
                    {filteredData.length} resource{filteredData.length !== 1 ? 's' : ''}
                    {search && ` (filtered from ${data.length})`}
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                open={!!deleteTarget}
                title={`Delete ${deleteTarget?.resource_id ?? 'resource'}?`}
                message={deleteMessage}
                confirmLabel="Delete Resource"
                variant="danger"
                loading={deleting}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={async () => {
                    if (!deleteTarget) return
                    setDeleting(true)
                    try {
                        await deleteInventoryResource(deleteTarget.id)
                        toast.success(`${deleteTarget.resource_id} deleted`)
                        loadData()
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
