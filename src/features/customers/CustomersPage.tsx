import { useState, useEffect, useCallback } from 'react'
import { Users, Search, Plus, Pencil, Trash2, X, Loader2, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

interface Customer {
    id: string
    name: string
    full_name: string | null
    contact_name: string | null
    contact_email: string | null
    phone: string | null
    country: string | null
    notes: string | null
}

export function CustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [editingItem, setEditingItem] = useState<Customer | null>(null)
    const [formData, setFormData] = useState({ name: '', full_name: '', contact_name: '', contact_email: '', phone: '', country: '', notes: '' })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null)
    const [deleting, setDeleting] = useState(false)

    const load = useCallback(async () => {
        setLoading(true)
        const { data, error } = await supabase.from('customers').select('*').order('name')
        if (!error) setCustomers(data ?? [])
        setLoading(false)
    }, [])

    useEffect(() => { load() }, [load])

    const filtered = customers.filter((c) => {
        if (!search) return true
        const q = search.toLowerCase()
        return c.name.toLowerCase().includes(q)
            || c.full_name?.toLowerCase().includes(q)
            || c.contact_name?.toLowerCase().includes(q)
            || c.contact_email?.toLowerCase().includes(q)
            || c.country?.toLowerCase().includes(q)
    })

    const openCreate = () => {
        setEditingItem(null)
        setFormData({ name: '', full_name: '', contact_name: '', contact_email: '', phone: '', country: '', notes: '' })
        setError(''); setShowModal(true)
    }

    const openEdit = (c: Customer) => {
        setEditingItem(c)
        setFormData({
            name: c.name, full_name: c.full_name ?? '', contact_name: c.contact_name ?? '',
            contact_email: c.contact_email ?? '', phone: c.phone ?? '', country: c.country ?? '', notes: c.notes ?? '',
        })
        setError(''); setShowModal(true)
    }

    const handleSave = async () => {
        if (!formData.name.trim()) { setError('Name is required'); return }
        setSaving(true); setError('')
        try {
            const payload = {
                name: formData.name.trim(),
                full_name: formData.full_name.trim() || null,
                contact_name: formData.contact_name.trim() || null,
                contact_email: formData.contact_email.trim() || null,
                phone: formData.phone.trim() || null,
                country: formData.country.trim() || null,
                notes: formData.notes.trim() || null,
            }
            if (editingItem) {
                const { error } = await supabase.from('customers').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editingItem.id)
                if (error) throw error
                toast.success('Customer updated')
            } else {
                const { error } = await supabase.from('customers').insert(payload)
                if (error) throw error
                toast.success('Customer created')
            }
            setShowModal(false); load()
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to save'
            setError(msg)
            toast.error(msg)
        } finally { setSaving(false) }
    }

    return (
        <div>
            <div className="flex items-center gap-3 mb-8">
                <Users className="h-7 w-7 text-primary" />
                <h1 className="text-2xl font-bold">Customers</h1>
                <span className="text-sm text-text-dim">{customers.length} customer{customers.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-dim" />
                    <input type="text" placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-text-dim" />
                </div>
                <button onClick={openCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-primary-foreground rounded-lg text-sm font-medium transition-colors cursor-pointer">
                    <Plus className="h-4 w-4" /> Add Customer
                </button>
            </div>

            <div className="bg-surface rounded-xl border border-border-subtle overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 text-primary animate-spin" /></div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16">
                        <Users className="h-10 w-10 text-text-dim mx-auto mb-3" />
                        <p className="text-text-muted">{search ? 'No customers match your search' : 'No customers yet'}</p>
                    </div>
                ) : (
                    <div className="grid gap-0 divide-y divide-border-subtle">
                        {filtered.map((c) => (
                            <div key={c.id} className="flex items-center gap-4 px-5 py-4 hover:bg-surface-hover transition-colors">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                                    {c.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold truncate">{c.name}</p>
                                    <div className="flex items-center gap-4 mt-0.5 text-xs text-text-dim">
                                        {c.full_name && <span className="text-text-muted">{c.full_name}</span>}
                                        {c.contact_name && <span>{c.contact_name}</span>}
                                        {c.contact_email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{c.contact_email}</span>}
                                        {c.country && <span className="px-1.5 py-0.5 bg-surface-hover rounded text-text-dim">{c.country}</span>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <button onClick={() => openEdit(c)} className="p-1.5 rounded-md hover:bg-surface-hover text-text-dim hover:text-text transition-colors cursor-pointer" title="Edit"><Pencil className="h-4 w-4" /></button>
                                    <button onClick={() => setDeleteTarget(c)} className="p-1.5 rounded-md hover:bg-destructive/10 text-text-dim hover:text-destructive transition-colors cursor-pointer" title="Delete"><Trash2 className="h-4 w-4" /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                <div className="px-4 py-3 border-t border-border-subtle text-xs text-text-dim">
                    {filtered.length} customer{filtered.length !== 1 ? 's' : ''}{search && ` (filtered from ${customers.length})`}
                </div>
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-surface rounded-xl border border-border-subtle w-full max-w-md mx-4 shadow-2xl">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
                            <h3 className="text-lg font-semibold">{editingItem ? 'Edit Customer' : 'Add Customer'}</h3>
                            <button onClick={() => setShowModal(false)} className="p-1 rounded-md hover:bg-surface-hover text-text-dim hover:text-text cursor-pointer"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="px-6 py-4 space-y-4">
                            <Field label="Short Name *" value={formData.name} onChange={(v) => setFormData({ ...formData, name: v })} placeholder="e.g. Telstra" />
                            <Field label="Full Name" value={formData.full_name} onChange={(v) => setFormData({ ...formData, full_name: v })} placeholder="e.g. Telstra Corporation Limited" />
                            <Field label="Contact Name" value={formData.contact_name} onChange={(v) => setFormData({ ...formData, contact_name: v })} placeholder="John Doe" />
                            <Field label="Contact Email" value={formData.contact_email} onChange={(v) => setFormData({ ...formData, contact_email: v })} placeholder="john@example.com" type="email" />
                            <Field label="Phone" value={formData.phone} onChange={(v) => setFormData({ ...formData, phone: v })} placeholder="+65 1234 5678" />
                            <Field label="Country" value={formData.country} onChange={(v) => setFormData({ ...formData, country: v })} placeholder="e.g. Australia" />
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
                title={`Delete ${deleteTarget?.name ?? 'customer'}?`}
                message="This will permanently delete this customer. This action cannot be undone."
                confirmLabel="Delete Customer"
                variant="danger"
                loading={deleting}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={async () => {
                    if (!deleteTarget) return
                    setDeleting(true)
                    try {
                        await supabase.from('customers').delete().eq('id', deleteTarget.id)
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
