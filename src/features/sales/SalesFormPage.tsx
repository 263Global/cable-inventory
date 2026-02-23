import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Save, Plus, Trash2, Loader2, FileText, Package } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import {
    fetchSalesOrderById,
    createSalesOrder,
    updateSalesOrder,
    generateOrderId,
    fetchOrderItems,
    createOrderItem,
    updateOrderItem,
    deleteOrderItem,
} from './api'
import type { SalesStatus, SalesItemType, DisposalType } from '@/types'

interface Customer { id: string; name: string }
interface InvResource { id: string; resource_id: string; cable_system_name: string | null; type: string; spec: string | null; total_capacity: number | null }

const STATUSES: SalesStatus[] = ['Draft', 'Pre-sold', 'Active', 'Expired', 'Terminated', 'Cancelled']
const ITEM_TYPES: SalesItemType[] = ['Capacity', 'Backhaul', 'Local Access', 'Cross-Connect', 'NRC', 'Other']
const DISPOSAL_TYPES: DisposalType[] = ['IRU Out', 'Lease Out', 'Swap Out']

interface ItemDraft {
    id?: string
    type: SalesItemType
    inventory_resource_id: string
    description: string
    disposal_type: DisposalType
    capacity: string
    spec: string
    start_date: string
    end_date: string
    term_months: string
    sell_otc: string
    sell_mrc: string
    sell_nrc: string
    sell_om_rate: string
    sell_annual_om: string
    status: SalesStatus
}

const emptyItem = (): ItemDraft => ({
    type: 'Capacity',
    inventory_resource_id: '',
    description: '',
    disposal_type: 'Lease Out',
    capacity: '',
    spec: '',
    start_date: '',
    end_date: '',
    term_months: '',
    sell_otc: '',
    sell_mrc: '',
    sell_nrc: '',
    sell_om_rate: '4',
    sell_annual_om: '',
    status: 'Draft',
})

