import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Package, Plus, Search, Filter, Loader2, Trash2 } from 'lucide-react'
import { fetchInventoryResources, deleteInventoryResource } from './api'
import type { InventoryResource, ResourceType } from '@/types'

const typeTabs: { label: string; filter: string }[] = [
    { label: 'All', filter: 'All' },
    { label: 'Capacity', filter: 'Capacity' },
    { label: 'Terrestrial', filter: 'Terrestrial' },
    { label: 'Fiber / Spectrum', filter: 'Fiber' },
]

const statusColors: Record<string, string> = {
    'Available': 'bg-status-available/15 text-status-available',
    'Partially Used': 'bg-status-partial/15 text-status-partial',
    'Fully Used': 'bg-status-full/15 text-status-full',
    'Expired': 'bg-status-expired/15 text-status-expired',
    'Terminated': 'bg-status-expired/15 text-status-expired',
}

const typeColors: Record<ResourceType, string> = {
    'Capacity': 'bg-primary/15 text-primary',
    'Terrestrial': 'bg-info/15 text-info',
    'Fiber': 'bg-warning/15 text-warning',
    'Spectrum': 'bg-purple-500/15 text-purple-400',
}

function CapacityBar({ used, total }: { used: number; total: number }) {
    if (!total) return <span className="text-text-dim text-xs">—</span>
    const pct = Math.min((used / total) * 100, 100)
    const color = pct >= 100 ? 'bg-status-full' : pct >= 50 ? 'bg-status-partial' : 'bg-status-available'

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

function formatRoute(item: InventoryResource): string {
    const a = item.country_a || '—'
    const z = item.country_z || '—'
    return `${a} → ${z}`
}

export function InventoryPage() {
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState('All')
    const [data, setData] = useState<InventoryResource[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')

    const loadData = useCallback(async () => {
        try {
            setLoading(true)
            const filter = activeTab === 'Fiber' ? undefined : activeTab
            const result = await fetchInventoryResources(filter === 'All' ? undefined : filter)
            // For "Fiber / Spectrum" tab, filter both types
            if (activeTab === 'Fiber') {
                setData(result.filter((r) => r.type === 'Fiber' || r.type === 'Spectrum'))
            } else {
                setData(result)
            }
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
        if (!search) return true
        const s = search.toLowerCase()
        return (
            item.resource_id.toLowerCase().includes(s) ||
            (item.internal_ref ?? '').toLowerCase().includes(s) ||
            (item.cable_system_name ?? '').toLowerCase().includes(s) ||
            (item.spec ?? '').toLowerCase().includes(s) ||
            (item.country_a ?? '').toLowerCase().includes(s) ||
            (item.country_z ?? '').toLowerCase().includes(s)
        )
    })

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

            {/* Search + Filters */}
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
                <button className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-sm text-text-muted hover:text-text hover:bg-surface-hover transition-colors cursor-pointer">
                    <Filter className="h-4 w-4" />
                    Filters
                </button>
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
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Resource ID</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Type</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Cable System</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Spec</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Route</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider min-w-[200px]">Capacity Usage</th>
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
                                        <td className="px-4 py-3">
                                            <div>
                                                <span className="text-sm font-medium">{item.resource_id}</span>
                                                {item.internal_ref && (
                                                    <span className="text-xs text-text-dim ml-2">({item.internal_ref})</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeColors[item.type]}`}>
                                                {item.type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm">{item.cable_system_name ?? '—'}</td>
                                        <td className="px-4 py-3 text-sm font-medium">{item.spec ?? '—'}</td>
                                        <td className="px-4 py-3 text-sm text-text-muted">{formatRoute(item)}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[item.status]}`}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <CapacityBar
                                                used={Number(item.used_capacity ?? 0)}
                                                total={Number(item.total_capacity ?? 0)}
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    if (confirm(`Delete ${item.resource_id}?`)) {
                                                        deleteInventoryResource(item.id).then(loadData).catch(console.error)
                                                    }
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
        </div>
    )
}
