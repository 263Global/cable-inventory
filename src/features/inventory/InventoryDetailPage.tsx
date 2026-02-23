import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
    ArrowLeft, Pencil, MapPin, DollarSign, BarChart3, Loader2,
    Shield, ShieldOff, Calendar, Plus, Trash2, RefreshCw, Layers, Check,
    Lock, Unlock, ExternalLink, FileText,
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { fetchInventoryById } from './api'
import {
    fetchCircuits, createCircuit, updateCircuit, deleteCircuit,
    fetchInterfaceTypes, fetchBatches, createBatch, deleteBatch,
    fetchHandoverLocations,
} from '@/lib/reference-api'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import type { InventoryResource, InventoryCircuit } from '@/types'
import { formatCurrency } from '@/lib/utils'

const statusColors: Record<string, string> = {
    'Available': 'bg-status-available/15 text-status-available',
    'Partially Used': 'bg-status-partial/15 text-status-partial',
    'Fully Used': 'bg-status-full/15 text-status-full',
    'Expired': 'bg-status-expired/15 text-status-expired',
    'Terminated': 'bg-status-expired/15 text-status-expired',
}

const typeColors: Record<string, string> = {
    'Capacity': 'bg-primary/15 text-primary',
    'Terrestrial': 'bg-info/15 text-info',
    'Fiber': 'bg-warning/15 text-warning',
    'Spectrum': 'bg-purple-500/15 text-purple-400',
}

const circuitStatusColors: Record<string, string> = {
    'Available': 'text-status-available',
    'Allocated': 'text-status-partial',
    'Reserved': 'text-info',
    'Planned': 'text-info',
}

const salesStatusColors: Record<string, string> = {
    Draft: 'bg-gray-500/15 text-gray-400',
    'Pre-sold': 'bg-amber-500/15 text-amber-400',
    Active: 'bg-emerald-500/15 text-emerald-400',
    Expired: 'bg-red-500/15 text-red-400',
    Terminated: 'bg-red-500/15 text-red-400',
    Cancelled: 'bg-gray-500/15 text-gray-400',
}

const batchStatusColors: Record<string, string> = {
    'Planned': 'bg-info/15 text-info',
    'Active': 'bg-status-available/15 text-status-available',
    'Ended': 'bg-status-expired/15 text-status-expired',
}

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
    return (
        <div>
            <p className="text-xs text-text-dim">{label}</p>
            <p className="text-sm font-medium mt-0.5">{value ?? '—'}</p>
        </div>
    )
}

interface BatchRecord {
    id: string
    batch_number: number
    capacity: number
    model: string
    start_date: string | null
    term_months: number | null
    otc: number | null
    om_rate: number | null
    annual_om_cost: number | null
    mrc: number | null
    status: string
}

interface LinkedSalesItem {
    id: string
    sales_order_id: string
    order_id: string
    customer_name: string | null
    capacity: number | null
    disposal_type: string | null
    status: string
    order_status: string
}

// Auto-calc term from base contract dates
function calcBatchTerm(baseStart: string | null, baseTermMonths: number | null, batchStart: string): number {
    if (!baseStart || !baseTermMonths || !batchStart) return 0
    const baseEnd = new Date(baseStart)
    baseEnd.setMonth(baseEnd.getMonth() + baseTermMonths)
    baseEnd.setDate(baseEnd.getDate() - 1)
    const bs = new Date(batchStart)
    if (isNaN(bs.getTime()) || baseEnd < bs) return 0
    return (baseEnd.getFullYear() - bs.getFullYear()) * 12 + (baseEnd.getMonth() - bs.getMonth()) + 1
}

// Auto-suggest status from dates
function suggestStatus(batchStart: string, baseEndDate: string | null): 'Planned' | 'Active' | 'Ended' {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    if (baseEndDate) {
        const be = new Date(baseEndDate)
        if (be < today) return 'Ended'
    }
    const bs = new Date(batchStart)
    if (isNaN(bs.getTime())) return 'Planned'
    return bs > today ? 'Planned' : 'Active'
}

