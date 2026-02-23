import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
    ArrowLeft, Pencil, MapPin, DollarSign, BarChart3, Loader2,
    Shield, ShieldOff, Calendar, Plus, Trash2, RefreshCw, Layers,
} from 'lucide-react'
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
    const [newCircuit, setNewCircuit] = useState({ capacity: '', interface_type_id: '', handover_a_id: '', handover_z_id: '' })
    const [savingCircuit, setSavingCircuit] = useState(false)

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
    }, [id, loadCircuits, loadBatches])

    const handleAddCircuit = async () => {
        if (!id || !newCircuit.capacity || !newCircuit.interface_type_id) return
        setSavingCircuit(true)
        try {
            const nextNum = circuits.length > 0 ? Math.max(...circuits.map((c) => c.circuit_number)) + 1 : 1
            await createCircuit({
                inventory_resource_id: id,
                circuit_number: nextNum,
                capacity: Number(newCircuit.capacity),
                original_interface_type_id: newCircuit.interface_type_id,
                current_interface_type_id: newCircuit.interface_type_id,
            })
            // If circuit has handover locations, update them
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
            setNewCircuit({ capacity: '', interface_type_id: '', handover_a_id: '', handover_z_id: '' })
            setShowAddCircuit(false)
            loadCircuits()
        } catch (err) { console.error(err) }
        finally { setSavingCircuit(false) }
    }

    const handleChangeInterfaceType = async (circuitId: string, newTypeId: string) => {
        await updateCircuit(circuitId, { current_interface_type_id: newTypeId })
        loadCircuits()
    }

    const handleDeleteCircuit = async (circuitId: string) => {
        if (!confirm('Delete this circuit?')) return
        await deleteCircuit(circuitId)
        loadCircuits()
    }

    const handleAddQuickBatch = async () => {
        if (!id) return
        const nextNum = batches.length > 0 ? Math.max(...batches.map((b) => b.batch_number)) + 1 : 1
        await createBatch({ inventory_resource_id: id, batch_number: nextNum, capacity: 0, model: 'IRU' })
        loadBatches()
    }

    const handleDeleteBatch = async (batchId: string) => {
        if (!confirm('Delete this batch?')) return
        await deleteBatch(batchId)
        loadBatches()
    }

    const handleUpdateBatchField = async (batchId: string, field: string, value: string | number) => {
        const { updateBatch } = await import('@/lib/reference-api')
        try {
            const updates: Record<string, unknown> = { [field]: value === '' ? null : value }
            // Auto-calc O&M when OTC or rate changes
            if (field === 'otc' || field === 'om_rate') {
                const batch = batches.find((b) => b.id === batchId)
                if (batch) {
                    const otc = field === 'otc' ? Number(value) || 0 : Number(batch.otc) || 0
                    const rate = field === 'om_rate' ? Number(value) || 0 : Number(batch.om_rate) || 0
                    updates.annual_om_cost = otc * rate / 100
                }
            }
            // Auto-suggest status when start_date changes
            if (field === 'start_date' && value) {
                const today = new Date(); today.setHours(0, 0, 0, 0)
                const batchDate = new Date(String(value))
                if (resource) {
                    const baseEnd = resource.end_date ? new Date(resource.end_date) : null
                    if (baseEnd && baseEnd < today) {
                        updates.status = 'Ended'
                    } else {
                        updates.status = batchDate > today ? 'Planned' : 'Active'
                    }
                }
                // Auto-calc term_months
                if (resource?.start_date && resource?.term_months) {
                    const baseEnd = new Date(resource.start_date)
                    baseEnd.setMonth(baseEnd.getMonth() + resource.term_months)
                    baseEnd.setDate(baseEnd.getDate() - 1)
                    const bs = new Date(String(value))
                    if (!isNaN(bs.getTime()) && baseEnd >= bs) {
                        updates.term_months = (baseEnd.getFullYear() - bs.getFullYear()) * 12 + (baseEnd.getMonth() - bs.getMonth()) + 1
                    }
                }
            }
            await updateBatch(batchId, updates)
            loadBatches()
        } catch (err) { console.error(err) }
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
    const usagePct = totalCap > 0 ? Math.min((usedCap / totalCap) * 100, 100) : 0
    const remaining = totalCap - usedCap
    const batchTotalCap = batches.reduce((sum, b) => sum + Number(b.capacity ?? 0), 0)
    const batchPct = totalCap > 0 ? Math.min((batchTotalCap / totalCap) * 100, 100) : 0

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
                <button className="flex items-center gap-2 px-4 py-2 border border-primary text-primary hover:bg-primary/10 rounded-lg text-sm font-medium transition-colors cursor-pointer">
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
                            <button onClick={handleAddQuickBatch}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-medium transition-colors cursor-pointer">
                                <Plus className="h-3.5 w-3.5" /> Add Batch
                            </button>
                        </div>
                        {/* Batch capacity bar */}
                        <div className="w-full h-2 bg-surface-hover rounded-full overflow-hidden mb-4">
                            <div className={`h-full rounded-full transition-all ${batchPct > 100 ? 'bg-destructive' : 'bg-primary'}`}
                                style={{ width: `${Math.min(batchPct, 100)}%` }} />
                        </div>
                        {batches.length === 0 ? (
                            <p className="text-sm text-text-dim text-center py-4">No batches defined yet.</p>
                        ) : (
                            <div className="space-y-3">
                                {batches.map((b) => (
                                    <div key={b.id} className="p-4 bg-background rounded-lg border border-border-subtle">
                                        {/* Batch header */}
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-text-muted bg-surface px-2 py-1 rounded-full">B{b.batch_number}</span>
                                                <select value={b.model}
                                                    onChange={(e) => handleUpdateBatchField(b.id, 'model', e.target.value)}
                                                    className="px-2 py-1 bg-surface border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer">
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
                                            <button onClick={() => handleDeleteBatch(b.id)}
                                                className="p-1.5 rounded-md hover:bg-destructive/10 text-text-dim hover:text-destructive transition-colors cursor-pointer">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                        {/* Batch fields */}
                                        <div className="grid grid-cols-4 gap-3">
                                            <BatchField label="Capacity (G)" type="number" value={b.capacity ?? ''} onSave={(v) => handleUpdateBatchField(b.id, 'capacity', Number(v))} />
                                            <BatchField label="Start Date" type="date" value={b.start_date ?? ''} onSave={(v) => handleUpdateBatchField(b.id, 'start_date', v)} />
                                            <BatchField label="Term (months)" type="number" value={b.term_months ?? ''} onSave={(v) => handleUpdateBatchField(b.id, 'term_months', Number(v))} />
                                            {b.model === 'IRU' ? (
                                                <BatchField label="OTC ($)" type="number" value={b.otc ?? ''} onSave={(v) => handleUpdateBatchField(b.id, 'otc', Number(v))} />
                                            ) : (
                                                <BatchField label="MRC ($)" type="number" value={b.mrc ?? ''} onSave={(v) => handleUpdateBatchField(b.id, 'mrc', Number(v))} />
                                            )}
                                        </div>
                                        {b.model === 'IRU' && (
                                            <div className="grid grid-cols-3 gap-3 mt-3">
                                                <BatchField label="O&M Rate (%)" type="number" value={b.om_rate ?? ''} onSave={(v) => handleUpdateBatchField(b.id, 'om_rate', Number(v))} />
                                                <BatchField label="Annual O&M (auto)" type="number" value={b.annual_om_cost ?? ''} onSave={() => { }} disabled />
                                                <div />
                                            </div>
                                        )}
                                    </div>
                                ))}
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
                        <div className="mb-3">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="font-medium">{usedCap}G / {totalCap}G Used</span>
                                <span className="text-text-muted">{Math.round(usagePct)}%</span>
                            </div>
                            <div className="w-full h-3 bg-surface-hover rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all ${usagePct >= 100 ? 'bg-status-full' : usagePct >= 50 ? 'bg-status-partial' : 'bg-status-available'}`}
                                    style={{ width: `${usagePct}%` }} />
                            </div>
                        </div>
                        <div className="flex gap-6 text-sm mt-2">
                            <div><span className="inline-block w-2 h-2 rounded-full bg-status-available mr-2" /><span className="text-text-muted">Remaining: </span><span className="font-medium">{remaining}G</span></div>
                            <div><span className="inline-block w-2 h-2 rounded-full bg-status-partial mr-2" /><span className="text-text-muted">Used: </span><span className="font-medium">{usedCap}G</span></div>
                        </div>

                        {/* Circuits */}
                        <div className="mt-6 pt-4 border-t border-border-subtle">
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
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs text-text-dim mb-1">Handover A (optional, override)</label>
                                            <SearchableSelect
                                                options={handoverLocations.map((h) => ({ value: h.id, label: h.name, sublabel: `${h.city || ''}, ${h.country}` }))}
                                                value={newCircuit.handover_a_id}
                                                onChange={(v) => setNewCircuit((p) => ({ ...p, handover_a_id: v }))}
                                                placeholder="Default from resource..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-text-dim mb-1">Handover Z (optional, override)</label>
                                            <SearchableSelect
                                                options={handoverLocations.map((h) => ({ value: h.id, label: h.name, sublabel: `${h.city || ''}, ${h.country}` }))}
                                                value={newCircuit.handover_z_id}
                                                onChange={(v) => setNewCircuit((p) => ({ ...p, handover_z_id: v }))}
                                                placeholder="Default from resource..."
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end">
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

                                        return (
                                            <div key={circuit.id} className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border-subtle">
                                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-surface text-xs font-bold text-text-muted">
                                                    #{circuit.circuit_number}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-medium">{circuit.capacity}G</span>
                                                        <span className={`text-xs font-medium ${circuitStatusColors[circuit.status]}`}>● {circuit.status}</span>
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
        </div>
    )
}

// Inline-editable batch field — saves on blur
function BatchField({ label, value, onSave, type = 'text', disabled = false }: {
    label: string; value: string | number; onSave: (v: string) => void; type?: string; disabled?: boolean
}) {
    const [local, setLocal] = useState(String(value ?? ''))

    // Sync when parent value changes (e.g. after reload)
    useEffect(() => { setLocal(String(value ?? '')) }, [value])

    return (
        <div>
            <label className="block text-xs text-text-dim mb-1">{label}</label>
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