export function SalesFormPage() {
    const navigate = useNavigate()
    const { id } = useParams<{ id: string }>()
    const isEdit = !!id

    const [step, setStep] = useState(1)
    const [saving, setSaving] = useState(false)
    const [orderId, setOrderId] = useState('')
    const [internalRef, setInternalRef] = useState('')
    const [customerId, setCustomerId] = useState('')
    const [status, setStatus] = useState<SalesStatus>('Draft')
    const [notes, setNotes] = useState('')

    const [items, setItems] = useState<ItemDraft[]>([])
    const [customers, setCustomers] = useState<Customer[]>([])
    const [resources, setResources] = useState<InvResource[]>([])

    // Load reference data
    useEffect(() => {
        (async () => {
            const [{ data: custs }, { data: res }] = await Promise.all([
                supabase.from('customers').select('id, name').order('name'),
                supabase.from('inventory_resources').select('id, resource_id, cable_system_id, cable_system:cable_systems(name), type, spec, total_capacity').order('resource_id'),
            ])
            setCustomers(custs ?? [])
            setResources((res ?? []).map((r: Record<string, unknown>) => ({
                ...r,
                cable_system_name: (r.cable_system as { name: string } | null)?.name ?? null,
            })) as InvResource[])
        })()
    }, [])

    // Load existing order for edit
    useEffect(() => {
        if (!isEdit) {
            generateOrderId().then(setOrderId)
            return
        }
        (async () => {
            const order = await fetchSalesOrderById(id!)
            if (!order) { navigate('/cable-inventory/sales'); return }
            setOrderId(order.order_id)
            setInternalRef(order.internal_ref ?? '')
            setCustomerId(order.customer_id ?? '')
            setStatus(order.status)
            setNotes(order.notes ?? '')

            const existingItems = await fetchOrderItems(id!)
            setItems(existingItems.map((it) => ({
                id: it.id,
                type: it.type,
                inventory_resource_id: it.inventory_resource_id ?? '',
                description: it.description ?? '',
                disposal_type: it.disposal_type ?? 'Lease Out',
                capacity: it.capacity?.toString() ?? '',
                spec: it.spec ?? '',
                start_date: it.start_date ?? '',
                end_date: it.end_date ?? '',
                term_months: it.term_months?.toString() ?? '',
                sell_otc: it.sell_otc?.toString() ?? '',
                sell_mrc: it.sell_mrc?.toString() ?? '',
                sell_nrc: it.sell_nrc?.toString() ?? '',
                sell_om_rate: it.sell_om_rate?.toString() ?? '4',
                sell_annual_om: it.sell_annual_om?.toString() ?? '',
                status: it.status,
            })))
        })()
    }, [id, isEdit, navigate])

    const addItem = () => setItems([...items, emptyItem()])
    const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx))

    const updateItem = (idx: number, field: keyof ItemDraft, value: string) => {
        setItems(items.map((item, i) => {
            if (i !== idx) return item
            const updated = { ...item, [field]: value }
            // Auto-calculate annual O&M when OTC or rate changes
            if ((field === 'sell_otc' || field === 'sell_om_rate') && updated.sell_otc && updated.sell_om_rate) {
                const otc = parseFloat(updated.sell_otc) || 0
                const rate = parseFloat(updated.sell_om_rate) || 0
                updated.sell_annual_om = (otc * rate / 100).toFixed(2)
            }
            // Auto end date
            if ((field === 'start_date' || field === 'term_months') && updated.start_date && updated.term_months) {
                const start = new Date(updated.start_date)
                const months = parseInt(updated.term_months) || 0
                if (months > 0) {
                    start.setMonth(start.getMonth() + months)
                    start.setDate(start.getDate() - 1)
                    updated.end_date = start.toISOString().split('T')[0]
                }
            }
            return updated
        }))
    }

    const handleSave = async () => {
        if (!customerId) { toast.error('Please select a customer'); setStep(1); return }
        setSaving(true)
        try {
            let salesOrderId = id
            if (isEdit) {
                await updateSalesOrder(id!, { customer_id: customerId, internal_ref: internalRef, status, notes })
                // Delete removed items, update existing, create new
                const existing = await fetchOrderItems(id!)
                const existingIds = new Set(items.filter(it => it.id).map(it => it.id!))
                for (const ex of existing) {
                    if (!existingIds.has(ex.id)) await deleteOrderItem(ex.id)
                }
            } else {
                const order = await createSalesOrder({ order_id: orderId, internal_ref: internalRef || undefined, customer_id: customerId, status, notes })
                salesOrderId = order.id
            }

            // Save items
            for (const item of items) {
                const payload = {
                    sales_order_id: salesOrderId!,
                    type: item.type,
                    inventory_resource_id: item.inventory_resource_id || undefined,
                    description: item.description || undefined,
                    disposal_type: item.disposal_type,
                    capacity: item.capacity ? parseFloat(item.capacity) : undefined,
                    spec: item.spec || undefined,
                    start_date: item.start_date || undefined,
                    end_date: item.end_date || undefined,
                    term_months: item.term_months ? parseInt(item.term_months) : undefined,
                    sell_otc: item.sell_otc ? parseFloat(item.sell_otc) : undefined,
                    sell_mrc: item.sell_mrc ? parseFloat(item.sell_mrc) : undefined,
                    sell_nrc: item.sell_nrc ? parseFloat(item.sell_nrc) : undefined,
                    sell_om_rate: item.sell_om_rate ? parseFloat(item.sell_om_rate) : undefined,
                    sell_annual_om: item.sell_annual_om ? parseFloat(item.sell_annual_om) : undefined,
                    status: item.status,
                }
                if (item.id && isEdit) {
                    await updateOrderItem(item.id, payload)
                } else {
                    await createOrderItem(payload)
                }
            }

            toast.success(isEdit ? 'Order updated' : 'Order created')
            navigate(`/cable-inventory/sales/${salesOrderId}`)
        } catch (err) {
            console.error(err)
            toast.error(err instanceof Error ? err.message : 'Failed to save')
        } finally {
            setSaving(false)
        }
    }

    const isIRUStyle = (dt: DisposalType) => dt === 'IRU Out' || dt === 'Swap Out'
    const canLinkInventory = (type: SalesItemType) => type === 'Capacity' || type === 'Backhaul'

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-surface-hover transition-colors cursor-pointer">
                    <ArrowLeft className="h-5 w-5 text-text-muted" />
                </button>
                <FileText className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-bold">{isEdit ? `Edit ${orderId}` : 'New Sales Order'}</h1>
                <span className="font-mono text-primary text-sm">{orderId}</span>
            </div>

            {/* Steps indicator */}
            <div className="flex items-center gap-4 mb-8">
                {['Order Info', 'Line Items'].map((label, i) => {
                    const num = i + 1
                    const active = step === num
                    const done = step > num
                    return (
                        <button key={label} onClick={() => setStep(num)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${active ? 'bg-primary text-white' : done ? 'bg-primary/10 text-primary' : 'bg-surface-hover text-text-muted'}`}
                        >
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${active ? 'bg-white/20' : done ? 'bg-primary/20' : 'bg-surface'}`}>
                                {num}
                            </span>
                            {label}
                        </button>
                    )
                })}
            </div>

            {/* Step 1: Order Info */}
            {step === 1 && (
                <div className="bg-surface rounded-xl border border-border-subtle p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-muted mb-1">Customer *</label>
                            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}
                                className="w-full px-3 py-2 bg-background border border-border-subtle rounded-lg text-sm text-text focus:ring-1 focus:ring-primary focus:outline-none"
                            >
                                <option value="">Select customer...</option>
                                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-muted mb-1">Status</label>
                            <select value={status} onChange={(e) => setStatus(e.target.value as SalesStatus)}
                                className="w-full px-3 py-2 bg-background border border-border-subtle rounded-lg text-sm text-text focus:ring-1 focus:ring-primary focus:outline-none"
                            >
                                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-muted mb-1">Internal Ref (optional)</label>
                        <input type="text" value={internalRef} onChange={(e) => setInternalRef(e.target.value)}
                            placeholder="Your internal order number"
                            className="w-full px-3 py-2 bg-background border border-border-subtle rounded-lg text-sm text-text placeholder:text-text-dim focus:ring-1 focus:ring-primary focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-muted mb-1">Notes</label>
                        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
                            className="w-full px-3 py-2 bg-background border border-border-subtle rounded-lg text-sm text-text placeholder:text-text-dim focus:ring-1 focus:ring-primary focus:outline-none resize-none"
                        />
                    </div>
                    <div className="flex justify-end">
                        <button onClick={() => setStep(2)}
                            className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                        >
                            Next <ArrowRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Step 2: Line Items */}
            {step === 2 && (
                <div className="space-y-4">
                    {items.length === 0 && (
                        <div className="bg-surface rounded-xl border border-border-subtle p-8 text-center">
                            <Package className="h-10 w-10 text-text-dim mx-auto mb-3" />
                            <p className="text-text-muted mb-4">No items yet. Add your first line item.</p>
                        </div>
                    )}

                    {items.map((item, idx) => (
                        <div key={idx} className="bg-surface rounded-xl border border-border-subtle p-5 space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-text">Item {idx + 1}</span>
                                <button onClick={() => removeItem(idx)} className="p-1.5 rounded-md hover:bg-destructive/10 text-text-dim hover:text-destructive transition-colors cursor-pointer">
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Row 1: Type + Disposal + inventory link */}
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs text-text-dim mb-1">Type</label>
                                    <select value={item.type} onChange={(e) => updateItem(idx, 'type', e.target.value)}
                                        className="w-full px-3 py-2 bg-background border border-border-subtle rounded-lg text-sm text-text focus:ring-1 focus:ring-primary focus:outline-none"
                                    >
                                        {ITEM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-text-dim mb-1">Disposal Type</label>
                                    <select value={item.disposal_type} onChange={(e) => updateItem(idx, 'disposal_type', e.target.value)}
                                        className="w-full px-3 py-2 bg-background border border-border-subtle rounded-lg text-sm text-text focus:ring-1 focus:ring-primary focus:outline-none"
                                    >
                                        {DISPOSAL_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                                {canLinkInventory(item.type) ? (
                                    <div>
                                        <label className="block text-xs text-text-dim mb-1">Inventory Resource</label>
                                        <select value={item.inventory_resource_id} onChange={(e) => {
                                            updateItem(idx, 'inventory_resource_id', e.target.value)
                                            const res = resources.find(r => r.id === e.target.value)
                                            if (res?.spec) updateItem(idx, 'spec', res.spec)
                                        }}
                                            className="w-full px-3 py-2 bg-background border border-border-subtle rounded-lg text-sm text-text focus:ring-1 focus:ring-primary focus:outline-none"
                                        >
                                            <option value="">Select resource...</option>
                                            {resources
                                                .filter(r => item.type === 'Capacity' ? r.type === 'Capacity' : r.type === 'Terrestrial')
                                                .map((r) => (
                                                    <option key={r.id} value={r.id}>
                                                        {r.resource_id} — {r.cable_system_name || r.type} {r.spec || ''}
                                                    </option>
                                                ))}
                                        </select>
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-xs text-text-dim mb-1">Description</label>
                                        <input type="text" value={item.description} onChange={(e) => updateItem(idx, 'description', e.target.value)}
                                            placeholder="e.g. 楼内线 中环17楼"
                                            className="w-full px-3 py-2 bg-background border border-border-subtle rounded-lg text-sm text-text placeholder:text-text-dim focus:ring-1 focus:ring-primary focus:outline-none"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Row 2: Capacity + Spec + Dates */}
                            <div className="grid grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-xs text-text-dim mb-1">Capacity</label>
                                    <input type="number" value={item.capacity} onChange={(e) => updateItem(idx, 'capacity', e.target.value)}
                                        className="w-full px-3 py-2 bg-background border border-border-subtle rounded-lg text-sm text-text focus:ring-1 focus:ring-primary focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-text-dim mb-1">Spec</label>
                                    <input type="text" value={item.spec} onChange={(e) => updateItem(idx, 'spec', e.target.value)} placeholder="100G"
                                        className="w-full px-3 py-2 bg-background border border-border-subtle rounded-lg text-sm text-text placeholder:text-text-dim focus:ring-1 focus:ring-primary focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-text-dim mb-1">Start Date</label>
                                    <input type="date" value={item.start_date} onChange={(e) => updateItem(idx, 'start_date', e.target.value)}
                                        className="w-full px-3 py-2 bg-background border border-border-subtle rounded-lg text-sm text-text focus:ring-1 focus:ring-primary focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-text-dim mb-1">Term (months)</label>
                                    <input type="number" value={item.term_months} onChange={(e) => updateItem(idx, 'term_months', e.target.value)}
                                        className="w-full px-3 py-2 bg-background border border-border-subtle rounded-lg text-sm text-text focus:ring-1 focus:ring-primary focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* Row 3: Financials (dynamic by disposal type) */}
                            <div className="grid grid-cols-4 gap-4">
                                {isIRUStyle(item.disposal_type) ? (
                                    <>
                                        <div>
                                            <label className="block text-xs text-text-dim mb-1">Sell OTC ($)</label>
                                            <input type="number" value={item.sell_otc} onChange={(e) => updateItem(idx, 'sell_otc', e.target.value)}
                                                className="w-full px-3 py-2 bg-background border border-border-subtle rounded-lg text-sm text-text focus:ring-1 focus:ring-primary focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-text-dim mb-1">O&M Rate (%)</label>
                                            <input type="number" step="0.1" value={item.sell_om_rate} onChange={(e) => updateItem(idx, 'sell_om_rate', e.target.value)}
                                                className="w-full px-3 py-2 bg-background border border-border-subtle rounded-lg text-sm text-text focus:ring-1 focus:ring-primary focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-text-dim mb-1">Annual O&M ($)</label>
                                            <input type="number" value={item.sell_annual_om} onChange={(e) => updateItem(idx, 'sell_annual_om', e.target.value)}
                                                className="w-full px-3 py-2 bg-background border border-border-subtle rounded-lg text-sm text-text focus:ring-1 focus:ring-primary focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-text-dim mb-1">NRC ($)</label>
                                            <input type="number" value={item.sell_nrc} onChange={(e) => updateItem(idx, 'sell_nrc', e.target.value)}
                                                className="w-full px-3 py-2 bg-background border border-border-subtle rounded-lg text-sm text-text focus:ring-1 focus:ring-primary focus:outline-none"
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            <label className="block text-xs text-text-dim mb-1">Sell MRC ($)</label>
                                            <input type="number" value={item.sell_mrc} onChange={(e) => updateItem(idx, 'sell_mrc', e.target.value)}
                                                className="w-full px-3 py-2 bg-background border border-border-subtle rounded-lg text-sm text-text focus:ring-1 focus:ring-primary focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-text-dim mb-1">NRC ($)</label>
                                            <input type="number" value={item.sell_nrc} onChange={(e) => updateItem(idx, 'sell_nrc', e.target.value)}
                                                className="w-full px-3 py-2 bg-background border border-border-subtle rounded-lg text-sm text-text focus:ring-1 focus:ring-primary focus:outline-none"
                                            />
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* End date display */}
                            {item.end_date && (
                                <p className="text-xs text-text-dim">End date: {item.end_date}</p>
                            )}
                        </div>
                    ))}

                    <button onClick={addItem}
                        className="flex items-center gap-2 w-full justify-center py-3 border-2 border-dashed border-border-subtle rounded-xl text-sm text-text-muted hover:text-text hover:border-primary/30 transition-colors cursor-pointer"
                    >
                        <Plus className="h-4 w-4" /> Add Item
                    </button>

                    <div className="flex items-center justify-between pt-4">
                        <button onClick={() => setStep(1)}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-text-muted hover:text-text transition-colors cursor-pointer"
                        >
                            <ArrowLeft className="h-4 w-4" /> Back
                        </button>
                        <button onClick={handleSave} disabled={saving}
                            className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            {isEdit ? 'Update' : 'Create'} Order
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
