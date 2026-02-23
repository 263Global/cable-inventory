import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { Database, Search, Plus, Pencil, Trash2, X, Loader2 } from 'lucide-react'
import { fetchAll, insertRecord, updateRecord, deleteRecord } from '@/lib/api'

// ============================================
// Generic Reference Data Manager Component
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
}

function ReferenceDataTable<T extends { id: string;[key: string]: unknown }>({
    table,
    columns,
    fields,
    searchKey = 'name' as keyof T,
    emptyMessage = 'No records found',
}: ReferenceDataTableProps<T>) {
    const [data, setData] = useState<T[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [editingItem, setEditingItem] = useState<T | null>(null)
    const [formData, setFormData] = useState<Record<string, string | number>>({})
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const loadData = useCallback(async () => {
        try {
            setLoading(true)
            const result = await fetchAll<T>(table)
            setData(result)
        } catch (err) {
            console.error('Failed to load data:', err)
        } finally {
            setLoading(false)
        }
    }, [table])

    useEffect(() => {
        loadData()
    }, [loadData])

    const filteredData = data.filter((item) => {
        if (!search) return true
        const val = String(item[searchKey] ?? '').toLowerCase()
        return val.includes(search.toLowerCase())
    })

    const openCreate = () => {
        setEditingItem(null)
        setFormData({})
        setError('')
        setShowModal(true)
    }

    const openEdit = (item: T) => {
        setEditingItem(item)
        const fd: Record<string, string | number> = {}
        fields.forEach((f) => {
            fd[f.key] = (item[f.key] as string | number) ?? ''
        })
        setFormData(fd)
        setError('')
        setShowModal(true)
    }

    const handleSave = async () => {
        setSaving(true)
        setError('')
        try {
            if (editingItem) {
                await updateRecord(table, editingItem.id, formData)
            } else {
                await insertRecord(table, formData)
            }
            setShowModal(false)
            loadData()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this record?')) return
        try {
            await deleteRecord(table, id)
            loadData()
        } catch (err) {
            console.error('Failed to delete:', err)
        }
    }

    return (
        <div>
            {/* Search + Add */}
            <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-dim" />
                    <input
                        type="text"
                        placeholder="Search..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-text-dim"
                    />
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-primary-foreground rounded-lg text-sm font-medium transition-colors cursor-pointer"
                >
                    <Plus className="h-4 w-4" />
                    Add New
                </button>
            </div>

            {/* Table */}
            <div className="bg-surface rounded-xl border border-border-subtle overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="h-6 w-6 text-primary animate-spin" />
                    </div>
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
                                    <th
                                        key={String(col.key)}
                                        className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider"
                                    >
                                        {col.label}
                                    </th>
                                ))}
                                <th className="w-20 px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle">
                            {filteredData.map((item) => (
                                <tr key={item.id} className="hover:bg-surface-hover transition-colors">
                                    {columns.map((col) => (
                                        <td key={String(col.key)} className="px-4 py-3 text-sm">
                                            {col.render ? col.render(item) : String(item[col.key as keyof T] ?? '—')}
                                        </td>
                                    ))}
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => openEdit(item)}
                                                className="p-1.5 rounded-md hover:bg-surface-hover text-text-dim hover:text-text transition-colors cursor-pointer"
                                                title="Edit"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="p-1.5 rounded-md hover:bg-destructive/10 text-text-dim hover:text-destructive transition-colors cursor-pointer"
                                                title="Delete"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                <div className="px-4 py-3 border-t border-border-subtle text-xs text-text-dim">
                    {filteredData.length} record{filteredData.length !== 1 ? 's' : ''}
                    {search && ` (filtered from ${data.length})`}
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                    <div className="bg-surface rounded-xl border border-border-subtle w-full max-w-md mx-4 shadow-2xl">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
                            <h3 className="text-lg font-semibold">
                                {editingItem ? 'Edit Record' : 'Add New Record'}
                            </h3>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-1 rounded-md hover:bg-surface-hover text-text-dim hover:text-text cursor-pointer"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="px-6 py-4 space-y-4">
                            {fields.map((field) => (
                                <div key={field.key}>
                                    <label className="block text-sm font-medium text-text-muted mb-1.5">
                                        {field.label}
                                        {field.required && <span className="text-destructive ml-1">*</span>}
                                    </label>
                                    {field.type === 'select' ? (
                                        <select
                                            value={String(formData[field.key] ?? '')}
                                            onChange={(e) =>
                                                setFormData({ ...formData, [field.key]: e.target.value })
                                            }
                                            className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                        >
                                            <option value="">Select...</option>
                                            {field.options?.map((opt) => (
                                                <option key={opt} value={opt}>
                                                    {opt}
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input
                                            type={field.type === 'number' ? 'number' : 'text'}
                                            value={String(formData[field.key] ?? '')}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    [field.key]:
                                                        field.type === 'number'
                                                            ? Number(e.target.value)
                                                            : e.target.value,
                                                })
                                            }
                                            placeholder={field.placeholder}
                                            className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-text-dim"
                                        />
                                    )}
                                </div>
                            ))}
                            {error && (
                                <div className="text-destructive text-sm bg-destructive/10 rounded-lg px-3 py-2">
                                    {error}
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-4 border-t border-border-subtle flex justify-end gap-3">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 text-sm rounded-lg text-text-muted hover:text-text hover:bg-surface-hover transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 text-primary-foreground rounded-lg text-sm font-medium transition-colors cursor-pointer"
                            >
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
// Tab configurations for each reference data type
// ============================================

const cableSystemsConfig = {
    table: 'cable_systems',
    columns: [
        { key: 'name', label: 'Cable System' },
        { key: 'rfs_year', label: 'RFS Year' },
        {
            key: 'status',
            label: 'Status',
            render: (item: { status?: string }) => (
                <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.status === 'Active'
                            ? 'bg-status-available/15 text-status-available'
                            : item.status === 'Planned'
                                ? 'bg-info/15 text-info'
                                : 'bg-status-expired/15 text-status-expired'
                        }`}
                >
                    {item.status}
                </span>
            ),
        },
        { key: 'notes', label: 'Notes' },
    ],
    fields: [
        { key: 'name', label: 'Cable System Name', required: true, placeholder: 'e.g. PEACE Cable' },
        { key: 'rfs_year', label: 'RFS Year', type: 'number' as const, placeholder: '2024' },
        {
            key: 'status',
            label: 'Status',
            type: 'select' as const,
            options: ['Active', 'Planned', 'Retired'],
        },
        { key: 'notes', label: 'Notes', placeholder: 'Optional notes...' },
    ],
    emptyMessage: 'No cable systems found. Run the migration and seed data first.',
}

const landingStationsConfig = {
    table: 'landing_stations',
    columns: [
        { key: 'name', label: 'Station Name' },
        { key: 'country', label: 'Country' },
        { key: 'notes', label: 'Notes' },
    ],
    fields: [
        { key: 'name', label: 'Station Name', required: true, placeholder: 'e.g. Tuas (Singapore)' },
        { key: 'country', label: 'Country', placeholder: 'e.g. Singapore' },
        { key: 'notes', label: 'Notes', placeholder: 'Optional notes...' },
    ],
    emptyMessage: 'No landing stations. Add stations manually or import via CSV.',
}

const countriesConfig = {
    table: 'countries',
    columns: [
        { key: 'name', label: 'Country Name' },
        { key: 'code', label: 'Code' },
        { key: 'region', label: 'Region' },
    ],
    fields: [
        { key: 'name', label: 'Country Name', required: true, placeholder: 'e.g. Singapore' },
        { key: 'code', label: 'ISO Code (2-letter)', required: true, placeholder: 'e.g. SG' },
        { key: 'region', label: 'Region', placeholder: 'e.g. Asia Pacific' },
    ],
    emptyMessage: 'No countries found. Run the seed migration.',
}

const handoverLocationsConfig = {
    table: 'handover_locations',
    columns: [
        { key: 'name', label: 'Location Name' },
        { key: 'country', label: 'Country' },
        { key: 'city', label: 'City' },
        {
            key: 'type',
            label: 'Type',
            render: (item: { type?: string }) => (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-info/15 text-info">
                    {item.type}
                </span>
            ),
        },
    ],
    fields: [
        { key: 'name', label: 'Location Name', required: true, placeholder: 'e.g. Equinix SG3' },
        { key: 'country', label: 'Country', placeholder: 'e.g. Singapore' },
        { key: 'city', label: 'City', placeholder: 'e.g. Singapore' },
        { key: 'address', label: 'Address', placeholder: 'Physical address' },
        {
            key: 'type',
            label: 'Type',
            type: 'select' as const,
            options: ['PoP', 'Data Center', 'Exchange', 'Other'],
        },
        { key: 'notes', label: 'Notes', placeholder: 'Optional notes...' },
    ],
    emptyMessage: 'No handover locations. Add your PoPs and data centers.',
}

// ============================================
// Main Reference Data Page
// ============================================

const tabs = [
    { id: 'cable_systems', label: 'Cable Systems', config: cableSystemsConfig },
    { id: 'landing_stations', label: 'Landing Stations', config: landingStationsConfig },
    { id: 'countries', label: 'Countries', config: countriesConfig },
    { id: 'handover_locations', label: 'Handover Locations', config: handoverLocationsConfig },
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

            {/* Tabs */}
            <div className="flex gap-1 mb-6 border-b border-border-subtle">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer border-b-2 ${activeTab === tab.id
                                ? 'border-primary text-primary'
                                : 'border-transparent text-text-muted hover:text-text'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Active tab content — key forces remount on tab change */}
            <ReferenceDataTable
                key={activeTab}
                table={activeConfig.table}
                columns={activeConfig.columns as Column<{ id: string;[key: string]: unknown }>[]}
                fields={activeConfig.fields}
                emptyMessage={activeConfig.emptyMessage}
            />
        </div>
    )
}
