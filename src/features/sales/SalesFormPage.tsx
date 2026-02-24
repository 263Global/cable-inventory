import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Save, Plus, Trash2, Loader2, FileText, Package, Check } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import {
    fetchSalesOrderById,
    createSalesOrder,
    updateSalesOrder,
    generateOrderId,
    fetchOrderItems,
    createOrderItem,
    updateOrderItem,
    deleteOrderItem,
    allocateCircuits,
    deallocateCircuits,
    recalcInventoryCapacity,
} from './api'
import type { SalesStatus, SalesItemType, DisposalType } from '@/types'

interface Customer { id: string; name: string }
interface InvResource {
    id: string
    resource_id: string
    cable_system_name: string | null
    type: string
    spec: string | null
    total_capacity: number | null
    used_capacity: number | null
    route_description: string | null
    landing_a_name: string | null
    landing_z_name: string | null
    handover_a_name: string | null
    handover_z_name: string | null
}

const STATUSES: SalesStatus[] = ['Draft', 'Pre-sold', 'Active', 'Expired', 'Terminated', 'Cancelled']
const ITEM_TYPES: SalesItemType[] = ['Capacity', 'Backhaul', 'Cross-Connect', 'NRC', 'Other']

// Field visibility config per item type
const FIELD_CFG: Record<string, { disposal: boolean; resource: boolean | 'terrestrial'; circuits: boolean; capacity: boolean; description: 'optional' | 'required'; term: boolean; mrc: boolean; nrc: boolean }> = {
    'Capacity': { disposal: true, resource: true, circuits: true, capacity: true, description: 'optional', term: true, mrc: true, nrc: true },
    'Backhaul': { disposal: true, resource: 'terrestrial', circuits: true, capacity: true, description: 'optional', term: true, mrc: true, nrc: true },
    'Cross-Connect': { disposal: false, resource: false, circuits: false, capacity: false, description: 'required', term: true, mrc: true, nrc: true },
    'NRC': { disposal: false, resource: false, circuits: false, capacity: false, description: 'required', term: false, mrc: false, nrc: true },
    'Other': { disposal: false, resource: false, circuits: false, capacity: false, description: 'required', term: true, mrc: true, nrc: true },
}
const DISPOSAL_TYPES: DisposalType[] = ['IRU Out', 'Lease Out', 'Swap Out', 'Self Use']

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
    selectedCircuitIds: string[]
    existingCircuitIds: string[]  // circuits already allocated (for edit mode)
}

interface AvailCircuit {
    id: string
    circuit_number: number
    capacity: number
    interface_type: string
    status: string
    handover_a: string | null
    handover_z: string | null
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
    selectedCircuitIds: [],
    existingCircuitIds: [],
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
    // Circuits per resource: { resourceId: AvailCircuit[] }
    const [circuitsByResource, setCircuitsByResource] = useState<Record<string, AvailCircuit[]>>({})

    // Load reference data
    useEffect(() => {
        (async () => {
            const [{ data: custs }, { data: res }] = await Promise.all([
                supabase.from('customers').select('id, name').order('name'),
                supabase.from('inventory_resources').select(`
                    id, resource_id, type, spec, total_capacity, used_capacity, route_description,
                    cable_system:cable_systems(name),
                    landing_station_a:landing_stations!inventory_resources_landing_station_a_id_fkey(name),
                    landing_station_z:landing_stations!inventory_resources_landing_station_z_id_fkey(name),
                    handover_a:handover_locations!inventory_resources_handover_location_a_id_fkey(name),
                    handover_z:handover_locations!inventory_resources_handover_location_z_id_fkey(name)
                `).order('resource_id'),
            ])
            setCustomers(custs ?? [])
            setResources((res ?? []).map((r: Record<string, unknown>) => ({
                id: r.id as string,
                resource_id: r.resource_id as string,
                type: r.type as string,
                spec: r.spec as string | null,
                total_capacity: r.total_capacity as number | null,
                used_capacity: r.used_capacity as number | null,
                route_description: r.route_description as string | null,
                cable_system_name: (r.cable_system as { name: string } | null)?.name ?? null,
                landing_a_name: (r.landing_station_a as { name: string } | null)?.name ?? null,
                landing_z_name: (r.landing_station_z as { name: string } | null)?.name ?? null,
                handover_a_name: (r.handover_a as { name: string } | null)?.name ?? null,
                handover_z_name: (r.handover_z as { name: string } | null)?.name ?? null,
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
            if (!order) { navigate('/sales'); return }
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
                selectedCircuitIds: (it.allocated_circuits ?? []).map(c => c.inventory_circuit_id),
                existingCircuitIds: (it.allocated_circuits ?? []).map(c => c.inventory_circuit_id),
            })))

            // Pre-load circuits for linked resources
            const resourceIds = [...new Set(existingItems.filter(it => it.inventory_resource_id).map(it => it.inventory_resource_id!))]
            for (const rid of resourceIds) {
                loadCircuitsForResource(rid)
            }
        })()
    }, [id, isEdit, navigate]) // eslint-disable-line react-hooks/exhaustive-deps

