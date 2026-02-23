import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'
import { Database, Search, Plus, Pencil, Trash2, X, Loader2, Cable, ChevronLeft, ChevronRight } from 'lucide-react'
import { fetchAll, insertRecord, updateRecord, deleteRecord } from '@/lib/api'
import { fetchLandingStationsWithCables } from '@/lib/reference-api'
import { matchesReferenceSearch } from '@/features/reference-data/search'

// ============================================
// Generic Reference Data Table Component
// ============================================

interface Column<T> {
    key: keyof T | string
    label: string
    render?: (item: T) => ReactNode
}

interface FieldDef {
    key: string
    label: string
    type?: 'text' | 'number' | 'select'
    options?: string[]
    placeholder?: string
    required?: boolean
}

interface ReferenceDataTableProps<T extends { id: string }> {
    table: string
    columns: Column<T>[]
    fields: FieldDef[]
    searchKey?: keyof T
    emptyMessage?: string
    fetchFn?: () => Promise<T[]>
}

function ReferenceDataTable<T extends { id: string;[key: string]: unknown }>({
    table,
    columns,
    fields,
    searchKey = 'name' as keyof T,
    emptyMessage = 'No records found',
    fetchFn,
}: ReferenceDataTableProps<T>) {
    const [data, setData] = useState<T[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [showModal, setShowModal] = useState(false)
    const [editingItem, setEditingItem] = useState<T | null>(null)
    const [formData, setFormData] = useState<Record<string, string | number>>({})
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const loadData = useCallback(async () => {
        try {
            setLoading(true)
            const result = fetchFn ? await fetchFn() : await fetchAll<T>(table)
            setData(result)
        } catch (err) {
            console.error('Failed to load data:', err)
        } finally {
            setLoading(false)
        }
    }, [table, fetchFn])

    useEffect(() => { loadData() }, [loadData])

    const filteredData = data.filter((item) => {
        return matchesReferenceSearch(item, search, searchKey)
    })

    const PAGE_SIZE = 15
    const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE))
    const pagedData = useMemo(() => {
        const start = (page - 1) * PAGE_SIZE
        return filteredData.slice(start, start + PAGE_SIZE)
    }, [filteredData, page])

    // Reset page when search changes
    useEffect(() => { setPage(1) }, [search])

    const openCreate = () => { setEditingItem(null); setFormData({}); setError(''); setShowModal(true) }

    const openEdit = (item: T) => {
        setEditingItem(item)
        const fd: Record<string, string | number> = {}
        fields.forEach((f) => { fd[f.key] = (item[f.key] as string | number) ?? '' })
        setFormData(fd)
        setError('')
        setShowModal(true)
    }

    const handleSave = async () => {
        setSaving(true); setError('')
        try {
            if (editingItem) { await updateRecord(table, editingItem.id, formData) }
            else { await insertRecord(table, formData) }
            setShowModal(false); loadData()
        } catch (err) { setError(err instanceof Error ? err.message : 'Failed to save') }
        finally { setSaving(false) }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this record?')) return
        try { await deleteRecord(table, id); loadData() }
        catch (err) { console.error('Failed to delete:', err) }
    }

    return (
        <div>
            <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-dim" />
                    <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-text-dim" />
                </div>
                <button onClick={openCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-primary-foreground rounded-lg text-sm font-medium transition-colors cursor-pointer">
                    <Plus className="h-4 w-4" /> Add New
                </button>
            </div>

            <div className="bg-surface rounded-xl border border-border-subtle overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 text-primary animate-spin" /></div>
                ) : filteredData.length === 0 ? (
                    <div className="text-center py-16">
                        <Database className="h-10 w-10 text-text-dim mx-auto mb-3" />
                        <p className="text-text-muted">{emptyMessage}</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border-subtle">
                                {columns.map((col) => (
                                    <th key={String(col.key)} className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">{col.label}</th>
                                ))}
                                <th className="w-20 px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle">
                            {pagedData.map((item) => (
                                <tr key={item.id} className="hover:bg-surface-hover transition-colors">
                                    {columns.map((col) => (
                                        <td key={String(col.key)} className="px-4 py-3 text-sm">
                                            {col.render ? col.render(item) : String(item[col.key as keyof T] ?? '—')}
                                        </td>
                                    ))}
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => openEdit(item)} className="p-1.5 rounded-md hover:bg-surface-hover text-text-dim hover:text-text transition-colors cursor-pointer" title="Edit"><Pencil className="h-4 w-4" /></button>
                                            <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-md hover:bg-destructive/10 text-text-dim hover:text-destructive transition-colors cursor-pointer" title="Delete"><Trash2 className="h-4 w-4" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                <div className="px-4 py-3 border-t border-border-subtle flex items-center justify-between">
                    <span className="text-xs text-text-dim">
                        {filteredData.length} record{filteredData.length !== 1 ? 's' : ''}{search && ` (filtered from ${data.length})`}
                    </span>
                    {totalPages > 1 && (
                        <div className="flex items-center gap-2">
                            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                                className="p-1 rounded-md hover:bg-surface-hover text-text-dim hover:text-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer">
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <span className="text-xs text-text-muted">Page {page} of {totalPages}</span>
                            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                                className="p-1 rounded-md hover:bg-surface-hover text-text-dim hover:text-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer">
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                    <div className="bg-surface rounded-xl border border-border-subtle w-full max-w-md mx-4 shadow-2xl">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
                            <h3 className="text-lg font-semibold">{editingItem ? 'Edit Record' : 'Add New Record'}</h3>
                            <button onClick={() => setShowModal(false)} className="p-1 rounded-md hover:bg-surface-hover text-text-dim hover:text-text cursor-pointer"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="px-6 py-4 space-y-4">
                            {fields.map((field) => (
                                <div key={field.key}>
                                    <label className="block text-sm font-medium text-text-muted mb-1.5">
                                        {field.label}{field.required && <span className="text-destructive ml-1">*</span>}
                                    </label>
                                    {field.type === 'select' ? (
                                        <select value={String(formData[field.key] ?? '')} onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                                            className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent">
                                            <option value="">Select...</option>
                                            {field.options?.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                                        </select>
                                    ) : (
                                        <input type={field.type === 'number' ? 'number' : 'text'} value={String(formData[field.key] ?? '')}
                                            onChange={(e) => setFormData({ ...formData, [field.key]: field.type === 'number' ? Number(e.target.value) : e.target.value })}
                                            placeholder={field.placeholder}
                                            className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-text-dim" />
                                    )}
                                </div>
                            ))}
                            {error && <div className="text-destructive text-sm bg-destructive/10 rounded-lg px-3 py-2">{error}</div>}
                        </div>
                        <div className="px-6 py-4 border-t border-border-subtle flex justify-end gap-3">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm rounded-lg text-text-muted hover:text-text hover:bg-surface-hover transition-colors cursor-pointer">Cancel</button>
                            <button onClick={handleSave} disabled={saving}
                                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 text-primary-foreground rounded-lg text-sm font-medium transition-colors cursor-pointer">
                                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                                {editingItem ? 'Save Changes' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// ============================================
// Tab configurations
// ============================================

type AnyRecord = { id: string;[key: string]: unknown }

const cableSystemsConfig = {
    table: 'cable_systems',
    columns: [
        { key: 'name', label: 'Cable System' },
        { key: 'rfs_year', label: 'RFS Year' },
        {
            key: 'status', label: 'Status', render: (item: AnyRecord) => (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.status === 'Active' ? 'bg-status-available/15 text-status-available'
                    : item.status === 'Planned' ? 'bg-info/15 text-info'
                        : 'bg-status-expired/15 text-status-expired'
                    }`}>{String(item.status)}</span>
            )
        },
        { key: 'owners', label: 'Owners' },
    ] as Column<AnyRecord>[],
    fields: [
        { key: 'name', label: 'Cable System Name', required: true, placeholder: 'e.g. PEACE Cable' },
        { key: 'rfs_year', label: 'RFS Year', type: 'number' as const, placeholder: '2024' },
        { key: 'status', label: 'Status', type: 'select' as const, options: ['Active', 'Planned', 'Retired'] },
        { key: 'notes', label: 'Notes', placeholder: 'Optional notes...' },
    ],
    emptyMessage: 'No cable systems found.',
}

const landingStationsConfig = {
    table: 'landing_stations',
    columns: [
        { key: 'name', label: 'Station Name' },
        { key: 'country', label: 'Country' },
        {
            key: 'cable_names', label: 'Connected Cables', render: (item: AnyRecord) => {
                const cables = (item.cable_names as string[]) || []
                if (cables.length === 0) return <span className="text-text-dim">—</span>
                return (
                    <div className="flex items-center gap-1 flex-wrap">
                        <Cable className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="text-xs">
                            {cables.length <= 3 ? cables.join(', ') : `${cables.slice(0, 3).join(', ')} +${cables.length - 3} more`}
                        </span>
                    </div>
                )
            }
        },
    ] as Column<AnyRecord>[],
    fields: [
        { key: 'name', label: 'Station Name', required: true, placeholder: 'e.g. Tuas, Singapore' },
        { key: 'country', label: 'Country', required: true, placeholder: 'e.g. Singapore' },
        { key: 'notes', label: 'Notes', placeholder: 'Optional notes...' },
    ],
    emptyMessage: 'No landing stations.',
    fetchFn: fetchLandingStationsWithCables as () => Promise<AnyRecord[]>,
}

const regionColors: Record<string, string> = {
    'Asia': 'bg-red-500/15 text-red-400',
    'Europe': 'bg-blue-500/15 text-blue-400',
    'Africa': 'bg-amber-500/15 text-amber-400',
    'North America': 'bg-green-500/15 text-green-400',
    'South America': 'bg-emerald-500/15 text-emerald-400',
    'Oceania': 'bg-purple-500/15 text-purple-400',
    'Caribbean': 'bg-cyan-500/15 text-cyan-400',
}

const countriesConfig = {
    table: 'countries',
    columns: [
        { key: 'name', label: 'Country Name' },
        { key: 'code', label: 'Code' },
        {
            key: 'region', label: 'Region', render: (item: AnyRecord) => {
                const region = String(item.region ?? '')
                if (!region) return <span className="text-text-dim">—</span>
                return (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${regionColors[region] ?? 'bg-surface-hover text-text-muted'}`}>
                        {region}
                    </span>
                )
            }
        },
    ] as Column<AnyRecord>[],
    fields: [
        { key: 'name', label: 'Country Name', required: true, placeholder: 'e.g. Singapore' },
        { key: 'code', label: 'ISO Code (2-letter)', placeholder: 'e.g. SG' },
        { key: 'region', label: 'Region', type: 'select' as const, options: ['Asia', 'Europe', 'Africa', 'North America', 'South America', 'Oceania', 'Caribbean'] },
    ],
    emptyMessage: 'No countries found.',
}

const handoverLocationsConfig = {
    table: 'handover_locations',
    columns: [
        { key: 'name', label: 'Location Name' },
        { key: 'country', label: 'Country' },
        { key: 'city', label: 'City' },
        {
            key: 'type', label: 'Type', render: (item: AnyRecord) => (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-info/15 text-info">{String(item.type)}</span>
            )
        },
    ] as Column<AnyRecord>[],
    fields: [
        { key: 'name', label: 'Location Name', required: true, placeholder: 'e.g. Equinix SG3' },
        { key: 'country', label: 'Country', required: true, placeholder: 'e.g. Singapore' },
        { key: 'city', label: 'City', placeholder: 'e.g. Singapore' },
        { key: 'address', label: 'Address', placeholder: 'Physical address' },
        { key: 'type', label: 'Type', type: 'select' as const, options: ['PoP', 'Data Center', 'Exchange', 'Other'] },
        { key: 'notes', label: 'Notes', placeholder: 'Optional notes...' },
    ],
    emptyMessage: 'No handover locations.',
}

const interfaceTypesConfig = {
    table: 'interface_types',
    columns: [
        { key: 'name', label: 'Interface Type' },
        { key: 'description', label: 'Description' },
    ] as Column<AnyRecord>[],
    fields: [
        { key: 'name', label: 'Type Name', required: true, placeholder: 'e.g. 400GE' },
        { key: 'description', label: 'Description', placeholder: 'e.g. 400 Gigabit Ethernet' },
    ],
    emptyMessage: 'No interface types.',
}

// ============================================
// Main Page
// ============================================

const tabs = [
    { id: 'cable_systems', label: 'Cable Systems', config: cableSystemsConfig },
    { id: 'landing_stations', label: 'Landing Stations', config: landingStationsConfig },
    { id: 'countries', label: 'Countries', config: countriesConfig },
    { id: 'handover_locations', label: 'Handover Locations', config: handoverLocationsConfig },
    { id: 'interface_types', label: 'Interface Types', config: interfaceTypesConfig },
]

export function ReferenceDataPage() {
    const [activeTab, setActiveTab] = useState(tabs[0].id)
    const activeConfig = tabs.find((t) => t.id === activeTab)!.config

    return (
        <div>
            <div className="flex items-center gap-3 mb-8">
                <Database className="h-7 w-7 text-primary" />
                <h1 className="text-2xl font-bold">Reference Data</h1>
            </div>

            <div className="flex gap-1 mb-6 border-b border-border-subtle overflow-x-auto">
                {tabs.map((tab) => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer border-b-2 whitespace-nowrap ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text'
                            }`}>{tab.label}</button>
                ))}
            </div>

            <ReferenceDataTable
                key={activeTab}
                table={activeConfig.table}
                columns={activeConfig.columns}
                fields={activeConfig.fields}
                emptyMessage={activeConfig.emptyMessage}
                fetchFn={'fetchFn' in activeConfig ? (activeConfig.fetchFn as () => Promise<AnyRecord[]>) : undefined}
            />
        </div>
    )
}
