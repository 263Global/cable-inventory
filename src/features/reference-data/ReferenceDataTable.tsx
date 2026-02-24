import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'
import { Database, Search, Plus, Pencil, Trash2, X, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { fetchAll, insertRecord, updateRecord, deleteRecord } from '@/lib/api'
import { matchesReferenceSearch } from '@/features/reference-data/search'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

export interface ReferenceColumn<T> {
    key: keyof T | string
    label: string
    render?: (item: T) => ReactNode
}

export interface ReferenceFieldDef {
    key: string
    label: string
    type?: 'text' | 'number' | 'select'
    options?: string[]
    placeholder?: string
    required?: boolean
}

interface ReferenceDataTableProps<T extends { id: string }> {
    table: string
    columns: ReferenceColumn<T>[]
    fields: ReferenceFieldDef[]
    searchKey?: keyof T
    emptyMessage?: string
    fetchFn?: () => Promise<T[]>
}

export function ReferenceDataTable<T extends { id: string; [key: string]: unknown }>({
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
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
    const [deleting, setDeleting] = useState(false)

    const loadData = useCallback(async () => {
        try {
            setLoading(true)
            const result = fetchFn ? await fetchFn() : await fetchAll<T>(table)
            setData(result)
        } catch (loadError) {
            console.error('Failed to load data:', loadError)
        } finally {
            setLoading(false)
        }
    }, [table, fetchFn])

    useEffect(() => {
        loadData()
    }, [loadData])

    const filteredData = data.filter((item) => matchesReferenceSearch(item, search, searchKey))

    const PAGE_SIZE = 15
    const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE))
    const pagedData = useMemo(() => {
        const start = (page - 1) * PAGE_SIZE
        return filteredData.slice(start, start + PAGE_SIZE)
    }, [filteredData, page])

    useEffect(() => {
        setPage(1)
    }, [search])

    const openCreate = () => {
        setEditingItem(null)
        setFormData({})
        setError('')
        setShowModal(true)
    }

    const openEdit = (item: T) => {
        setEditingItem(item)
        const fd: Record<string, string | number> = {}
        fields.forEach((field) => {
            fd[field.key] = (item[field.key] as string | number) ?? ''
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
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : 'Failed to save')
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteConfirm = async () => {
        if (!pendingDeleteId) return
        setDeleting(true)
        try {
            await deleteRecord(table, pendingDeleteId)
            setPendingDeleteId(null)
            loadData()
        } catch (deleteError) {
            console.error('Failed to delete:', deleteError)
        } finally {
            setDeleting(false)
        }
    }

    return (
        <div>
            <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-dim" />
                    <input
                        type="text"
                        placeholder="Search..."
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-text-dim"
                    />
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-primary-foreground rounded-lg text-sm font-medium transition-colors cursor-pointer"
                >
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
                                {columns.map((column) => (
                                    <th key={String(column.key)} className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">{column.label}</th>
                                ))}
                                <th className="w-20 px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle">
                            {pagedData.map((item) => (
                                <tr key={item.id} className="hover:bg-surface-hover transition-colors">
                                    {columns.map((column) => (
                                        <td key={String(column.key)} className="px-4 py-3 text-sm">
                                            {column.render ? column.render(item) : String(item[column.key as keyof T] ?? '—')}
                                        </td>
                                    ))}
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => openEdit(item)} className="p-1.5 rounded-md hover:bg-surface-hover text-text-dim hover:text-text transition-colors cursor-pointer" title="Edit"><Pencil className="h-4 w-4" /></button>
                                            <button onClick={() => setPendingDeleteId(item.id)} className="p-1.5 rounded-md hover:bg-destructive/10 text-text-dim hover:text-destructive transition-colors cursor-pointer" title="Delete"><Trash2 className="h-4 w-4" /></button>
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
                            <button onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1}
                                className="p-1 rounded-md hover:bg-surface-hover text-text-dim hover:text-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer">
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <span className="text-xs text-text-muted">Page {page} of {totalPages}</span>
                            <button onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page === totalPages}
                                className="p-1 rounded-md hover:bg-surface-hover text-text-dim hover:text-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer">
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

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
                                        <select
                                            value={String(formData[field.key] ?? '')}
                                            onChange={(event) => setFormData({ ...formData, [field.key]: event.target.value })}
                                            className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                        >
                                            <option value="">Select...</option>
                                            {field.options?.map((option) => (<option key={option} value={option}>{option}</option>))}
                                        </select>
                                    ) : (
                                        <input
                                            type={field.type === 'number' ? 'number' : 'text'}
                                            value={String(formData[field.key] ?? '')}
                                            onChange={(event) => setFormData({ ...formData, [field.key]: field.type === 'number' ? Number(event.target.value) : event.target.value })}
                                            placeholder={field.placeholder}
                                            className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-text-dim"
                                        />
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

            <ConfirmDialog
                open={!!pendingDeleteId}
                title="Delete this record?"
                message="This will permanently delete this record. This action cannot be undone."
                confirmLabel="Delete"
                variant="danger"
                loading={deleting}
                onCancel={() => setPendingDeleteId(null)}
                onConfirm={handleDeleteConfirm}
            />
        </div>
    )
}
