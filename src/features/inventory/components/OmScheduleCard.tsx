import { useState, useEffect, useCallback } from 'react'
import { Calendar, Plus, Pencil, Trash2, X, Loader2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import {
    type OmAdjustment,
    fetchOmAdjustments,
    insertOmAdjustment,
    updateOmAdjustment,
    deleteOmAdjustment,
} from '@/features/inventory/om-adjustments-api'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

interface Batch {
    id: string
    batch_number: number
    capacity: number
}

interface OmScheduleCardProps {
    resourceId: string
    batches: Batch[]
    isBatchMode: boolean
    isIRU: boolean
}

const typeLabel: Record<string, string> = { waived: 'Waived', prepaid: 'Prepaid', discounted: 'Discounted' }
const typeBadge: Record<string, string> = {
    waived: 'bg-emerald-500/15 text-emerald-400',
    prepaid: 'bg-info/15 text-info',
    discounted: 'bg-amber-500/15 text-amber-400',
}

interface FormState {
    batch_id: string
    start_date: string
    end_date: string
    type: string
    amount: string
    notes: string
}

const emptyForm: FormState = { batch_id: '', start_date: '', end_date: '', type: 'waived', amount: '', notes: '' }

export function OmScheduleCard({ resourceId, batches, isBatchMode, isIRU }: OmScheduleCardProps) {
    const [adjustments, setAdjustments] = useState<OmAdjustment[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editId, setEditId] = useState<string | null>(null)
    const [form, setForm] = useState<FormState>(emptyForm)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [deleting, setDeleting] = useState(false)
    // Track which target the + Add button was clicked for


    const load = useCallback(async () => {
        try {
            setLoading(true)
            const data = await fetchOmAdjustments(resourceId)
            setAdjustments(data)
        } catch { /* ignore */ } finally {
            setLoading(false)
        }
    }, [resourceId])

    useEffect(() => { load() }, [load])

    // Don't render if not IRU/batch mode and no adjustments exist
    if (!loading && adjustments.length === 0 && !isBatchMode && !isIRU) return null

    const openAdd = (batchId: string | null) => {
        setEditId(null)
        setForm({ ...emptyForm, batch_id: batchId ?? '' })
        setError('')
        setShowModal(true)
    }

    const openEdit = (adj: OmAdjustment) => {
        setEditId(adj.id)
        setForm({
            batch_id: adj.batch_id ?? '',
            start_date: adj.start_date,
            end_date: adj.end_date,
            type: adj.type,
            amount: adj.amount ? String(adj.amount) : '',
            notes: adj.notes ?? '',
        })
        setError('')
        setShowModal(true)
    }

    const handleSave = async () => {
        if (!form.start_date || !form.end_date || !form.type) {
            setError('Start date, end date, and type are required')
            return
        }
        setSaving(true)
        setError('')
        try {
            const record = {
                inventory_resource_id: resourceId,
                batch_id: form.batch_id || null,
                start_date: form.start_date,
                end_date: form.end_date,
                type: form.type as OmAdjustment['type'],
                amount: form.amount ? Number(form.amount) : 0,
                notes: form.notes || undefined,
            }
            if (editId) {
                await updateOmAdjustment(editId, record)
            } else {
                await insertOmAdjustment(record)
            }
            setShowModal(false)
            load()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!deleteId) return
        setDeleting(true)
        try {
            await deleteOmAdjustment(deleteId)
            setDeleteId(null)
            load()
        } catch { /* ignore */ } finally {
            setDeleting(false)
        }
    }

    // Group adjustments: base (batch_id=null) and each batch
    const baseAdj = adjustments.filter((a) => !a.batch_id)
    const batchGroups = batches.map((b) => ({
        batch: b,
        adjustments: adjustments.filter((a) => a.batch_id === b.id),
    }))

    const renderTable = (items: OmAdjustment[]) => (
        <div className="bg-background rounded-lg border border-border-subtle overflow-hidden">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-border-subtle">
                        <th className="text-left px-3 py-2 text-xs font-semibold text-text-dim uppercase tracking-wider">Period</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-text-dim uppercase tracking-wider">Type</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-text-dim uppercase tracking-wider">Amount</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-text-dim uppercase tracking-wider">Notes</th>
                        <th className="w-16 px-3 py-2"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                    {items.map((adj) => (
                        <tr key={adj.id} className="hover:bg-surface-hover transition-colors">
                            <td className="px-3 py-2.5 text-sm font-mono">
                                {adj.start_date.slice(0, 7).replace('-', '.')} – {adj.end_date.slice(0, 7).replace('-', '.')}
                            </td>
                            <td className="px-3 py-2.5">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeBadge[adj.type] ?? ''}`}>
                                    {typeLabel[adj.type] ?? adj.type}
                                </span>
                            </td>
                            <td className="px-3 py-2.5 text-sm">
                                {adj.type === 'prepaid' && adj.amount ? formatCurrency(Number(adj.amount)) : '—'}
                            </td>
                            <td className="px-3 py-2.5 text-sm text-text-muted">{adj.notes || '—'}</td>
                            <td className="px-3 py-2.5">
                                <div className="flex items-center gap-1">
                                    <button onClick={() => openEdit(adj)} className="p-1 rounded-md hover:bg-surface-hover text-text-dim hover:text-text transition-colors cursor-pointer"><Pencil className="h-3.5 w-3.5" /></button>
                                    <button onClick={() => setDeleteId(adj.id)} className="p-1 rounded-md hover:bg-destructive/10 text-text-dim hover:text-destructive transition-colors cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )

    return (
        <div className="bg-surface rounded-xl border border-border-subtle p-6">
            <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">O&M Schedule</h2>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 text-primary animate-spin" /></div>
            ) : (
                <div className="space-y-5">
                    {/* Base section */}
                    {(isBatchMode || isIRU) && (
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-medium text-text">{isBatchMode ? 'Base' : 'Resource'}</h3>
                                <button onClick={() => openAdd(null)} className="flex items-center gap-1 text-xs text-primary hover:text-primary-hover transition-colors cursor-pointer">
                                    <Plus className="h-3.5 w-3.5" /> Add
                                </button>
                            </div>
                            {baseAdj.length > 0 ? renderTable(baseAdj) : (
                                <p className="text-xs text-text-dim italic">(No adjustments)</p>
                            )}
                        </div>
                    )}

                    {/* Batch sections */}
                    {isBatchMode && batchGroups.map(({ batch, adjustments: bAdj }) => (
                        <div key={batch.id}>
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-medium text-text">Batch {batch.batch_number} — {batch.capacity}G</h3>
                                <button onClick={() => openAdd(batch.id)} className="flex items-center gap-1 text-xs text-primary hover:text-primary-hover transition-colors cursor-pointer">
                                    <Plus className="h-3.5 w-3.5" /> Add
                                </button>
                            </div>
                            {bAdj.length > 0 ? renderTable(bAdj) : (
                                <p className="text-xs text-text-dim italic">(No adjustments)</p>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                    <div className="bg-surface rounded-xl border border-border-subtle w-full max-w-md mx-4 shadow-2xl">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
                            <h3 className="text-lg font-semibold">{editId ? 'Edit Adjustment' : 'Add O&M Adjustment'}</h3>
                            <button onClick={() => setShowModal(false)} className="p-1 rounded-md hover:bg-surface-hover text-text-dim hover:text-text cursor-pointer"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="px-6 py-4 space-y-4">
                            {isBatchMode && (
                                <div>
                                    <label className="block text-sm font-medium text-text-muted mb-1.5">Applies to</label>
                                    <select value={form.batch_id} onChange={(e) => setForm({ ...form, batch_id: e.target.value })}
                                        className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent">
                                        <option value="">Base</option>
                                        {batches.map((b) => (<option key={b.id} value={b.id}>Batch {b.batch_number} — {b.capacity}G</option>))}
                                    </select>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-muted mb-1.5">Start Date <span className="text-destructive">*</span></label>
                                    <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                                        className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-muted mb-1.5">End Date <span className="text-destructive">*</span></label>
                                    <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                                        className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-muted mb-1.5">Type <span className="text-destructive">*</span></label>
                                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                                    className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent">
                                    <option value="waived">Waived (免除)</option>
                                    <option value="prepaid">Prepaid (预付)</option>
                                    <option value="discounted">Discounted (折扣)</option>
                                </select>
                            </div>
                            {form.type === 'prepaid' && (
                                <div>
                                    <label className="block text-sm font-medium text-text-muted mb-1.5">Prepaid Amount (USD)</label>
                                    <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                                        placeholder="e.g. 9000000"
                                        className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-text-muted mb-1.5">Notes</label>
                                <input type="text" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                    placeholder="e.g. $1.5M offset, 8yr prepaid..."
                                    className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-text-dim" />
                            </div>
                            {error && <div className="text-destructive text-sm bg-destructive/10 rounded-lg px-3 py-2">{error}</div>}
                        </div>
                        <div className="px-6 py-4 border-t border-border-subtle flex justify-end gap-3">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm rounded-lg text-text-muted hover:text-text hover:bg-surface-hover transition-colors cursor-pointer">Cancel</button>
                            <button onClick={handleSave} disabled={saving}
                                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 text-primary-foreground rounded-lg text-sm font-medium transition-colors cursor-pointer">
                                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                                {editId ? 'Save Changes' : 'Add'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmDialog
                open={!!deleteId}
                title="Delete adjustment?"
                message="This will permanently remove this O&M adjustment."
                confirmLabel="Delete"
                variant="danger"
                loading={deleting}
                onCancel={() => setDeleteId(null)}
                onConfirm={handleDelete}
            />
        </div>
    )
}