    const addItem = () => setItems([...items, emptyItem()])
    const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx))

    // Fetch circuits when resource changes
    const loadCircuitsForResource = async (resourceId: string) => {
        if (!resourceId || circuitsByResource[resourceId]) return
        const { data } = await supabase
            .from('inventory_circuits')
            .select(`id, circuit_number, capacity, status,
                current_type:interface_types!inventory_circuits_current_interface_type_id_fkey(name),
                handover_a:handover_locations!inventory_circuits_handover_location_a_id_fkey(name),
                handover_z:handover_locations!inventory_circuits_handover_location_z_id_fkey(name)`)
            .eq('inventory_resource_id', resourceId)
            .order('circuit_number')
        setCircuitsByResource(prev => ({
            ...prev,
            [resourceId]: (data ?? []).map((c: Record<string, unknown>) => ({
                id: c.id as string,
                circuit_number: c.circuit_number as number,
                capacity: c.capacity as number,
                interface_type: (c.current_type as { name: string } | null)?.name ?? '—',
                status: c.status as string,
                handover_a: (c.handover_a as { name: string } | null)?.name ?? null,
                handover_z: (c.handover_z as { name: string } | null)?.name ?? null,
            })),
        }))
    }

    const toggleCircuit = (idx: number, circuitId: string) => {
        setItems(prev => prev.map((item, i) => {
            if (i !== idx) return item
            const selected = item.selectedCircuitIds.includes(circuitId)
                ? item.selectedCircuitIds.filter(id => id !== circuitId)
                : [...item.selectedCircuitIds, circuitId]
            // Auto-calc capacity from selected circuits
            const circuits = circuitsByResource[item.inventory_resource_id] ?? []
            const totalCap = circuits
                .filter(c => selected.includes(c.id))
                .reduce((sum, c) => sum + c.capacity, 0)
            return { ...item, selectedCircuitIds: selected, capacity: totalCap.toString() }
        }))
    }

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
            // Clear irrelevant fields on type change
            if (field === 'type') {
                const cfg = FIELD_CFG[value] ?? FIELD_CFG['Other']
                if (!cfg.resource) { updated.inventory_resource_id = ''; updated.selectedCircuitIds = []; updated.existingCircuitIds = [] }
                if (!cfg.capacity) { updated.capacity = ''; updated.spec = '' }
                if (!cfg.disposal) { updated.disposal_type = (value === 'Cross-Connect' ? 'Lease Out' : 'IRU Out') as DisposalType }
                if (!cfg.term) { updated.term_months = ''; updated.end_date = '' }
                if (!cfg.mrc) { updated.sell_mrc = ''; updated.sell_otc = ''; updated.sell_om_rate = ''; updated.sell_annual_om = '' }
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

            // Save items + allocate circuits
            const affectedResourceIds = new Set<string>()
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
                let itemId = item.id
                if (item.id && isEdit) {
                    await updateOrderItem(item.id, payload)
                } else {
                    const created = await createOrderItem(payload)
                    itemId = created.id
                }

                // Handle circuit allocation changes
                if (itemId && item.inventory_resource_id) {
                    affectedResourceIds.add(item.inventory_resource_id)
                    // Deallocate old circuits first (edit mode)
                    if (item.existingCircuitIds.length > 0) {
                        await deallocateCircuits(itemId)
                    }
                    // Allocate new circuits
                    if (item.selectedCircuitIds.length > 0) {
                        await allocateCircuits(itemId, item.selectedCircuitIds, status)
                    }
                }
            }

            // Recalculate capacity usage for all affected inventory resources
            await Promise.all([...affectedResourceIds].map(recalcInventoryCapacity))

            toast.success(isEdit ? 'Order updated' : 'Order created')
            navigate(`/sales/${salesOrderId}`)
        } catch (err) {
            console.error(err)
            toast.error(err instanceof Error ? err.message : 'Failed to save')
        } finally {
            setSaving(false)
        }
    }

    const isIRUStyle = (dt: DisposalType) => dt === 'IRU Out' || dt === 'Swap Out'
    const canLinkInventory = (type: SalesItemType) => !!(FIELD_CFG[type]?.resource)

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
                            <SearchableSelect
                                options={customers.map((c) => ({ value: c.id, label: c.name }))}
                                value={customerId}
                                onChange={setCustomerId}
                                placeholder="Search customer..."
                            />
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
                            {/* Row 1 top: Type + Disposal/Resource/Description */}
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs text-text-dim mb-1">Type</label>
                                    <select value={item.type} onChange={(e) => updateItem(idx, 'type', e.target.value)}
                                        className="w-full px-3 py-2 bg-background border border-border-subtle rounded-lg text-sm text-text focus:ring-1 focus:ring-primary focus:outline-none"
                                    >
                                        {ITEM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                {(FIELD_CFG[item.type]?.disposal ?? false) && (
                                    <div>
                                        <label className="block text-xs text-text-dim mb-1">Disposal Type</label>
                                        <select value={item.disposal_type} onChange={(e) => updateItem(idx, 'disposal_type', e.target.value)}
                                            className="w-full px-3 py-2 bg-background border border-border-subtle rounded-lg text-sm text-text focus:ring-1 focus:ring-primary focus:outline-none"
                                        >
                                            {DISPOSAL_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                    </div>
                                )}
                                {canLinkInventory(item.type) ? (
                                    <div>
                                        <label className="block text-xs text-text-dim mb-1">Inventory Resource</label>
                                        <SearchableSelect
                                            options={resources
                                                .filter(r => FIELD_CFG[item.type]?.resource === 'terrestrial' ? r.type === 'Terrestrial' : r.type === 'Capacity')
                                                .map((r) => {
                                                    const route = r.type === 'Terrestrial'
                                                        ? [r.handover_a_name, r.handover_z_name].filter(Boolean).join(' → ')
                                                        || r.route_description || ''
                                                        : r.landing_a_name && r.landing_z_name
                                                            ? `${r.landing_a_name} → ${r.landing_z_name}`
                                                            : r.route_description || ''
                                                    const avail = r.total_capacity
                                                        ? `${r.total_capacity - (r.used_capacity ?? 0)}G avail / ${r.total_capacity}G`
                                                        : ''
                                                    const sublabel = [route, avail].filter(Boolean).join(' | ')
                                                    return {
                                                        value: r.id,
                                                        label: `${r.resource_id} | ${r.cable_system_name || r.type} ${r.spec || ''}`,
                                                        sublabel: sublabel || undefined,
                                                    }
                                                })
                                            }
                                            value={item.inventory_resource_id}
                                            onChange={(v) => {
                                                const res = resources.find(r => r.id === v)
                                                setItems(prev => prev.map((it, i) => i === idx ? {
                                                    ...it,
                                                    inventory_resource_id: v,
                                                    spec: res?.spec || it.spec,
                                                    selectedCircuitIds: [],
                                                    capacity: '',
                                                } : it))
                                                if (v) loadCircuitsForResource(v)
                                            }}
                                            placeholder="Select resource..."
                                        />
                                    </div>
                                ) : (
                                    <div className={!FIELD_CFG[item.type]?.disposal ? 'col-span-2' : ''}>
                                        <label className="block text-xs text-text-dim mb-1">Description {FIELD_CFG[item.type]?.description === 'required' && <span className="text-destructive">*</span>}</label>
                                        <input type="text" value={item.description} onChange={(e) => updateItem(idx, 'description', e.target.value)}
                                            placeholder="e.g. 楼内线 中环17楼"
                                            className="w-full px-3 py-2 bg-background border border-border-subtle rounded-lg text-sm text-text placeholder:text-text-dim focus:ring-1 focus:ring-primary focus:outline-none"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Circuit Picker — Capacity only */}
                            {FIELD_CFG[item.type]?.circuits && item.inventory_resource_id && (() => {
                                const circuits = circuitsByResource[item.inventory_resource_id] ?? []
                                if (circuits.length === 0) return null
                                // Show handover info if any circuit has a non-null handover that differs
                                const hasHandoverVariance = circuits.some((c) => c.handover_a || c.handover_z)
                                return (
                                    <div className="p-3 bg-background rounded-lg border border-border-subtle">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-medium text-text-muted">Select Circuits</span>
                                            <span className="text-xs text-text-dim">
                                                {item.selectedCircuitIds.length} selected · {item.capacity || 0}G total
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                            {circuits.map((c) => {
                                                const isSelected = item.selectedCircuitIds.includes(c.id)
                                                const isOwnExisting = item.existingCircuitIds.includes(c.id)
                                                const isAvailable = c.status === 'Available' || c.status === 'Planned' || isOwnExisting
                                                const handoverLabel = hasHandoverVariance && (c.handover_a || c.handover_z)
                                                    ? `${c.handover_a ?? '—'} → ${c.handover_z ?? '—'}`
                                                    : null
                                                return (
                                                    <button
                                                        key={c.id}
                                                        type="button"
                                                        disabled={!isAvailable && !isSelected}
                                                        onClick={() => toggleCircuit(idx, c.id)}
                                                        className={`flex flex-col gap-1 px-3 py-2 rounded-lg text-xs border transition-colors cursor-pointer ${isSelected
                                                            ? 'bg-primary/10 border-primary text-primary'
                                                            : isAvailable
                                                                ? 'bg-surface border-border-subtle text-text hover:border-primary/30'
                                                                : 'bg-surface/50 border-border-subtle/50 text-text-dim opacity-50 cursor-not-allowed'
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <span className={`w-4 h-4 rounded flex items-center justify-center border flex-shrink-0 ${isSelected ? 'bg-primary border-primary' : 'border-border'
                                                                }`}>
                                                                {isSelected && <Check className="h-3 w-3 text-white" />}
                                                            </span>
                                                            <span className="font-mono">#{c.circuit_number}</span>
                                                            <span>{c.capacity}G</span>
                                                            <span className="text-text-dim">{c.interface_type}</span>
                                                            {!isAvailable && !isSelected && (
                                                                <span className="text-warning text-[10px]">In use</span>
                                                            )}
                                                        </div>
                                                        {handoverLabel && (
                                                            <span className="text-[10px] text-text-dim pl-6 truncate" title={handoverLabel}>
                                                                📍 {handoverLabel}
                                                            </span>
                                                        )}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )
                            })()}

                            {/* Row 2: Capacity/Spec + Dates — conditional by type */}
                            <div className="grid grid-cols-4 gap-4">
                                {FIELD_CFG[item.type]?.capacity && (<>
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
                                </>)}
                                <div>
                                    <label className="block text-xs text-text-dim mb-1">Start Date</label>
                                    <input type="date" value={item.start_date} onChange={(e) => updateItem(idx, 'start_date', e.target.value)}
                                        className="w-full px-3 py-2 bg-background border border-border-subtle rounded-lg text-sm text-text focus:ring-1 focus:ring-primary focus:outline-none"
                                    />
                                </div>
                                {FIELD_CFG[item.type]?.term && (
                                    <div>
                                        <label className="block text-xs text-text-dim mb-1">Term (months)</label>
                                        <input type="number" value={item.term_months} onChange={(e) => updateItem(idx, 'term_months', e.target.value)}
                                            className="w-full px-3 py-2 bg-background border border-border-subtle rounded-lg text-sm text-text focus:ring-1 focus:ring-primary focus:outline-none"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Row 3: Financials — conditional by type */}
                            <div className="grid grid-cols-4 gap-4">
                                {FIELD_CFG[item.type]?.disposal && isIRUStyle(item.disposal_type) ? (
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
                                        {FIELD_CFG[item.type]?.mrc && (
                                            <div>
                                                <label className="block text-xs text-text-dim mb-1">Sell MRC ($)</label>
                                                <input type="number" value={item.sell_mrc} onChange={(e) => updateItem(idx, 'sell_mrc', e.target.value)}
                                                    className="w-full px-3 py-2 bg-background border border-border-subtle rounded-lg text-sm text-text focus:ring-1 focus:ring-primary focus:outline-none"
                                                />
                                            </div>
                                        )}
                                        {FIELD_CFG[item.type]?.nrc && (
                                            <div>
                                                <label className="block text-xs text-text-dim mb-1">NRC ($)</label>
                                                <input type="number" value={item.sell_nrc} onChange={(e) => updateItem(idx, 'sell_nrc', e.target.value)}
                                                    className="w-full px-3 py-2 bg-background border border-border-subtle rounded-lg text-sm text-text focus:ring-1 focus:ring-primary focus:outline-none"
                                                />
                                            </div>
                                        )}
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
