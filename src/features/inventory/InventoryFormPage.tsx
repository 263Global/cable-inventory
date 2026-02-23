import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { createInventoryResource, updateInventoryResource, fetchInventoryById } from './api'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import {
    fetchCableSystems,
    fetchCountriesForCable,
    fetchStationsForCableAndCountry,
    fetchHandoverLocations,
    fetchSuppliers,
} from '@/lib/reference-api'
import type { ResourceType, AcquisitionType, CostMode } from '@/types'

const steps = ['Resource Info', 'Locations', 'Contract & Costs']
const resourceTypes: ResourceType[] = ['Capacity', 'Terrestrial']
const acquisitionTypes: AcquisitionType[] = ['IRU', 'Lease', 'Swap-In', 'Owned']
const specPresets = ['10G', '40G', '100G', '200G', '400G', '800G', '1.6T']

// Convert spec string to capacity in G
function specToCapacity(spec: string): string {
    const upper = spec.toUpperCase().trim()
    if (upper.endsWith('T')) {
        const num = parseFloat(upper.replace('T', ''))
        return isNaN(num) ? '' : String(num * 1000)
    }
    if (upper.endsWith('G')) {
        const num = parseFloat(upper.replace('G', ''))
        return isNaN(num) ? '' : String(num)
    }
    const num = parseFloat(upper)
    return isNaN(num) ? '' : String(num)
}

// Calculate end date from start + months
function calcEndDate(start: string, months: string): string {
    if (!start || !months) return ''
    const d = new Date(start)
    const m = parseInt(months, 10)
    if (isNaN(d.getTime()) || isNaN(m) || m <= 0) return ''
    d.setMonth(d.getMonth() + m)
    d.setDate(d.getDate() - 1)
    return d.toISOString().split('T')[0]
}

// Calculate batch term: base end date - batch start date (months)
function calcBatchTerm(baseStart: string, baseTermMonths: string, batchStart: string): number {
    if (!baseStart || !baseTermMonths || !batchStart) return 0
    const baseEnd = new Date(baseStart)
    const bm = parseInt(baseTermMonths, 10)
    if (isNaN(bm) || bm <= 0) return 0
    baseEnd.setMonth(baseEnd.getMonth() + bm)
    baseEnd.setDate(baseEnd.getDate() - 1)
    const bs = new Date(batchStart)
    if (isNaN(bs.getTime()) || baseEnd < bs) return 0
    return (baseEnd.getFullYear() - bs.getFullYear()) * 12 + (baseEnd.getMonth() - bs.getMonth()) + 1
}

// Auto-suggest batch status based on dates
function suggestBatchStatus(batchStart: string, baseStart: string, baseTermMonths: string): 'Planned' | 'Active' | 'Ended' {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Calculate base end date
    if (baseStart && baseTermMonths) {
        const baseEnd = new Date(baseStart)
        const bm = parseInt(baseTermMonths, 10)
        if (!isNaN(bm) && bm > 0) {
            baseEnd.setMonth(baseEnd.getMonth() + bm)
            baseEnd.setDate(baseEnd.getDate() - 1)
            if (baseEnd < today) return 'Ended'
        }
    }

    if (!batchStart) return 'Planned'
    const bs = new Date(batchStart)
    if (isNaN(bs.getTime())) return 'Planned'
    return bs > today ? 'Planned' : 'Active'
}

// Batch row type for local state
interface BatchRow {
    id: string
    capacity: string
    model: 'IRU' | 'Lease'
    start_date: string
    term_months: string
    otc: string
    om_rate: string
    annual_om_cost: string
    mrc: string
    status: 'Planned' | 'Active' | 'Ended'
}

function newBatchRow(): BatchRow {
    return {
        id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        capacity: '', model: 'IRU', start_date: '', term_months: '',
        otc: '', om_rate: '4.0', annual_om_cost: '', mrc: '', status: 'Planned',
    }
}

