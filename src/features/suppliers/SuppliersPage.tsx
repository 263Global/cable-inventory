import { useState, useEffect, useCallback } from 'react'
import { Building2, Search, Plus, Pencil, Trash2, X, Loader2, Globe, Mail, Phone } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
    createSupplier,
    deleteSupplier,
    fetchSuppliers,
    updateSupplier,
    type SupplierRecord,
} from '@/features/crm/api'

type Supplier = SupplierRecord

export function SuppliersPage() {
    const [suppliers, setSuppliers] = useState<Supplier[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [editingItem, setEditingItem] = useState<Supplier | null>(null)
    const [formData, setFormData] = useState({ name: '', contact_name: '', contact_email: '', phone: '', website: '', notes: '' })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null)
    const [deleting, setDeleting] = useState(false)

    const load = useCallback(async () => {
        try {
            setLoading(true)
            setSuppliers(await fetchSuppliers())
        } catch (err) {
            console.error(err)
            toast.error('Failed to load suppliers')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { load() }, [load])

    const filtered = suppliers.filter((s) => {
        if (!search) return true
        const q = search.toLowerCase()
        return s.name.toLowerCase().includes(q)
            || s.contact_name?.toLowerCase().includes(q)
            || s.contact_email?.toLowerCase().includes(q)
    })

    const openCreate = () => { setEditingItem(null); setFormData({ name: '', contact_name: '', contact_email: '', phone: '', website: '', notes: '' }); setError(''); setShowModal(true) }

    const openEdit = (s: Supplier) => {
        setEditingItem(s)
        setFormData({
            name: s.name, contact_name: s.contact_name ?? '', contact_email: s.contact_email ?? '',
            phone: s.phone ?? '', website: s.website ?? '', notes: s.notes ?? '',
        })
        setError(''); setShowModal(true)
    }

    const handleSave = async () => {
        if (!formData.name.trim()) { setError('Name is required'); return }
        setSaving(true); setError('')
        try {
            const payload = {
                name: formData.name.trim(),
                contact_name: formData.contact_name.trim() || null,
                contact_email: formData.contact_email.trim() || null,
                phone: formData.phone.trim() || null,
                website: formData.website.trim() || null,
                notes: formData.notes.trim() || null,
            }
            if (editingItem) {
                await updateSupplier(editingItem.id, payload)
                toast.success('Supplier updated')
            } else {
                await createSupplier(payload)
                toast.success('Supplier created')
            }
            setShowModal(false); load()
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to save'
            setError(msg)
            toast.error(msg)
        }
        finally { setSaving(false) }
    }

    // Delete handled by ConfirmDialog below

    return (
        <div>
            <div className="flex items-center gap-3 mb-8">
                <Building2 className="h-7 w-7 text-primary" />
                <h1 className="text-2xl font-bold">Suppliers</h1>
                <span className="text-sm text-text-dim">{suppliers.length} supplier{suppliers.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-dim" />
                    <input type="text" placeholder="Search suppliers..." value={search} onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-text-dim" />
                </div>
                <button onClick={openCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-primary-foreground rounded-lg text-sm font-medium transition-colors cursor-pointer">
                    <Plus className="h-4 w-4" /> Add Supplier
                </button>
            </div>

            <div className="bg-surface rounded-xl border border-border-subtle overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 text-primary animate-spin" /></div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16">
                        <Building2 className="h-10 w-10 text-text-dim mx-auto mb-3" />
                        <p className="text-text-muted">{search ? 'No suppliers match your search' : 'No suppliers yet'}</p>
                    </div>
                ) : (
                    <div className="grid gap-0 divide-y divide-border-subtle">
                        {filtered.map((s) => (
                            <div key={s.id} className="flex items-center gap-4 px-5 py-4 hover:bg-surface-hover transition-colors">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                                    {s.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold truncate">{s.name}</p>
                                    <div className="flex items-center gap-4 mt-0.5 text-xs text-text-dim">
                                        {s.contact_name && <span>{s.contact_name}</span>}
                                        {s.contact_email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{s.contact_email}</span>}
                                        {s.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{s.phone}</span>}
                                        {s.website && <span className="flex items-center gap-1"><Globe className="h-3 w-3" />{s.website}</span>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <button onClick={() => openEdit(s)} className="p-1.5 rounded-md hover:bg-surface-hover text-text-dim hover:text-text transition-colors cursor-pointer" title="Edit"><Pencil className="h-4 w-4" /></button>
                                    <button onClick={() => setDeleteTarget(s)} className="p-1.5 rounded-md hover:bg-destructive/10 text-text-dim hover:text-destructive transition-colors cursor-pointer" title="Delete"><Trash2 className="h-4 w-4" /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                <div className="px-4 py-3 border-t border-border-subtle text-xs text-text-dim">
                    {filtered.length} supplier{filtered.length !== 1 ? 's' : ''}{search && ` (filtered from ${suppliers.length})`}
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                    <div className="bg-surface rounded-xl border border-border-subtle w-full max-w-md mx-4 shadow-2xl">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
                            <h3 className="text-lg font-semibold">{editingItem ? 'Edit Supplier' : 'Add Supplier'}</h3>
                            <button onClick={() => setShowModal(false)} className="p-1 rounded-md hover:bg-surface-hover text-text-dim hover:text-text cursor-pointer"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="px-6 py-4 space-y-4">
                            <Field label="Name *" value={formData.name} onChange={(v) => setFormData({ ...formData, name: v })} placeholder="e.g. Telia Carrier" />
                            <Field label="Contact Name" value={formData.contact_name} onChange={(v) => setFormData({ ...formData, contact_name: v })} placeholder="John Doe" />
                            <Field label="Contact Email" value={formData.contact_email} onChange={(v) => setFormData({ ...formData, contact_email: v })} placeholder="john@example.com" type="email" />
                            <Field label="Phone" value={formData.phone} onChange={(v) => setFormData({ ...formData, phone: v })} placeholder="+65 1234 5678" />
                            <Field label="Website" value={formData.website} onChange={(v) => setFormData({ ...formData, website: v })} placeholder="https://..." />
                            <Field label="Notes" value={formData.notes} onChange={(v) => setFormData({ ...formData, notes: v })} placeholder="Optional notes..." />
                            {error && <div className="text-destructive text-sm bg-destructive/10 rounded-lg px-3 py-2">{error}</div>}
                        </div>
                        <div className="px-6 py-4 border-t border-border-subtle flex justify-end gap-3">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm rounded-lg text-text-muted hover:text-text hover:bg-surface-hover transition-colors cursor-pointer">Cancel</button>
                            <button onClick={handleSave} disabled={saving}
                                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 text-primary-foreground rounded-lg text-sm font-medium transition-colors cursor-pointer">
                                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                                {editingItem ? 'Save' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            <ConfirmDialog
                open={!!deleteTarget}
                title={`Delete ${deleteTarget?.name ?? 'supplier'}?`}
                message="This will permanently delete this supplier. This action cannot be undone."
                confirmLabel="Delete Supplier"
                variant="danger"
                loading={deleting}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={async () => {
                    if (!deleteTarget) return
                    setDeleting(true)
                    try {
                        await deleteSupplier(deleteTarget.id)
                        toast.success(`${deleteTarget.name} deleted`)
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

function Field({ label, value, onChange, placeholder, type = 'text' }: {
    label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
    return (
        <div>
            <label className="block text-sm font-medium text-text-muted mb-1.5">{label}</label>
            <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
                className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-text-dim" />
        </div>
    )
}