export function InventoryDetailPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const [resource, setResource] = useState<InventoryResource | null>(null)
    const [loading, setLoading] = useState(true)
    const [circuits, setCircuits] = useState<InventoryCircuit[]>([])
    const [batches, setBatches] = useState<BatchRecord[]>([])
    const [interfaceTypes, setInterfaceTypes] = useState<{ id: string; name: string }[]>([])
    const [handoverLocations, setHandoverLocations] = useState<{ id: string; name: string; country: string; city: string; type: string }[]>([])
    const [showAddCircuit, setShowAddCircuit] = useState(false)
    const [newCircuit, setNewCircuit] = useState({ capacity: '', interface_type_id: '', handover_a_id: '', handover_z_id: '', batch_id: '' })
    const [savingCircuit, setSavingCircuit] = useState(false)
    const [linkedSales, setLinkedSales] = useState<LinkedSalesItem[]>([])

    // Batch UI state
    const [editingBatchId, setEditingBatchId] = useState<string | null>(null)
    const [showAddBatch, setShowAddBatch] = useState(false)
    const [pendingDelete, setPendingDelete] = useState<{ type: 'batch' | 'circuit'; id: string; label: string } | null>(null)
    const [deletingItem, setDeletingItem] = useState(false)
    const [newBatch, setNewBatch] = useState({ capacity: '', model: 'IRU', start_date: '', otc: '', om_rate: '4.0', mrc: '', annual_om_cost: '' })
    const [newBatchOmUnlocked, setNewBatchOmUnlocked] = useState(false)
    const [omUnlockedBatches, setOmUnlockedBatches] = useState<Set<string>>(new Set())

    const loadCircuits = useCallback(async () => {
        if (!id) return
        try { setCircuits(await fetchCircuits(id) as InventoryCircuit[]) } catch (err) { console.error(err) }
    }, [id])

    const loadBatches = useCallback(async () => {
        if (!id) return
        try { setBatches(await fetchBatches(id) as BatchRecord[]) } catch (err) { console.error(err) }
    }, [id])

    useEffect(() => {
        if (!id) return
        fetchInventoryById(id).then(setResource).catch(console.error).finally(() => setLoading(false))
        loadCircuits()
        loadBatches()
        fetchInterfaceTypes().then(setInterfaceTypes).catch(console.error)
        fetchHandoverLocations().then(setHandoverLocations).catch(console.error)

        // Fetch linked sales items
        supabase
            .from('sales_order_items')
            .select('id, sales_order_id, capacity, disposal_type, status, sales_orders(order_id, status, customers(name))')
            .eq('inventory_resource_id', id)
            .then(({ data }: { data: Record<string, unknown>[] | null }) => {
                setLinkedSales((data ?? []).map((row: Record<string, unknown>) => {
                    const so = row.sales_orders as { order_id: string; status: string; customers: { name: string } | null } | null
                    return {
                        id: row.id as string,
                        sales_order_id: row.sales_order_id as string,
                        order_id: so?.order_id ?? '',
                        customer_name: so?.customers?.name ?? null,
                        capacity: row.capacity as number | null,
                        disposal_type: row.disposal_type as string | null,
                        status: row.status as string,
                        order_status: so?.status ?? '',
                    }
                }))
            })
    }, [id, loadCircuits, loadBatches])

    // ── Auto-transition: Planned → Active when start_date ≤ today ──
    const autoTransitionDone = useRef(false)
    useEffect(() => {
        if (!batches.length || autoTransitionDone.current) return
        const today = new Date(); today.setHours(0, 0, 0, 0)
        const toUpdate = batches.filter((b) =>
            b.status === 'Planned' && b.start_date && new Date(b.start_date) <= today
        )
        if (toUpdate.length === 0) return
        autoTransitionDone.current = true
            ; (async () => {
                const { updateBatch } = await import('@/lib/reference-api')
                await Promise.all(toUpdate.map((b) => updateBatch(b.id, { status: 'Active' })))
                loadBatches()
                toast.info(`${toUpdate.length} batch${toUpdate.length > 1 ? 'es' : ''} auto-transitioned to Active`)
            })()
    }, [batches, loadBatches])

    // ─── Circuit handlers ───
    const handleAddCircuit = async () => {
        if (!id || !newCircuit.capacity || !newCircuit.interface_type_id) return
        const cap = Number(newCircuit.capacity)
        // Validate against batch capacity if batch is selected
        if (newCircuit.batch_id) {
            const batch = batches.find(b => b.id === newCircuit.batch_id)
            if (batch) {
                const batchCircuits = circuits.filter(c => c.batch_id === newCircuit.batch_id)
                const usedCapacity = batchCircuits.reduce((sum, c) => sum + c.capacity, 0)
                if (usedCapacity + cap > batch.capacity) {
                    toast.error(`Exceeds batch capacity: ${usedCapacity}G used + ${cap}G = ${usedCapacity + cap}G > ${batch.capacity}G`)
                    return
                }
            }
        }
        // Validate against total resource capacity
        const totalCircuits = circuits.reduce((sum, c) => sum + c.capacity, 0)
        if (resource?.total_capacity && totalCircuits + cap > resource.total_capacity) {
            toast.error(`Exceeds total capacity: ${totalCircuits}G used + ${cap}G = ${totalCircuits + cap}G > ${resource.total_capacity}G`)
            return
        }
        setSavingCircuit(true)
        try {
            const nextNum = circuits.length > 0 ? Math.max(...circuits.map((c) => c.circuit_number)) + 1 : 1
            await createCircuit({
                inventory_resource_id: id,
                circuit_number: nextNum,
                capacity: Number(newCircuit.capacity),
                original_interface_type_id: newCircuit.interface_type_id,
                current_interface_type_id: newCircuit.interface_type_id,
                ...(newCircuit.batch_id ? { batch_id: newCircuit.batch_id } : {}),
                ...(newCircuit.batch_id ? {
                    status: batches.find(b => b.id === newCircuit.batch_id)?.status === 'Active' ? 'Available' : 'Planned'
                } : {}),
            })
            if (newCircuit.handover_a_id || newCircuit.handover_z_id) {
                const created = (await fetchCircuits(id)) as InventoryCircuit[]
                const newest = created[created.length - 1]
                if (newest) {
                    await updateCircuit(newest.id, {
                        handover_location_a_id: newCircuit.handover_a_id || null,
                        handover_location_z_id: newCircuit.handover_z_id || null,
                    })
                }
            }
            setNewCircuit({ capacity: '', interface_type_id: '', handover_a_id: '', handover_z_id: '', batch_id: '' })
            setShowAddCircuit(false)
            loadCircuits()
            toast.success('Circuit added')
        } catch (err) { console.error(err); toast.error('Failed to add circuit') }
        finally { setSavingCircuit(false) }
    }

    const handleChangeInterfaceType = async (circuitId: string, newTypeId: string) => {
        await updateCircuit(circuitId, { current_interface_type_id: newTypeId })
        loadCircuits()
        toast.success('Interface type updated')
    }

    const handleDeleteCircuit = async (circuitId: string) => {
        setPendingDelete({ type: 'circuit', id: circuitId, label: 'circuit' })
    }

    // ─── Batch handlers ───
    const handleSaveNewBatch = async () => {
        if (!id || !newBatch.capacity || !resource) return
        const nextNum = batches.length > 0 ? Math.max(...batches.map((b) => b.batch_number)) + 1 : 1
        const termMonths = newBatch.start_date ? calcBatchTerm(resource.start_date, resource.term_months, newBatch.start_date) : undefined
        const status = newBatch.start_date ? suggestStatus(newBatch.start_date, resource.end_date) : 'Planned'
        const otcVal = parseFloat(newBatch.otc) || 0
        const rateVal = parseFloat(newBatch.om_rate) || 4.0
        const calcOm = otcVal * rateVal / 100
        await createBatch({
            inventory_resource_id: id,
            batch_number: nextNum,
            capacity: parseFloat(newBatch.capacity) || 0,
            model: newBatch.model as 'IRU' | 'Lease',
            start_date: newBatch.start_date || undefined,
            term_months: termMonths && termMonths > 0 ? termMonths : undefined,
            otc: newBatch.model === 'IRU' ? otcVal : undefined,
            om_rate: newBatch.model === 'IRU' ? rateVal : undefined,
            annual_om_cost: newBatch.model === 'IRU' ? (newBatchOmUnlocked && newBatch.annual_om_cost ? parseFloat(newBatch.annual_om_cost) : calcOm) : undefined,
            mrc: newBatch.model === 'Lease' ? (parseFloat(newBatch.mrc) || 0) : undefined,
            status,
        })
        setNewBatch({ capacity: '', model: 'IRU', start_date: '', otc: '', om_rate: '4.0', mrc: '', annual_om_cost: '' })
        setNewBatchOmUnlocked(false)
        setShowAddBatch(false)
        loadBatches()
        toast.success('Batch saved')
    }

    const handleDeleteBatch = async (batchId: string) => {
        const batch = batches.find((b) => b.id === batchId)
        setPendingDelete({ type: 'batch', id: batchId, label: `Batch #${batch?.batch_number ?? ''}` })
    }

    const confirmPendingDelete = async () => {
        if (!pendingDelete) return
        setDeletingItem(true)
        try {
            if (pendingDelete.type === 'circuit') {
                await deleteCircuit(pendingDelete.id)
                loadCircuits()
                toast.success('Circuit deleted')
            } else {
                await deleteBatch(pendingDelete.id)
                if (editingBatchId === pendingDelete.id) setEditingBatchId(null)
                loadBatches()
                toast.success('Batch deleted')
            }
        } catch (err) {
            console.error(err)
            toast.error(`Failed to delete ${pendingDelete.type}`)
        } finally {
            setDeletingItem(false)
            setPendingDelete(null)
        }
    }

    const handleUpdateBatchField = async (batchId: string, field: string, value: string | number) => {
        const { updateBatch } = await import('@/lib/reference-api')
        try {
            const updates: Record<string, unknown> = { [field]: value === '' ? null : value }
            // Auto-calc O&M only if that batch's O&M is locked
            if ((field === 'otc' || field === 'om_rate') && !omUnlockedBatches.has(batchId)) {
                const batch = batches.find((b) => b.id === batchId)
                if (batch) {
                    const otc = field === 'otc' ? Number(value) || 0 : Number(batch.otc) || 0
                    const rate = field === 'om_rate' ? Number(value) || 0 : Number(batch.om_rate) || 0
                    updates.annual_om_cost = otc * rate / 100
                }
            }
            // Auto-calc term + status when start_date changes
            if (field === 'start_date' && value && resource) {
                const term = calcBatchTerm(resource.start_date, resource.term_months, String(value))
                if (term > 0) updates.term_months = term
                updates.status = suggestStatus(String(value), resource.end_date)
            }
            await updateBatch(batchId, updates)
            loadBatches()
        } catch (err) { console.error(err); toast.error('Failed to update batch') }
    }

    if (loading) {
        return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 text-primary animate-spin" /></div>
    }

    if (!resource) {
        return (
            <div className="text-center py-20">
                <p className="text-text-muted text-lg">Resource not found</p>
                <button onClick={() => navigate('/inventory')} className="mt-4 text-primary hover:underline cursor-pointer">← Back to Inventory</button>
            </div>
        )
    }

    const isBatchMode = resource.cost_mode === 'Base+Batch'
    const isIRU = resource.acquisition_type === 'IRU'
    const isLease = resource.acquisition_type === 'Lease'
    const totalCap = Number(resource.total_capacity ?? 0)
    const usedCap = Number(resource.used_capacity ?? 0)

    // Four-segment capacity calculation
    const activeLit = batches.filter((b) => b.status === 'Active').reduce((s, b) => s + Number(b.capacity ?? 0), 0)
    const plannedLit = batches.filter((b) => b.status === 'Planned').reduce((s, b) => s + Number(b.capacity ?? 0), 0)
    const batchTotalCap = activeLit + plannedLit
    const batchPct = totalCap > 0 ? Math.min((batchTotalCap / totalCap) * 100, 100) : 0

    // Within active lit: how much is used by circuits vs available
    const capUsedByCircuits = usedCap  // circuits allocated capacity
    const capAvailable = Math.max(0, activeLit - capUsedByCircuits)
    const capUnlit = Math.max(0, totalCap - activeLit - plannedLit)

    // Percentage for the four segments
    const pctUsed = totalCap > 0 ? (capUsedByCircuits / totalCap) * 100 : 0
    const pctAvailable = totalCap > 0 ? (capAvailable / totalCap) * 100 : 0
    const pctPlanned = totalCap > 0 ? (plannedLit / totalCap) * 100 : 0
    // pctUnlit is the remainder

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/inventory')} className="p-2 rounded-lg hover:bg-surface-hover text-text-muted hover:text-text transition-colors cursor-pointer">
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold">{resource.resource_id}</h1>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${typeColors[resource.type]}`}>{resource.type}</span>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[resource.status]}`}>{resource.status}</span>
                            {isBatchMode && <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-info/15 text-info">Base+Batch</span>}
                        </div>
                        {resource.internal_ref && <p className="text-sm text-text-dim mt-1">{resource.internal_ref}</p>}
                    </div>
                </div>
                <button onClick={() => navigate(`/inventory/${id}/edit`)} className="flex items-center gap-2 px-4 py-2 border border-primary text-primary hover:bg-primary/10 rounded-lg text-sm font-medium transition-colors cursor-pointer">
                    <Pencil className="h-4 w-4" /> Edit
                </button>
            </div>

            <div className="space-y-6">
                {/* Card 1: Resource Summary */}
                <div className="bg-surface rounded-xl border border-border-subtle p-6">
                    <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">Resource Summary</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <InfoRow label="Cable System" value={resource.cable_system_name} />
                        <InfoRow label="Spec" value={resource.spec} />
                        <InfoRow label="Supplier" value={resource.supplier_name} />
                        <InfoRow label="Acquisition" value={resource.acquisition_type} />
                        <div className="flex items-center gap-2">
                            {resource.protection === 'Protected' ? <Shield className="h-4 w-4 text-primary" /> : <ShieldOff className="h-4 w-4 text-text-dim" />}
                            <span className="text-sm">{resource.protection}</span>
                        </div>
                        <InfoRow label="Contract Ref" value={resource.contract_ref} />
                        <InfoRow label="Cost Mode" value={resource.cost_mode} />
                        <InfoRow label={isBatchMode ? 'Base Capacity' : 'Capacity'} value={totalCap > 0 ? `${totalCap}G` : null} />
                    </div>
                </div>

                {/* Card 2: Locations */}
                <div className="bg-surface rounded-xl border border-border-subtle p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <MapPin className="h-4 w-4 text-primary" />
                        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Locations</h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex-1 p-4 bg-background rounded-lg">
                            <p className="text-xs text-text-dim">A-End</p>
                            <p className="text-lg font-semibold mt-1">{resource.country_a || '—'}</p>
                            {resource.landing_station_a_name && <p className="text-xs text-text-muted mt-1">🚢 {resource.landing_station_a_name}</p>}
                            {resource.handover_a_name && <p className="text-xs text-text-muted mt-0.5">🏢 {resource.handover_a_name}</p>}
                        </div>
                        <div className="text-2xl text-text-dim">→</div>
                        <div className="flex-1 p-4 bg-background rounded-lg">
                            <p className="text-xs text-text-dim">Z-End</p>
                            <p className="text-lg font-semibold mt-1">{resource.country_z || '—'}</p>
                            {resource.landing_station_z_name && <p className="text-xs text-text-muted mt-1">🚢 {resource.landing_station_z_name}</p>}
                            {resource.handover_z_name && <p className="text-xs text-text-muted mt-0.5">🏢 {resource.handover_z_name}</p>}
                        </div>
                    </div>
                </div>

                {/* Card 3: Batches (Base+Batch mode only) */}
                {isBatchMode && (
                    <div className="bg-surface rounded-xl border border-border-subtle p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Layers className="h-4 w-4 text-primary" />
                                <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Batches</h2>
                                <span className="text-xs text-text-dim ml-2">{batchTotalCap}G lit of {totalCap}G base ({Math.round(batchPct)}%)</span>
                            </div>
                            <button onClick={() => setShowAddBatch(!showAddBatch)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-medium transition-colors cursor-pointer">
                                <Plus className="h-3.5 w-3.5" /> Add Batch
                            </button>
                        </div>
                        {/* Batch capacity bar */}
                        <div className="w-full h-2 bg-surface-hover rounded-full overflow-hidden mb-4">
                            <div className={`h-full rounded-full transition-all ${batchPct > 100 ? 'bg-destructive' : 'bg-primary'}`}
                                style={{ width: `${Math.min(batchPct, 100)}%` }} />
                        </div>

                        {/* ─── Add Batch Form ─── */}
                        {showAddBatch && (
                            <div className="mb-4 p-4 bg-background rounded-lg border border-primary/30 space-y-3">
                                <h4 className="text-xs font-semibold text-primary uppercase tracking-wider">New Batch</h4>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-xs text-text-dim mb-1">Capacity (G) *</label>
                                        <input type="number" value={newBatch.capacity} onChange={(e) => setNewBatch((p) => ({ ...p, capacity: e.target.value }))} placeholder="100"
                                            className="w-full px-2.5 py-2 bg-surface border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-text-dim mb-1">Model</label>
                                        <select value={newBatch.model} onChange={(e) => setNewBatch((p) => ({ ...p, model: e.target.value }))}
                                            className="w-full px-2.5 py-2 bg-surface border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer">
                                            <option value="IRU">IRU</option>
                                            <option value="Lease">Lease</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-text-dim mb-1">Start Date</label>
                                        <input type="date" value={newBatch.start_date} onChange={(e) => setNewBatch((p) => ({ ...p, start_date: e.target.value }))}
                                            className="w-full px-2.5 py-2 bg-surface border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    {newBatch.model === 'IRU' ? (
                                        <>
                                            <div>
                                                <label className="block text-xs text-text-dim mb-1">OTC ($)</label>
                                                <input type="number" value={newBatch.otc} onChange={(e) => setNewBatch((p) => ({ ...p, otc: e.target.value }))} placeholder="0"
                                                    className="w-full px-2.5 py-2 bg-surface border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-text-dim mb-1">O&M Rate (%)</label>
                                                <input type="number" value={newBatch.om_rate} onChange={(e) => setNewBatch((p) => ({ ...p, om_rate: e.target.value }))} placeholder="4.0"
                                                    className="w-full px-2.5 py-2 bg-surface border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                                            </div>
                                            {/* O&M Lock/Unlock */}
                                            <div>
                                                <div className="flex items-center justify-between mb-1">
                                                    <label className="text-xs text-text-dim">Annual O&M ($)</label>
                                                    <button onClick={() => setNewBatchOmUnlocked(!newBatchOmUnlocked)} type="button"
                                                        className="p-0.5 rounded hover:bg-surface-hover text-text-dim hover:text-text transition-colors cursor-pointer" title={newBatchOmUnlocked ? 'Lock to auto-calculate' : 'Unlock to manually override'}>
                                                        {newBatchOmUnlocked ? <Unlock className="h-3.5 w-3.5 text-warning" /> : <Lock className="h-3.5 w-3.5" />}
                                                    </button>
                                                </div>
                                                {newBatchOmUnlocked ? (
                                                    <>
                                                        <input type="number" value={newBatch.annual_om_cost} onChange={(e) => setNewBatch((p) => ({ ...p, annual_om_cost: e.target.value }))}
                                                            placeholder={String(Math.round((parseFloat(newBatch.otc) || 0) * (parseFloat(newBatch.om_rate) || 0) / 100))}
                                                            className="w-full px-2.5 py-2 bg-surface border border-warning/50 rounded-lg text-text text-sm focus:outline-none focus:ring-1 focus:ring-warning" />
                                                        <p className="text-xs text-text-dim mt-1">Calculated: {formatCurrency((parseFloat(newBatch.otc) || 0) * (parseFloat(newBatch.om_rate) || 0) / 100)}</p>
                                                    </>
                                                ) : (
                                                    <p className="px-2.5 py-2 bg-surface/50 border border-border rounded-lg text-text text-sm opacity-70">
                                                        {formatCurrency((parseFloat(newBatch.otc) || 0) * (parseFloat(newBatch.om_rate) || 0) / 100)}
                                                    </p>
                                                )}
                                            </div>
                                        </>
                                    ) : (
                                        <div>
                                            <label className="block text-xs text-text-dim mb-1">MRC ($)</label>
                                            <input type="number" value={newBatch.mrc} onChange={(e) => setNewBatch((p) => ({ ...p, mrc: e.target.value }))} placeholder="0"
                                                className="w-full px-2.5 py-2 bg-surface border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                                        </div>
                                    )}
                                </div>
                                {newBatch.start_date && resource.start_date && resource.term_months && (
                                    <p className="text-xs text-text-dim">
                                        Term: <span className="text-text font-medium">{calcBatchTerm(resource.start_date, resource.term_months, newBatch.start_date)} months</span> (auto-calculated to Base end date)
                                    </p>
                                )}
                                <div className="flex justify-end gap-2">
                                    <button onClick={() => { setShowAddBatch(false); setNewBatch({ capacity: '', model: 'IRU', start_date: '', otc: '', om_rate: '4.0', mrc: '', annual_om_cost: '' }); setNewBatchOmUnlocked(false) }}
                                        className="px-3 py-1.5 text-sm text-text-muted hover:text-text hover:bg-surface-hover rounded-lg transition-colors cursor-pointer">Cancel</button>
                                    <button onClick={handleSaveNewBatch} disabled={!newBatch.capacity}
                                        className="px-4 py-1.5 bg-primary hover:bg-primary-hover disabled:opacity-50 text-primary-foreground rounded-lg text-sm font-medium transition-colors cursor-pointer">Save Batch</button>
                                </div>
                            </div>
                        )}

                        {/* ─── Batch List ─── */}
                        {batches.length === 0 && !showAddBatch ? (
                            <p className="text-sm text-text-dim text-center py-4">No batches defined yet.</p>
                        ) : (
                            <div className="space-y-2">
                                {batches.map((b) => {
                                    const isEditing = editingBatchId === b.id
                                    const isOmUnlocked = omUnlockedBatches.has(b.id)
                                    const calcOm = (Number(b.otc) || 0) * (Number(b.om_rate) || 0) / 100
                                    return (
                                        <div key={b.id} className={`p-3 bg-background rounded-lg border ${isEditing ? 'border-primary/30' : 'border-border-subtle'} transition-colors`}>
                                            {isEditing ? (
                                                /* ─── EDIT MODE ─── */
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-bold text-text-muted bg-surface px-2 py-1 rounded-full">B{b.batch_number}</span>
                                                            <select value={b.model}
                                                                onChange={(e) => handleUpdateBatchField(b.id, 'model', e.target.value)}
                                                                className="px-2 py-1 bg-surface border border-border rounded text-xs cursor-pointer">
                                                                <option value="IRU">IRU</option>
                                                                <option value="Lease">Lease</option>
                                                            </select>
                                                            <select value={b.status}
                                                                onChange={(e) => handleUpdateBatchField(b.id, 'status', e.target.value)}
                                                                className={`px-2 py-1 rounded text-xs font-medium border-0 cursor-pointer ${batchStatusColors[b.status]}`}>
                                                                <option value="Planned">Planned</option>
                                                                <option value="Active">Active</option>
                                                                <option value="Ended">Ended</option>
                                                            </select>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <button onClick={() => { setEditingBatchId(null); setOmUnlockedBatches((s) => { const n = new Set(s); n.delete(b.id); return n }) }}
                                                                className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors cursor-pointer">
                                                                <Check className="h-3 w-3" /> Done
                                                            </button>
                                                            <button onClick={() => handleDeleteBatch(b.id)}
                                                                className="p-1.5 rounded-md hover:bg-destructive/10 text-text-dim hover:text-destructive transition-colors cursor-pointer">
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-3">
                                                        <BatchField label="Capacity (G)" type="number" value={b.capacity ?? ''} onSave={(v) => handleUpdateBatchField(b.id, 'capacity', Number(v))} />
                                                        <BatchField label="Start Date" type="date" value={b.start_date ?? ''} onSave={(v) => handleUpdateBatchField(b.id, 'start_date', v)} />
                                                        <div>
                                                            <label className="block text-xs text-text-dim mb-1">Term (auto)</label>
                                                            <p className="px-2.5 py-1.5 bg-surface/50 border border-border rounded-lg text-text text-sm opacity-60">
                                                                {b.term_months ? `${b.term_months} months` : '—'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {b.model === 'IRU' ? (
                                                        <div className="grid grid-cols-3 gap-3">
                                                            <BatchField label="OTC ($)" type="number" value={b.otc ?? ''} onSave={(v) => handleUpdateBatchField(b.id, 'otc', Number(v))} />
                                                            <BatchField label="O&M Rate (%)" type="number" value={b.om_rate ?? ''} onSave={(v) => handleUpdateBatchField(b.id, 'om_rate', Number(v))} />
                                                            {/* O&M Lock/Unlock */}
                                                            <div>
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <label className="text-xs text-text-dim">Annual O&M ($)</label>
                                                                    <button onClick={() => setOmUnlockedBatches((s) => { const n = new Set(s); if (n.has(b.id)) n.delete(b.id); else n.add(b.id); return n })}
                                                                        type="button"
                                                                        className="p-0.5 rounded hover:bg-surface-hover text-text-dim hover:text-text transition-colors cursor-pointer"
                                                                        title={isOmUnlocked ? 'Lock to auto-calculate' : 'Unlock to manually override'}>
                                                                        {isOmUnlocked ? <Unlock className="h-3.5 w-3.5 text-warning" /> : <Lock className="h-3.5 w-3.5" />}
                                                                    </button>
                                                                </div>
                                                                {isOmUnlocked ? (
                                                                    <>
                                                                        <BatchField label="" type="number" value={b.annual_om_cost ?? ''} onSave={(v) => handleUpdateBatchField(b.id, 'annual_om_cost', Number(v))} />
                                                                        <p className="text-xs text-text-dim mt-1">Calculated: {formatCurrency(calcOm)}</p>
                                                                    </>
                                                                ) : (
                                                                    <p className="px-2.5 py-1.5 bg-surface/50 border border-border rounded-lg text-text text-sm opacity-70">
                                                                        {b.annual_om_cost ? formatCurrency(Number(b.annual_om_cost)) : '—'}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="grid grid-cols-3 gap-3">
                                                            <BatchField label="MRC ($)" type="number" value={b.mrc ?? ''} onSave={(v) => handleUpdateBatchField(b.id, 'mrc', Number(v))} />
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                /* ─── READ-ONLY MODE ─── */
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-surface text-xs font-bold text-text-muted shrink-0">
                                                        B{b.batch_number}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-medium">{b.capacity}G</span>
                                                            <span className="text-xs text-text-dim">{b.model}</span>
                                                            <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${batchStatusColors[b.status]}`}>{b.status}</span>
                                                        </div>
                                                        <div className="text-xs text-text-dim mt-0.5">
                                                            {b.start_date || '—'} · {b.term_months ? `${b.term_months}mo` : '—'}
                                                            {b.model === 'IRU' && b.otc ? ` · OTC ${formatCurrency(Number(b.otc))}` : ''}
                                                            {b.model === 'IRU' && b.annual_om_cost ? ` · O&M ${formatCurrency(Number(b.annual_om_cost))}/yr` : ''}
                                                            {b.model === 'Lease' && b.mrc ? ` · MRC ${formatCurrency(Number(b.mrc))}` : ''}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <button onClick={() => setEditingBatchId(b.id)}
                                                            className="p-1.5 rounded-md hover:bg-surface-hover text-text-dim hover:text-text transition-colors cursor-pointer" title="Edit">
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </button>
                                                        <button onClick={() => handleDeleteBatch(b.id)}
                                                            className="p-1.5 rounded-md hover:bg-destructive/10 text-text-dim hover:text-destructive transition-colors cursor-pointer" title="Delete">
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Card 4: Capacity Usage + Circuits */}
                {totalCap > 0 && (
                    <div className="bg-surface rounded-xl border border-border-subtle p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <BarChart3 className="h-4 w-4 text-primary" />
                            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Capacity & Circuits</h2>
                        </div>

                        {isBatchMode ? (
                            /* ─── Four-segment capacity bar for Base+Batch ─── */
                            <div className="mb-4">
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="font-medium">Capacity Breakdown</span>
                                    <span className="text-text-muted">{totalCap}G base</span>
                                </div>
                                <div className="w-full h-3 bg-surface-hover rounded-full overflow-hidden flex">
                                    {pctUsed > 0 && (
                                        <div className="h-full bg-status-partial transition-all" style={{ width: `${pctUsed}%` }} title={`Allocated: ${capUsedByCircuits}G`} />
                                    )}
                                    {pctAvailable > 0 && (
                                        <div className="h-full bg-status-available transition-all" style={{ width: `${pctAvailable}%` }} title={`Available: ${capAvailable}G`} />
                                    )}
                                    {pctPlanned > 0 && (
                                        <div className="h-full bg-info/40 transition-all" style={{ width: `${pctPlanned}%` }} title={`Planned: ${plannedLit}G`} />
                                    )}
                                    {/* Unlit = remaining background */}
                                </div>
                                <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs mt-3">
                                    <div className="flex items-center gap-1.5">
                                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-status-partial" />
                                        <span className="text-text-muted">Allocated:</span>
                                        <span className="font-medium">{capUsedByCircuits}G</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-status-available" />
                                        <span className="text-text-muted">Available:</span>
                                        <span className="font-medium">{capAvailable}G</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-info/40" />
                                        <span className="text-text-muted">Planned:</span>
                                        <span className="font-medium">{plannedLit}G</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-surface-hover border border-border" />
                                        <span className="text-text-muted">Unlit:</span>
                                        <span className="font-medium">{capUnlit}G</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* ─── Simple two-tone bar for non-batch mode ─── */
                            <div className="mb-3">
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="font-medium">{usedCap}G / {totalCap}G Allocated</span>
                                    <span className="text-text-muted">{totalCap > 0 ? Math.round((usedCap / totalCap) * 100) : 0}%</span>
                                </div>
                                <div className="w-full h-3 bg-surface-hover rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full transition-all ${usedCap >= totalCap ? 'bg-status-full' : usedCap >= totalCap / 2 ? 'bg-status-partial' : 'bg-status-available'}`}
                                        style={{ width: `${totalCap > 0 ? Math.min((usedCap / totalCap) * 100, 100) : 0}%` }} />
                                </div>
                                <div className="flex gap-6 text-sm mt-2">
                                    <div><span className="inline-block w-2 h-2 rounded-full bg-status-available mr-2" /><span className="text-text-muted">Remaining: </span><span className="font-medium">{totalCap - usedCap}G</span></div>
                                    <div><span className="inline-block w-2 h-2 rounded-full bg-status-partial mr-2" /><span className="text-text-muted">Allocated: </span><span className="font-medium">{usedCap}G</span></div>
                                </div>
                            </div>
                        )}

                        {/* Circuits */}
                        <div className={isBatchMode ? '' : 'mt-6 pt-4 border-t border-border-subtle'}>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-semibold">Circuits</h3>
                                <button onClick={() => setShowAddCircuit(!showAddCircuit)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-medium transition-colors cursor-pointer">
                                    <Plus className="h-3.5 w-3.5" /> Add Circuit
                                </button>
                            </div>

                            {showAddCircuit && (
                                <div className="mb-4 p-3 bg-background rounded-lg border border-border-subtle space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs text-text-dim mb-1">Capacity (G)</label>
                                            <input type="number" value={newCircuit.capacity}
                                                onChange={(e) => setNewCircuit((p) => ({ ...p, capacity: e.target.value }))}
                                                placeholder="100"
                                                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-text-dim mb-1">Interface Type</label>
                                            <SearchableSelect
                                                options={interfaceTypes.map((t) => ({ value: t.id, label: t.name }))}
                                                value={newCircuit.interface_type_id}
                                                onChange={(v) => setNewCircuit((p) => ({ ...p, interface_type_id: v }))}
                                                placeholder="Select type..."
                                            />
                                        </div>
                                    </div>
                                    {batches.length > 0 && (
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs text-text-dim mb-1">Batch</label>
                                                <select value={newCircuit.batch_id} onChange={(e) => setNewCircuit((p) => ({ ...p, batch_id: e.target.value }))}
                                                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                                                    <option value="">No batch</option>
                                                    {batches.map((b) => {
                                                        const batchCircuitsCap = circuits.filter(c => c.batch_id === b.id).reduce((sum, c) => sum + c.capacity, 0)
                                                        const remaining = b.capacity - batchCircuitsCap
                                                        const exhausted = remaining <= 0
                                                        return (
                                                            <option key={b.id} value={b.id} disabled={exhausted}>
                                                                B{b.batch_number} — {remaining}G / {b.capacity}G remaining · {b.model}{exhausted ? ' (full)' : ''}
                                                            </option>
                                                        )
                                                    })}
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs text-text-dim mb-1">Handover A (optional)</label>
                                            <SearchableSelect
                                                options={handoverLocations.map((h) => ({ value: h.id, label: h.name, sublabel: `${h.city || ''}, ${h.country}` }))}
                                                value={newCircuit.handover_a_id}
                                                onChange={(v) => setNewCircuit((p) => ({ ...p, handover_a_id: v }))}
                                                placeholder="Default from resource..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-text-dim mb-1">Handover Z (optional)</label>
                                            <SearchableSelect
                                                options={handoverLocations.map((h) => ({ value: h.id, label: h.name, sublabel: `${h.city || ''}, ${h.country}` }))}
                                                value={newCircuit.handover_z_id}
                                                onChange={(v) => setNewCircuit((p) => ({ ...p, handover_z_id: v }))}
                                                placeholder="Default from resource..."
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => { setShowAddCircuit(false); setNewCircuit({ capacity: '', interface_type_id: '', handover_a_id: '', handover_z_id: '', batch_id: '' }) }}
                                            className="px-4 py-2 bg-surface border border-border-subtle rounded-lg text-sm font-medium text-text-muted hover:bg-surface-hover transition-colors cursor-pointer">
                                            Cancel
                                        </button>
                                        <button onClick={handleAddCircuit} disabled={savingCircuit}
                                            className="px-4 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 text-primary-foreground rounded-lg text-sm font-medium transition-colors cursor-pointer">
                                            {savingCircuit ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {circuits.length > 0 ? (
                                <div className="space-y-2">
                                    {circuits.map((circuit) => {
                                        const origName = (circuit.original_type as { name: string } | null)?.name ?? '—'
                                        const currName = (circuit.current_type as { name: string } | null)?.name ?? '—'
                                        const wasConverted = circuit.original_interface_type_id !== circuit.current_interface_type_id
                                        const circuitHandoverA = circuit.handover_location_a_id
                                        const circuitHandoverZ = circuit.handover_location_z_id
                                        const hLocA = circuitHandoverA ? handoverLocations.find((h) => h.id === circuitHandoverA) : null
                                        const hLocZ = circuitHandoverZ ? handoverLocations.find((h) => h.id === circuitHandoverZ) : null
                                        const batchInfo = circuit.batch_id ? batches.find(b => b.id === circuit.batch_id) : null

                                        return (
                                            <div key={circuit.id} className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border-subtle">
                                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-surface text-xs font-bold text-text-muted">
                                                    #{circuit.circuit_number}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-medium">{circuit.capacity}G</span>
                                                        <span className={`text-xs font-medium ${circuitStatusColors[circuit.status]}`}>● {circuit.status}</span>
                                                        {batchInfo && (
                                                            <span className="px-1.5 py-0.5 rounded bg-surface-hover text-[10px] font-medium text-text-dim">B{batchInfo.batch_number}</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1 mt-0.5">
                                                        <span className="text-xs text-text-dim">{origName}</span>
                                                        {wasConverted && (
                                                            <>
                                                                <RefreshCw className="h-3 w-3 text-warning" />
                                                                <span className="text-xs text-warning font-medium">{currName}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                    {(hLocA || hLocZ) && (
                                                        <div className="text-xs text-text-dim mt-0.5">
                                                            🏢 {hLocA?.name ?? '(default)'} → {hLocZ?.name ?? '(default)'}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <div className="w-28">
                                                        <SearchableSelect
                                                            options={interfaceTypes.map((t) => ({ value: t.id, label: t.name }))}
                                                            value={circuit.current_interface_type_id ?? ''}
                                                            onChange={(v) => v && handleChangeInterfaceType(circuit.id, v)}
                                                            placeholder="Type..."
                                                        />
                                                    </div>
                                                    <button onClick={() => handleDeleteCircuit(circuit.id)}
                                                        className="p-1.5 rounded-md hover:bg-destructive/10 text-text-dim hover:text-destructive transition-colors cursor-pointer">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <p className="text-sm text-text-dim text-center py-4">No circuits defined yet.</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Card 4.5: Linked Sales */}
                {linkedSales.length > 0 && (
                    <div className="bg-surface rounded-xl border border-border-subtle p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <FileText className="h-4 w-4 text-primary" />
                            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">
                                Linked Sales ({linkedSales.length})
                            </h2>
                        </div>

                        {/* Capacity allocation bar */}
                        {resource.total_capacity && (() => {
                            const activeUsed = linkedSales
                                .filter(s => s.order_status === 'Active' || s.order_status === 'Pre-sold')
                                .reduce((sum, s) => sum + (s.capacity ?? 0), 0)
                            const draftUsed = linkedSales
                                .filter(s => s.order_status === 'Draft')
                                .reduce((sum, s) => sum + (s.capacity ?? 0), 0)
                            const total = resource.total_capacity!
                            const activePct = Math.min((activeUsed / total) * 100, 100)
                            const draftPct = Math.min((draftUsed / total) * 100, 100 - activePct)
                            return (
                                <div className="mb-4">
                                    <div className="flex justify-between text-xs text-text-dim mb-1">
                                        <span>Allocated: {activeUsed}G / {total}G</span>
                                        {draftUsed > 0 && <span className="text-gray-500">+ {draftUsed}G draft</span>}
                                    </div>
                                    <div className="h-2 bg-background rounded-full overflow-hidden">
                                        <div className="h-full flex">
                                            <div className="bg-emerald-500 h-full" style={{ width: `${activePct}%` }} />
                                            <div className="bg-gray-600 h-full" style={{ width: `${draftPct}%` }} />
                                        </div>
                                    </div>
                                </div>
                            )
                        })()}

                        <div className="space-y-2">
                            {linkedSales.map((sale) => (
                                <Link key={sale.id} to={`/sales/${sale.sales_order_id}`}
                                    className="flex items-center justify-between p-3 bg-background rounded-lg border border-border-subtle hover:border-primary/30 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-mono text-primary">{sale.order_id}</span>
                                        <span className="text-sm text-text-muted">{sale.customer_name || '—'}</span>
                                        {sale.capacity && <span className="text-sm font-medium">{sale.capacity}G</span>}
                                        {sale.disposal_type && (
                                            <span className="text-xs text-text-dim bg-surface-hover px-2 py-0.5 rounded">{sale.disposal_type}</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${salesStatusColors[sale.order_status] ?? ''}`}>
                                            {sale.order_status}
                                        </span>
                                        <ExternalLink className="h-3.5 w-3.5 text-text-dim" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Card 5: Contract & Financials */}
                <div className="bg-surface rounded-xl border border-border-subtle p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <DollarSign className="h-4 w-4 text-primary" />
                        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">
                            {isBatchMode ? 'Base Contract & Financials' : 'Contract & Financials'}
                        </h2>
                    </div>
                    <div className="grid grid-cols-3 gap-6 mb-6">
                        <div className="flex items-start gap-2">
                            <Calendar className="h-4 w-4 text-text-dim mt-0.5" />
                            <InfoRow label={isBatchMode ? 'Base Term' : 'Term'} value={resource.term_months ? `${resource.term_months} months` : null} />
                        </div>
                        <InfoRow label="Start Date" value={resource.start_date} />
                        <InfoRow label="End Date" value={resource.end_date} />
                    </div>

                    {(isIRU || isBatchMode) && (
                        <div className="p-4 bg-background rounded-lg border border-border-subtle">
                            <h3 className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">
                                {isBatchMode ? 'Base IRU Cost' : 'IRU Financials'}
                            </h3>
                            <div className="grid grid-cols-3 gap-6">
                                <InfoRow label={isBatchMode ? 'Base OTC' : 'OTC'} value={resource.otc ? formatCurrency(Number(resource.otc)) : null} />
                                <InfoRow label={isBatchMode ? 'Base O&M Rate' : 'O&M Rate'} value={resource.om_rate ? `${resource.om_rate}%` : null} />
                                <InfoRow label="Annual O&M" value={resource.annual_om_cost ? formatCurrency(Number(resource.annual_om_cost)) : null} />
                            </div>
                        </div>
                    )}

                    {isLease && !isBatchMode && (
                        <div className="p-4 bg-background rounded-lg border border-border-subtle">
                            <h3 className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">Lease Financials</h3>
                            <div className="grid grid-cols-2 gap-6">
                                <InfoRow label="MRC" value={resource.mrc ? formatCurrency(Number(resource.mrc)) : null} />
                                <InfoRow label="NRC" value={resource.nrc ? formatCurrency(Number(resource.nrc)) : null} />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                open={!!pendingDelete}
                title={`Delete ${pendingDelete?.label ?? 'item'}?`}
                message={`This will permanently delete this ${pendingDelete?.type ?? 'item'}. This action cannot be undone.`}
                confirmLabel="Delete"
                variant="danger"
                loading={deletingItem}
                onCancel={() => setPendingDelete(null)}
                onConfirm={confirmPendingDelete}
            />
        </div>
    )
}

// Inline-editable field for edit mode — saves on blur
function BatchField({ label, value, onSave, type = 'text', disabled = false }: {
    label: string; value: string | number; onSave: (v: string) => void; type?: string; disabled?: boolean
}) {
    const [local, setLocal] = useState(String(value ?? ''))
    useEffect(() => { setLocal(String(value ?? '')) }, [value])

    return (
        <div>
            {label && <label className="block text-xs text-text-dim mb-1">{label}</label>}
            <input
                type={type}
                value={local}
                onChange={(e) => setLocal(e.target.value)}
                onBlur={() => { if (local !== String(value ?? '') && !disabled) onSave(local) }}
                disabled={disabled}
                className={`w-full px-2.5 py-1.5 bg-surface border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-1 focus:ring-primary ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
        </div>
    )
}