export function InventoryFormPage() {
    const navigate = useNavigate()
    const { id: editId } = useParams<{ id: string }>()
    const isEdit = Boolean(editId)
    const [step, setStep] = useState(0)
    const [saving, setSaving] = useState(false)
    const [loadingEdit, setLoadingEdit] = useState(false)
    const [error, setError] = useState('')

    // Reference data
    const [cableSystems, setCableSystems] = useState<{ id: string; name: string; status: string }[]>([])
    const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([])
    const [countriesA, setCountriesA] = useState<string[]>([])
    const [countriesZ, setCountriesZ] = useState<string[]>([])
    const [stationsA, setStationsA] = useState<{ id: string; name: string }[]>([])
    const [stationsZ, setStationsZ] = useState<{ id: string; name: string }[]>([])
    const [handoverLocations, setHandoverLocations] = useState<{ id: string; name: string; country: string; city: string; type: string }[]>([])

    // Batch rows (local state, saved after resource creation)
    const [batches, setBatches] = useState<BatchRow[]>([])

    // Form state
    const [form, setForm] = useState({
        type: 'Capacity' as ResourceType,
        internal_ref: '',
        spec: '',
        capacity_value: '',
        cable_system_id: '',
        supplier_id: '',
        acquisition_type: 'IRU' as AcquisitionType,
        protection: 'Unprotected',
        contract_ref: '',
        notes: '',
        // Cost mode - now in Step 1
        cost_mode: 'Single' as CostMode,
        // Locations
        country_a: '',
        country_z: '',
        landing_station_a_id: '',
        landing_station_z_id: '',
        handover_location_a_id: '',
        handover_location_z_id: '',
        route_description: '',
        // Contract (also Base fields when Base+Batch)
        term_months: '',
        start_date: '',
        end_date: '',
        // IRU / Base IRU
        otc: '',
        om_rate: '4.0',
        annual_om_cost: '',
        // Lease
        mrc: '',
        nrc: '',
    })

    const updateForm = (key: string, value: string) => {
        setForm((prev) => {
            const next = { ...prev, [key]: value }
            // Auto-calc end date
            if (key === 'start_date' || key === 'term_months') {
                next.end_date = calcEndDate(
                    key === 'start_date' ? value : prev.start_date,
                    key === 'term_months' ? value : prev.term_months,
                )
            }
            // Auto-calc annual O&M
            if (key === 'otc' || key === 'om_rate') {
                const otc = parseFloat(key === 'otc' ? value : prev.otc) || 0
                const rate = parseFloat(key === 'om_rate' ? value : prev.om_rate) || 0
                next.annual_om_cost = (otc * rate / 100).toFixed(2)
            }
            // Terrestrial: clear submarine-only fields
            if (key === 'type' && value === 'Terrestrial') {
                next.cable_system_id = ''
                next.country_a = ''
                next.country_z = ''
                next.landing_station_a_id = ''
                next.landing_station_z_id = ''
            }
            return next
        })
        // Recalculate batch terms when base dates change
        if (key === 'start_date' || key === 'term_months') {
            setBatches((prev) =>
                prev.map((b) => ({
                    ...b,
                    term_months: b.start_date
                        ? String(calcBatchTerm(
                            key === 'start_date' ? value : form.start_date,
                            key === 'term_months' ? value : form.term_months,
                            b.start_date))
                        : '',
                }))
            )
        }
    }

    const updateBatchRow = (batchId: string, key: keyof BatchRow, value: string) => {
        setBatches((prev) =>
            prev.map((b) => {
                if (b.id !== batchId) return b
                const next = { ...b, [key]: value }
                // Auto-calc batch term when start_date changes
                if (key === 'start_date') {
                    const term = calcBatchTerm(form.start_date, form.term_months, value)
                    next.term_months = term > 0 ? String(term) : ''
                    // Auto-suggest status based on dates
                    next.status = suggestBatchStatus(value, form.start_date, form.term_months)
                }
                // Auto-calc batch O&M
                if (key === 'otc' || key === 'om_rate') {
                    const otc = parseFloat(key === 'otc' ? value : b.otc) || 0
                    const rate = parseFloat(key === 'om_rate' ? value : b.om_rate) || 0
                    next.annual_om_cost = (otc * rate / 100).toFixed(2)
                }
                return next
            })
        )
    }

    // Load reference data on mount
    useEffect(() => {
        fetchCableSystems().then(setCableSystems).catch(console.error)
        fetchSuppliers().then(setSuppliers).catch(console.error)
        fetchHandoverLocations().then(setHandoverLocations).catch(console.error)
    }, [])

    // Load existing resource in edit mode
    useEffect(() => {
        if (!editId) return
        setLoadingEdit(true)
            ; (async () => {
                try {
                    const res = await fetchInventoryById(editId)
                    if (!res) { navigate('/inventory'); return }
                    setForm({
                        type: (res.type ?? 'Capacity') as ResourceType,
                        internal_ref: res.internal_ref ?? '',
                        spec: res.spec ?? '',
                        capacity_value: res.total_capacity != null ? String(res.total_capacity) : '',
                        cable_system_id: res.cable_system_id ?? '',
                        supplier_id: res.supplier_id ?? '',
                        acquisition_type: (res.acquisition_type ?? 'IRU') as AcquisitionType,
                        protection: res.protection ?? 'Unprotected',
                        contract_ref: res.contract_ref ?? '',
                        notes: res.notes ?? '',
                        cost_mode: (res.cost_mode ?? 'Single') as CostMode,
                        country_a: res.country_a ?? '',
                        country_z: res.country_z ?? '',
                        landing_station_a_id: res.landing_station_a_id ?? '',
                        landing_station_z_id: res.landing_station_z_id ?? '',
                        handover_location_a_id: res.handover_location_a_id ?? '',
                        handover_location_z_id: res.handover_location_z_id ?? '',
                        route_description: res.route_description ?? '',
                        term_months: res.term_months != null ? String(res.term_months) : '',
                        start_date: res.start_date ?? '',
                        end_date: res.end_date ?? '',
                        otc: res.otc != null ? String(res.otc) : '',
                        om_rate: res.om_rate != null ? String(res.om_rate) : '4.0',
                        annual_om_cost: res.annual_om_cost != null ? String(res.annual_om_cost) : '',
                        mrc: res.mrc != null ? String(res.mrc) : '',
                        nrc: res.nrc != null ? String(res.nrc) : '',
                    })
                    // Load batches if batch mode
                    if (res.cost_mode === 'Base+Batch') {
                        const { fetchBatches } = await import('@/lib/reference-api')
                        const existingBatches = await fetchBatches(editId)
                        setBatches(existingBatches.map((b: Record<string, unknown>) => ({
                            id: b.id as string,
                            capacity: b.capacity != null ? String(b.capacity) : '',
                            model: ((b.model as string) ?? 'IRU') as 'IRU' | 'Lease',
                            start_date: (b.start_date as string) ?? '',
                            term_months: b.term_months != null ? String(b.term_months) : '',
                            otc: b.otc != null ? String(b.otc) : '',
                            om_rate: b.om_rate != null ? String(b.om_rate) : '4.0',
                            annual_om_cost: b.annual_om_cost != null ? String(b.annual_om_cost) : '',
                            mrc: b.mrc != null ? String(b.mrc) : '',
                            status: ((b.status as string) ?? 'Planned') as 'Planned' | 'Active' | 'Ended',
                        })))
                    }
                } catch (err) { console.error(err) }
                finally { setLoadingEdit(false) }
            })()
    }, [editId, navigate])

    // Cable → Countries cascade
    useEffect(() => {
        if (!form.cable_system_id) { setCountriesA([]); setCountriesZ([]); return }
        fetchCountriesForCable(form.cable_system_id).then((c) => { setCountriesA(c); setCountriesZ(c) }).catch(console.error)
    }, [form.cable_system_id])

    // Country A → Stations A
    useEffect(() => {
        if (!form.cable_system_id || !form.country_a) { setStationsA([]); return }
        fetchStationsForCableAndCountry(form.cable_system_id, form.country_a).then(setStationsA).catch(console.error)
    }, [form.cable_system_id, form.country_a])

    // Country Z → Stations Z
    useEffect(() => {
        if (!form.cable_system_id || !form.country_z) { setStationsZ([]); return }
        fetchStationsForCableAndCountry(form.cable_system_id, form.country_z).then(setStationsZ).catch(console.error)
    }, [form.cable_system_id, form.country_z])

    const isIRU = form.acquisition_type === 'IRU'
    const isLease = form.acquisition_type === 'Lease'
    const isBatchMode = form.cost_mode === 'Base+Batch'
    const batchTotalCapacity = batches.reduce((sum, b) => sum + (parseFloat(b.capacity) || 0), 0)
    const baseCapacity = parseFloat(form.capacity_value) || 0
    const batchCapacityExceeded = batchTotalCapacity > baseCapacity && baseCapacity > 0

    // ── Per-step validation ──
    const validateStep = (s: number): boolean => {
        const errors: string[] = []

        if (s === 0) {
            // Step 1: Resource Info
            if (form.type !== 'Terrestrial' && !form.cable_system_id) errors.push('Cable System is required')
            if (!form.capacity_value || Number(form.capacity_value) <= 0) errors.push('Capacity must be a positive number')
            if (isBatchMode && batches.length === 0) errors.push('Add at least one batch in Base+Batch mode')
            if (isBatchMode && batchCapacityExceeded) errors.push('Batch total capacity exceeds base capacity')
            // Validate each batch row
            if (isBatchMode) {
                batches.forEach((b, i) => {
                    if (!b.capacity || Number(b.capacity) <= 0) errors.push(`Batch ${i + 1}: capacity is required`)
                    if (!b.start_date) errors.push(`Batch ${i + 1}: start date is required`)
                    if (b.model === 'IRU' && b.otc && Number(b.otc) < 0) errors.push(`Batch ${i + 1}: OTC cannot be negative`)
                    if (b.model === 'Lease' && b.mrc && Number(b.mrc) < 0) errors.push(`Batch ${i + 1}: MRC cannot be negative`)
                })
            }
        }

        if (s === 1) {
            // Step 2: Locations — at least one endpoint
            if (!form.country_a && !form.country_z) errors.push('At least one endpoint country is required')
        }

        if (s === 2) {
            // Step 3: Contract & Costs
            if (form.otc && Number(form.otc) < 0) errors.push('OTC cannot be negative')
            if (form.mrc && Number(form.mrc) < 0) errors.push('MRC cannot be negative')
            if (form.nrc && Number(form.nrc) < 0) errors.push('NRC cannot be negative')
            if (form.start_date && form.end_date && form.start_date > form.end_date) {
                errors.push('End date cannot be before start date')
            }
        }

        if (errors.length > 0) {
            errors.forEach((e) => toast.error(e))
            return false
        }
        return true
    }

    const handleNext = () => {
        if (validateStep(step)) setStep((s) => s + 1)
    }

    const handleSave = async () => {
        // Validate all steps before saving
        for (let s = 0; s <= 2; s++) {
            if (!validateStep(s)) { setStep(s); return }
        }
        setSaving(true); setError('')
        try {
            // Get country UUIDs
            const countryAId = form.country_a ? await getCountryId(form.country_a) : null
            const countryZId = form.country_z ? await getCountryId(form.country_z) : null

            const payload: Record<string, unknown> = {
                type: form.type,
                internal_ref: form.internal_ref || null,
                spec: form.spec || null,
                capacity_value: form.capacity_value ? Number(form.capacity_value) : null,
                total_capacity: form.capacity_value ? Number(form.capacity_value) : null,
                cable_system_id: form.cable_system_id || null,
                supplier_id: form.supplier_id || null,
                acquisition_type: form.acquisition_type,
                protection: form.protection,
                contract_ref: form.contract_ref || null,
                notes: form.notes || null,
                cost_mode: form.cost_mode,
                // Locations
                country_a_id: countryAId,
                country_z_id: countryZId,
                landing_station_a_id: form.landing_station_a_id || null,
                landing_station_z_id: form.landing_station_z_id || null,
                handover_location_a_id: form.handover_location_a_id || null,
                handover_location_z_id: form.handover_location_z_id || null,
                route_description: form.route_description || null,
                // Contract
                term_months: form.term_months ? Number(form.term_months) : null,
                start_date: form.start_date || null,
                end_date: form.end_date || null,
                // Financials
                otc: form.otc ? Number(form.otc) : null,
                om_rate: form.om_rate ? Number(form.om_rate) : null,
                annual_om_cost: form.annual_om_cost ? Number(form.annual_om_cost) : null,
                mrc: form.mrc ? Number(form.mrc) : null,
                nrc: form.nrc ? Number(form.nrc) : null,
            }

            if (isEdit && editId) {
                await updateInventoryResource(editId, payload)
                toast.success('Resource updated')
                navigate(`/inventory/${editId}`)
            } else {
                const created = await createInventoryResource(payload)

                // If batch mode, create batch records
                if (isBatchMode && batches.length > 0) {
                    const { createBatch } = await import('@/lib/reference-api')
                    for (let i = 0; i < batches.length; i++) {
                        const b = batches[i]
                        await createBatch({
                            inventory_resource_id: created.id,
                            batch_number: i + 1,
                            capacity: parseFloat(b.capacity) || 0,
                            model: b.model,
                            start_date: b.start_date || undefined,
                            term_months: b.term_months ? parseInt(b.term_months, 10) : undefined,
                            otc: b.model === 'IRU' && b.otc ? parseFloat(b.otc) : undefined,
                            om_rate: b.model === 'IRU' && b.om_rate ? parseFloat(b.om_rate) : undefined,
                            annual_om_cost: b.model === 'IRU' && b.annual_om_cost ? parseFloat(b.annual_om_cost) : undefined,
                            mrc: b.model === 'Lease' && b.mrc ? parseFloat(b.mrc) : undefined,
                            status: b.status,
                        })
                    }
                }

                navigate(`/inventory/${created.id}`)
                toast.success('Resource created')
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to save'
            setError(msg)
            toast.error(msg)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="max-w-3xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <button onClick={() => navigate('/inventory')} className="p-2 rounded-lg hover:bg-surface-hover text-text-muted hover:text-text transition-colors cursor-pointer">
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <h1 className="text-2xl font-bold">{isEdit ? 'Edit Inventory Resource' : 'Add Inventory Resource'}</h1>
            </div>

            {/* Stepper */}
            <div className="flex items-center gap-4 mb-8">
                {steps.map((s, i) => (
                    <div key={s} className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${i < step ? 'bg-primary text-primary-foreground'
                            : i === step ? 'bg-primary text-primary-foreground ring-2 ring-primary/30' : 'bg-surface text-text-dim'}`}>
                            {i < step ? <Check className="h-4 w-4" /> : i + 1}
                        </div>
                        <span className={`text-sm ${i <= step ? 'text-text font-medium' : 'text-text-dim'}`}>{s}</span>
                        {i < steps.length - 1 && <div className={`w-12 h-0.5 ${i < step ? 'bg-primary' : 'bg-border'}`} />}
                    </div>
                ))}
            </div>

            {loadingEdit && (
                <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 text-primary animate-spin" /></div>
            )}

            {!loadingEdit && (

                <div className="bg-surface rounded-xl border border-border-subtle p-6">
                    {/* ========== Step 1: Resource Info ========== */}
                    {step === 0 && (
                        <div className="space-y-5">
                            {/* Resource Type */}
                            <div>
                                <label className="block text-sm font-medium text-text-muted mb-2">Resource Type</label>
                                <div className="flex gap-2">
                                    {resourceTypes.map((t) => (
                                        <button key={t} onClick={() => updateForm('type', t)}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${form.type === t ? 'bg-primary text-primary-foreground' : 'bg-surface-hover text-text-muted hover:text-text'
                                                }`}>{t}</button>
                                    ))}
                                    <button disabled className="px-4 py-2 rounded-lg text-sm text-text-dim bg-surface-hover opacity-50 cursor-not-allowed">Fiber 🔒</button>
                                    <button disabled className="px-4 py-2 rounded-lg text-sm text-text-dim bg-surface-hover opacity-50 cursor-not-allowed">Spectrum 🔒</button>
                                </div>
                            </div>

                            {/* Cost Mode - moved here from Step 3 */}
                            <div>
                                <label className="block text-sm font-medium text-text-muted mb-2">Cost Mode</label>
                                <div className="flex gap-2">
                                    {(['Single', 'Base+Batch'] as CostMode[]).map((mode) => (
                                        <button key={mode} onClick={() => updateForm('cost_mode', mode)}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${form.cost_mode === mode ? 'bg-primary text-primary-foreground' : 'bg-surface-hover text-text-muted hover:text-text'
                                                }`}>{mode}</button>
                                    ))}
                                </div>
                                {isBatchMode && (
                                    <p className="text-xs text-info mt-2">
                                        ℹ Base = total unlit capacity purchased. Batches = portions lit over time.
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField label="Internal Ref" value={form.internal_ref} onChange={(v) => updateForm('internal_ref', v)} placeholder="e.g. HK-C-2024-001" />
                                {/* Spec with presets */}
                                <div>
                                    <label className="block text-sm font-medium text-text-muted mb-1.5">Spec</label>
                                    <div className="flex gap-1 mb-1.5 flex-wrap">
                                        {specPresets.map((s) => (
                                            <button key={s}
                                                onClick={() => { updateForm('spec', s); updateForm('capacity_value', specToCapacity(s)) }}
                                                className={`px-2 py-1 rounded text-xs transition-colors cursor-pointer ${form.spec === s ? 'bg-primary text-primary-foreground' : 'bg-surface-hover text-text-muted hover:text-text'
                                                    }`}>{s}</button>
                                        ))}
                                    </div>
                                    <input type="text" value={form.spec}
                                        onChange={(e) => { updateForm('spec', e.target.value); const cap = specToCapacity(e.target.value); if (cap) updateForm('capacity_value', cap) }}
                                        placeholder="Or enter custom spec (e.g. 300G, 1.6T)..."
                                        className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-text-dim"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    label={isBatchMode ? 'Base Capacity (Total, Unlit)' : 'Capacity Value'}
                                    value={form.capacity_value}
                                    onChange={(v) => updateForm('capacity_value', v)}
                                    type="number" placeholder="e.g. 1000"
                                />
                                {/* Cable System — hidden for Terrestrial */}
                                {form.type !== 'Terrestrial' && (
                                    <div>
                                        <label className="block text-sm font-medium text-text-muted mb-1.5">Cable System</label>
                                        <SearchableSelect
                                            options={cableSystems.map((c) => ({
                                                value: c.id,
                                                label: c.name,
                                                sublabel: c.status,
                                            }))}
                                            value={form.cable_system_id}
                                            onChange={(v) => {
                                                updateForm('cable_system_id', v)
                                                updateForm('country_a', '')
                                                updateForm('country_z', '')
                                                updateForm('landing_station_a_id', '')
                                                updateForm('landing_station_z_id', '')
                                            }}
                                            placeholder="Search cable system..."
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Supplier - searchable dropdown */}
                                <div>
                                    <label className="block text-sm font-medium text-text-muted mb-1.5">Supplier</label>
                                    <SearchableSelect
                                        options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
                                        value={form.supplier_id}
                                        onChange={(v) => updateForm('supplier_id', v)}
                                        placeholder="Search supplier..."
                                    />
                                </div>
                                {/* Acquisition Type */}
                                <div>
                                    <label className="block text-sm font-medium text-text-muted mb-1.5">Acquisition Type</label>
                                    <div className="flex gap-2 flex-wrap">
                                        {acquisitionTypes.map((at) => (
                                            <button key={at} onClick={() => updateForm('acquisition_type', at)}
                                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${form.acquisition_type === at ? 'bg-primary text-primary-foreground' : 'bg-surface-hover text-text-muted hover:text-text'
                                                    }`}>{at}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Protection */}
                                <div>
                                    <label className="block text-sm font-medium text-text-muted mb-1.5">Protection</label>
                                    <div className="flex gap-2">
                                        {['Protected', 'Unprotected'].map((p) => (
                                            <button key={p} onClick={() => updateForm('protection', p)}
                                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${form.protection === p ? 'bg-primary text-primary-foreground' : 'bg-surface-hover text-text-muted hover:text-text'
                                                    }`}>{p}</button>
                                        ))}
                                    </div>
                                </div>
                                <FormField label="Contract Ref" value={form.contract_ref} onChange={(v) => updateForm('contract_ref', v)} placeholder="e.g. CTR-2024-001" />
                            </div>

                            <FormField label="Notes" value={form.notes} onChange={(v) => updateForm('notes', v)} placeholder="Optional notes..." />
                        </div>
                    )}

                    {/* ========== Step 2: Locations ========== */}
                    {step === 1 && (
                        <div className="space-y-5">
                            <div className="grid grid-cols-2 gap-6">
                                {/* A-End */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold text-primary border-b border-border-subtle pb-2">A-End</h3>
                                    {form.type !== 'Terrestrial' && (<>
                                        <div>
                                            <label className="block text-sm font-medium text-text-muted mb-1.5">Country</label>
                                            <SearchableSelect
                                                options={countriesA.map((c) => ({ value: c, label: c }))}
                                                value={form.country_a}
                                                onChange={(v) => updateForm('country_a', v)}
                                                placeholder={form.cable_system_id ? 'Select country...' : 'Select cable first'}
                                                disabled={!form.cable_system_id}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-text-muted mb-1.5">Landing Station</label>
                                            <SearchableSelect
                                                options={stationsA.map((s) => ({ value: s.id, label: s.name }))}
                                                value={form.landing_station_a_id}
                                                onChange={(v) => updateForm('landing_station_a_id', v)}
                                                placeholder={form.country_a ? 'Select station...' : 'Select country first'}
                                                disabled={!form.country_a}
                                            />
                                        </div>
                                    </>)}
                                    <div>
                                        <label className="block text-sm font-medium text-text-muted mb-1.5">Handover Location</label>
                                        <SearchableSelect
                                            options={handoverLocations.map((h) => ({
                                                value: h.id,
                                                label: h.name,
                                                sublabel: `${h.city || ''}, ${h.country} · ${h.type}`,
                                            }))}
                                            value={form.handover_location_a_id}
                                            onChange={(v) => updateForm('handover_location_a_id', v)}
                                            placeholder="Search all locations..."
                                        />
                                    </div>
                                </div>

                                {/* Z-End */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold text-primary border-b border-border-subtle pb-2">Z-End</h3>
                                    {form.type !== 'Terrestrial' && (<>
                                        <div>
                                            <label className="block text-sm font-medium text-text-muted mb-1.5">Country</label>
                                            <SearchableSelect
                                                options={countriesZ.map((c) => ({ value: c, label: c }))}
                                                value={form.country_z}
                                                onChange={(v) => updateForm('country_z', v)}
                                                placeholder={form.cable_system_id ? 'Select country...' : 'Select cable first'}
                                                disabled={!form.cable_system_id}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-text-muted mb-1.5">Landing Station</label>
                                            <SearchableSelect
                                                options={stationsZ.map((s) => ({ value: s.id, label: s.name }))}
                                                value={form.landing_station_z_id}
                                                onChange={(v) => updateForm('landing_station_z_id', v)}
                                                placeholder={form.country_z ? 'Select station...' : 'Select country first'}
                                                disabled={!form.country_z}
                                            />
                                        </div>
                                    </>)}
                                    <div>
                                        <label className="block text-sm font-medium text-text-muted mb-1.5">Handover Location</label>
                                        <SearchableSelect
                                            options={handoverLocations.map((h) => ({
                                                value: h.id,
                                                label: h.name,
                                                sublabel: `${h.city || ''}, ${h.country} · ${h.type}`,
                                            }))}
                                            value={form.handover_location_z_id}
                                            onChange={(v) => updateForm('handover_location_z_id', v)}
                                            placeholder="Search all locations..."
                                        />
                                    </div>
                                </div>
                            </div>

                            <FormField label="Route Description" value={form.route_description} onChange={(v) => updateForm('route_description', v)} placeholder="e.g. Singapore - Egypt - France via PEACE Cable" />
                        </div>
                    )}

                    {/* ========== Step 3: Contract & Costs ========== */}
                    {step === 2 && (
                        <div className="space-y-5">
                            {/* Base / Single contract fields */}
                            <div>
                                <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">
                                    {isBatchMode ? 'Base Contract' : 'Contract Period'}
                                </h3>
                                <div className="grid grid-cols-3 gap-4">
                                    <FormField label={isBatchMode ? 'Base Term (Months)' : 'Term (Months)'} value={form.term_months} onChange={(v) => updateForm('term_months', v)} type="number" placeholder="e.g. 180" />
                                    <FormField label="Start Date" value={form.start_date} onChange={(v) => updateForm('start_date', v)} type="date" />
                                    <FormField label="End Date (auto)" value={form.end_date} onChange={(v) => updateForm('end_date', v)} type="date" />
                                </div>
                            </div>

                            {/* Financials - Single IRU */}
                            {!isBatchMode && isIRU && (
                                <div className="p-4 rounded-lg border border-border-subtle bg-background">
                                    <h3 className="text-sm font-semibold mb-4 text-primary">IRU Financials</h3>
                                    <div className="grid grid-cols-3 gap-4">
                                        <FormField label="OTC ($)" value={form.otc} onChange={(v) => updateForm('otc', v)} type="number" placeholder="450000" />
                                        <FormField label="O&M Rate (%)" value={form.om_rate} onChange={(v) => updateForm('om_rate', v)} type="number" placeholder="4.0" />
                                        <FormField label="Annual O&M ($)" value={form.annual_om_cost} onChange={(v) => updateForm('annual_om_cost', v)} type="number" placeholder="Auto or override" />
                                    </div>
                                </div>
                            )}

                            {/* Financials - Single Lease */}
                            {!isBatchMode && isLease && (
                                <div className="p-4 rounded-lg border border-border-subtle bg-background">
                                    <h3 className="text-sm font-semibold mb-4 text-primary">Lease Financials</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField label="MRC ($)" value={form.mrc} onChange={(v) => updateForm('mrc', v)} type="number" placeholder="5000" />
                                        <FormField label="NRC ($)" value={form.nrc} onChange={(v) => updateForm('nrc', v)} type="number" placeholder="10000" />
                                    </div>
                                </div>
                            )}

                            {/* Base+Batch: Base Cost */}
                            {isBatchMode && (
                                <div className="p-4 rounded-lg border border-border-subtle bg-background">
                                    <h3 className="text-sm font-semibold mb-4 text-primary">Base Cost (IRU)</h3>
                                    <div className="grid grid-cols-3 gap-4">
                                        <FormField label="Base OTC ($)" value={form.otc} onChange={(v) => updateForm('otc', v)} type="number" placeholder="450000" />
                                        <FormField label="Base O&M Rate (%)" value={form.om_rate} onChange={(v) => updateForm('om_rate', v)} type="number" placeholder="4.0" />
                                        <FormField label="Base Annual O&M ($)" value={form.annual_om_cost} onChange={(v) => updateForm('annual_om_cost', v)} type="number" placeholder="Auto or override" />
                                    </div>
                                </div>
                            )}

                            {/* Base+Batch: Batch Rows */}
                            {isBatchMode && (
                                <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h3 className="text-sm font-semibold text-primary">Batches</h3>
                                            <p className="text-xs text-text-dim mt-0.5">
                                                {batches.length} batch{batches.length !== 1 ? 'es' : ''} · {batchTotalCapacity}G of {baseCapacity || '—'}G base
                                                {batchCapacityExceeded && <span className="text-destructive ml-2 font-medium">⚠ Exceeds base capacity!</span>}
                                            </p>
                                        </div>
                                        <button onClick={() => setBatches((p) => [...p, newBatchRow()])}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-medium transition-colors cursor-pointer">
                                            <Plus className="h-3.5 w-3.5" /> Add Batch
                                        </button>
                                    </div>

                                    {/* Capacity progress */}
                                    {baseCapacity > 0 && (
                                        <div className="mb-4">
                                            <div className="w-full h-2 bg-surface-hover rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full transition-all ${batchCapacityExceeded ? 'bg-destructive' : 'bg-primary'}`}
                                                    style={{ width: `${Math.min((batchTotalCapacity / baseCapacity) * 100, 100)}%` }} />
                                            </div>
                                        </div>
                                    )}

                                    {batches.length === 0 ? (
                                        <p className="text-sm text-text-dim text-center py-6">No batches yet. Add batches to define lit capacity portions.</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {batches.map((b, idx) => (
                                                <div key={b.id} className="p-3 bg-background rounded-lg border border-border-subtle">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <span className="text-xs font-bold text-text-muted">Batch #{idx + 1}</span>
                                                        <div className="flex items-center gap-2">
                                                            <select value={b.model}
                                                                onChange={(e) => updateBatchRow(b.id, 'model', e.target.value)}
                                                                className="px-2 py-1 bg-surface border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary">
                                                                <option value="IRU">IRU</option>
                                                                <option value="Lease">Lease</option>
                                                            </select>
                                                            <select value={b.status}
                                                                onChange={(e) => updateBatchRow(b.id, 'status', e.target.value)}
                                                                className="px-2 py-1 bg-surface border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary">
                                                                <option value="Planned">Planned</option>
                                                                <option value="Active">Active</option>
                                                                <option value="Ended">Ended</option>
                                                            </select>
                                                            <button onClick={() => setBatches((p) => p.filter((x) => x.id !== b.id))}
                                                                className="p-1 rounded hover:bg-destructive/10 text-text-dim hover:text-destructive cursor-pointer">
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-4 gap-3">
                                                        <FormField label="Capacity (G)" value={b.capacity} onChange={(v) => updateBatchRow(b.id, 'capacity', v)} type="number" placeholder="100" />
                                                        <FormField label="Start Date" value={b.start_date} onChange={(v) => updateBatchRow(b.id, 'start_date', v)} type="date" />
                                                        <FormField label="Term (auto)" value={b.term_months} onChange={(v) => updateBatchRow(b.id, 'term_months', v)} type="number" placeholder="Auto" />
                                                        {b.model === 'IRU' ? (
                                                            <FormField label="OTC ($)" value={b.otc} onChange={(v) => updateBatchRow(b.id, 'otc', v)} type="number" placeholder="0" />
                                                        ) : (
                                                            <FormField label="MRC ($)" value={b.mrc} onChange={(v) => updateBatchRow(b.id, 'mrc', v)} type="number" placeholder="0" />
                                                        )}
                                                    </div>
                                                    {b.model === 'IRU' && (
                                                        <div className="grid grid-cols-2 gap-3 mt-3">
                                                            <FormField label="O&M Rate (%)" value={b.om_rate} onChange={(v) => updateBatchRow(b.id, 'om_rate', v)} type="number" placeholder="4.0" />
                                                            <FormField label="Annual O&M ($)" value={b.annual_om_cost} onChange={(v) => updateBatchRow(b.id, 'annual_om_cost', v)} type="number" placeholder="Auto or override" />
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Error */}
                    {error && <div className="mt-4 text-destructive text-sm bg-destructive/10 rounded-lg px-4 py-3">{error}</div>}

                    {/* Navigation */}
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-border-subtle">
                        <button onClick={() => setStep((s) => s - 1)} disabled={step === 0}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-text-muted hover:text-text hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer">
                            <ArrowLeft className="h-4 w-4" /> Back
                        </button>
                        {step < steps.length - 1 ? (
                            <button onClick={handleNext}
                                className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-primary-foreground rounded-lg text-sm font-medium transition-colors cursor-pointer">
                                Next <ArrowRight className="h-4 w-4" />
                            </button>
                        ) : (
                            <button onClick={handleSave} disabled={saving || (isBatchMode && batchCapacityExceeded)}
                                className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-50 text-primary-foreground rounded-lg text-sm font-medium transition-colors cursor-pointer">
                                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                                <Check className="h-4 w-4" /> {isEdit ? 'Save Changes' : 'Create Resource'}
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

// Helper: get country UUID by name
async function getCountryId(name: string): Promise<string | null> {
    const { supabase } = await import('@/lib/supabase')
    const { data } = await supabase.from('countries').select('id').eq('name', name).single()
    return data?.id ?? null
}

function FormField({ label, value, onChange, placeholder, type = 'text' }: {
    label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
    return (
        <div>
            <label className="block text-xs font-medium text-text-muted mb-1">{label}</label>
            <input type={type} value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-text-dim"
            />
        </div>
    )
}
