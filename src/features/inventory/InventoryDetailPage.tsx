import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
    ArrowLeft, Pencil, MapPin, DollarSign, BarChart3, Loader2,
    Shield, ShieldOff, Calendar, Plus, Trash2, RefreshCw,
} from 'lucide-react'
import { fetchInventoryById } from './api'
import { fetchCircuits, createCircuit, updateCircuit, deleteCircuit, fetchInterfaceTypes } from '@/lib/reference-api'
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

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
    return (
        <div>
            <p className="text-xs text-text-dim">{label}</p>
            <p className="text-sm font-medium mt-0.5">{value ?? '—'}</p>
        </div>
    )
}

export function InventoryDetailPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const [resource, setResource] = useState<InventoryResource | null>(null)
    const [loading, setLoading] = useState(true)
    const [circuits, setCircuits] = useState<InventoryCircuit[]>([])
    const [interfaceTypes, setInterfaceTypes] = useState<{ id: string; name: string }[]>([])
    const [showAddCircuit, setShowAddCircuit] = useState(false)
    const [newCircuit, setNewCircuit] = useState({ capacity: '', interface_type_id: '' })
    const [savingCircuit, setSavingCircuit] = useState(false)

    const loadCircuits = useCallback(async () => {
        if (!id) return
        try {
            const data = await fetchCircuits(id)
            setCircuits(data as InventoryCircuit[])
        } catch (err) {
            console.error('Failed to load circuits:', err)
        }
    }, [id])

    useEffect(() => {
        if (!id) return
        fetchInventoryById(id)
            .then(setResource)
            .catch(console.error)
            .finally(() => setLoading(false))

        loadCircuits()
        fetchInterfaceTypes().then(setInterfaceTypes).catch(console.error)
    }, [id, loadCircuits])

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
            setNewCircuit({ capacity: '', interface_type_id: '' })
            setShowAddCircuit(false)
            loadCircuits()
        } catch (err) {
            console.error('Failed to add circuit:', err)
        } finally {
            setSavingCircuit(false)
        }
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

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
        )
    }

    if (!resource) {
        return (
            <div className="text-center py-20">
                <p className="text-text-muted text-lg">Resource not found</p>
                <button onClick={() => navigate('/inventory')} className="mt-4 text-primary hover:underline cursor-pointer">
                    ← Back to Inventory
                </button>
            </div>
        )
    }

    const isIRU = resource.acquisition_type === 'IRU'
    const isLease = resource.acquisition_type === 'Lease'
    const totalCap = Number(resource.total_capacity ?? 0)
    const usedCap = Number(resource.used_capacity ?? 0)
    const usagePct = totalCap > 0 ? Math.min((usedCap / totalCap) * 100, 100) : 0
    const remaining = totalCap - usedCap
    const circuitTotal = circuits.reduce((sum, c) => sum + Number(c.capacity), 0)

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
                            {resource.protection === 'Protected'
                                ? <Shield className="h-4 w-4 text-primary" />
                                : <ShieldOff className="h-4 w-4 text-text-dim" />}
                            <span className="text-sm">{resource.protection}</span>
                        </div>
                        <InfoRow label="Contract Ref" value={resource.contract_ref} />
                        <InfoRow label="Cost Mode" value={resource.cost_mode} />
                        <InfoRow label="Capacity" value={totalCap > 0 ? `${totalCap}G` : null} />
                    </div>
                    {resource.notes && (
                        <div className="mt-4 pt-4 border-t border-border-subtle">
                            <p className="text-xs text-text-dim">Notes</p>
                            <p className="text-sm mt-1 text-text-muted">{resource.notes}</p>
                        </div>
                    )}
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
                    {resource.route_description && <p className="text-sm text-text-muted mt-3">{resource.route_description}</p>}
                </div>

                {/* Card 3: Capacity Usage + Circuits */}
                {totalCap > 0 && (
                    <div className="bg-surface rounded-xl border border-border-subtle p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <BarChart3 className="h-4 w-4 text-primary" />
                            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Capacity Usage</h2>
                        </div>
                        {/* Progress bar */}
                        <div className="mb-3">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="font-medium">{usedCap}G / {totalCap}G Used</span>
                                <span className="text-text-muted">{Math.round(usagePct)}%</span>
                            </div>
                            <div className="w-full h-3 bg-surface-hover rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all ${usagePct >= 100 ? 'bg-status-full' : usagePct >= 50 ? 'bg-status-partial' : 'bg-status-available'
                                        }`}
                                    style={{ width: `${usagePct}%` }}
                                />
                            </div>
                        </div>
                        <div className="flex gap-6 text-sm mt-2">
                            <div><span className="inline-block w-2 h-2 rounded-full bg-status-available mr-2" /><span className="text-text-muted">Remaining: </span><span className="font-medium">{remaining}G</span></div>
                            <div><span className="inline-block w-2 h-2 rounded-full bg-status-partial mr-2" /><span className="text-text-muted">Used: </span><span className="font-medium">{usedCap}G</span></div>
                        </div>

                        {/* Circuits section */}
                        <div className="mt-6 pt-4 border-t border-border-subtle">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h3 className="text-sm font-semibold">Circuits</h3>
                                    <p className="text-xs text-text-dim mt-0.5">
                                        {circuits.length} circuit{circuits.length !== 1 ? 's' : ''} · {circuitTotal}G mapped of {totalCap}G total
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowAddCircuit(!showAddCircuit)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-medium transition-colors cursor-pointer"
                                >
                                    <Plus className="h-3.5 w-3.5" /> Add Circuit
                                </button>
                            </div>

                            {/* Add circuit form */}
                            {showAddCircuit && (
                                <div className="flex items-end gap-3 mb-4 p-3 bg-background rounded-lg border border-border-subtle">
                                    <div className="flex-1">
                                        <label className="block text-xs text-text-dim mb-1">Capacity (G)</label>
                                        <input type="number" value={newCircuit.capacity}
                                            onChange={(e) => setNewCircuit((p) => ({ ...p, capacity: e.target.value }))}
                                            placeholder="100"
                                            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-xs text-text-dim mb-1">Interface Type</label>
                                        <SearchableSelect
                                            options={interfaceTypes.map((t) => ({ value: t.id, label: t.name }))}
                                            value={newCircuit.interface_type_id}
                                            onChange={(v) => setNewCircuit((p) => ({ ...p, interface_type_id: v }))}
                                            placeholder="Select type..."
                                        />
                                    </div>
                                    <button onClick={handleAddCircuit} disabled={savingCircuit}
                                        className="px-4 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 text-primary-foreground rounded-lg text-sm font-medium transition-colors cursor-pointer">
                                        {savingCircuit ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
                                    </button>
                                </div>
                            )}

                            {/* Circuits list */}
                            {circuits.length > 0 ? (
                                <div className="space-y-2">
                                    {circuits.map((circuit) => {
                                        const origName = (circuit.original_type as { name: string } | null)?.name ?? '—'
                                        const currName = (circuit.current_type as { name: string } | null)?.name ?? '—'
                                        const wasConverted = circuit.original_interface_type_id !== circuit.current_interface_type_id

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
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    {/* Quick change interface type */}
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
                                <p className="text-sm text-text-dim text-center py-4">No circuits defined yet. Add circuits to track interface types.</p>
                            )}
                        </div>

                        {/* Linked Sales placeholder */}
                        <div className="mt-4 pt-4 border-t border-border-subtle">
                            <p className="text-xs text-text-dim">Linked Sales Orders</p>
                            <p className="text-sm text-text-muted mt-1">No sales orders linked yet</p>
                        </div>
                    </div>
                )}

                {/* Card 4: Contract & Financials */}
                <div className="bg-surface rounded-xl border border-border-subtle p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <DollarSign className="h-4 w-4 text-primary" />
                        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Contract & Financials</h2>
                    </div>
                    <div className="grid grid-cols-3 gap-6 mb-6">
                        <div className="flex items-start gap-2">
                            <Calendar className="h-4 w-4 text-text-dim mt-0.5" />
                            <InfoRow label="Term" value={resource.term_months ? `${resource.term_months} months` : null} />
                        </div>
                        <InfoRow label="Start Date" value={resource.start_date} />
                        <InfoRow label="End Date" value={resource.end_date} />
                    </div>

                    {isIRU && (
                        <div className="p-4 bg-background rounded-lg border border-border-subtle">
                            <h3 className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">IRU Financials</h3>
                            <div className="grid grid-cols-3 gap-6">
                                <InfoRow label="OTC" value={resource.otc ? formatCurrency(Number(resource.otc)) : null} />
                                <InfoRow label="O&M Rate" value={resource.om_rate ? `${resource.om_rate}%` : null} />
                                <InfoRow label="Annual O&M" value={resource.annual_om_cost ? formatCurrency(Number(resource.annual_om_cost)) : null} />
                            </div>
                        </div>
                    )}

                    {isLease && (
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
