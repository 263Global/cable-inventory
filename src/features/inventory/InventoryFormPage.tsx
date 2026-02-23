import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react'
import { createInventoryResource } from './api'
import { fetchAll } from '@/lib/api'
import type { CableSystem, ResourceType, AcquisitionType } from '@/types'

const steps = ['Resource Info', 'Locations', 'Contract & Costs']
const resourceTypes: ResourceType[] = ['Capacity', 'Terrestrial']
const acquisitionTypes: AcquisitionType[] = ['IRU', 'Lease', 'Swap-In', 'Owned']
const specPresets = ['10G', '40G', '100G', '200G', '400G', '800G', '1.6T']

export function InventoryFormPage() {
    const navigate = useNavigate()
    const [step, setStep] = useState(0)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [cableSystems, setCableSystems] = useState<CableSystem[]>([])

    // Form state
    const [form, setForm] = useState({
        type: 'Capacity' as ResourceType,
        internal_ref: '',
        spec: '',
        capacity_value: '',
        cable_system_id: '',
        supplier_name: '',
        acquisition_type: 'IRU' as AcquisitionType,
        protection: 'Unprotected',
        contract_ref: '',
        notes: '',
        // Locations
        country_a: '',
        country_z: '',
        route_description: '',
        // Contract
        cost_mode: 'Single',
        term_months: '',
        start_date: '',
        end_date: '',
        // IRU
        otc: '',
        om_rate: '4.0',
        annual_om_cost: '',
        // Lease
        mrc: '',
        nrc: '',
    })

    useEffect(() => {
        fetchAll<CableSystem>('cable_systems').then(setCableSystems).catch(console.error)
    }, [])

    // Auto-calculate O&M cost
    useEffect(() => {
        if (form.acquisition_type === 'IRU' && form.otc && form.om_rate) {
            const auto = (Number(form.otc) * Number(form.om_rate)) / 100
            setForm((f) => ({ ...f, annual_om_cost: String(Math.round(auto)) }))
        }
    }, [form.otc, form.om_rate, form.acquisition_type])

    // Auto-calculate end date
    useEffect(() => {
        if (form.start_date && form.term_months) {
            const start = new Date(form.start_date)
            start.setMonth(start.getMonth() + Number(form.term_months))
            start.setDate(start.getDate() - 1)
            setForm((f) => ({ ...f, end_date: start.toISOString().split('T')[0] }))
        }
    }, [form.start_date, form.term_months])

    const updateForm = (key: string, value: string) => {
        setForm((f) => ({ ...f, [key]: value }))
    }

    const handleSave = async () => {
        setSaving(true)
        setError('')
        try {
            const resource: Record<string, unknown> = {
                type: form.type,
                internal_ref: form.internal_ref || null,
                spec: form.spec || null,
                capacity_value: form.capacity_value ? Number(form.capacity_value) : null,
                total_capacity: form.capacity_value ? Number(form.capacity_value) : null,
                cable_system_id: form.cable_system_id || null,
                supplier_name: form.supplier_name || null,
                acquisition_type: form.acquisition_type,
                protection: form.protection,
                contract_ref: form.contract_ref || null,
                notes: form.notes || null,
                country_a: form.country_a || null,
                country_z: form.country_z || null,
                route_description: form.route_description || null,
                cost_mode: form.cost_mode,
                term_months: form.term_months ? Number(form.term_months) : null,
                start_date: form.start_date || null,
                end_date: form.end_date || null,
            }

            if (form.acquisition_type === 'IRU') {
                resource.otc = form.otc ? Number(form.otc) : null
                resource.om_rate = form.om_rate ? Number(form.om_rate) : null
                resource.annual_om_cost = form.annual_om_cost ? Number(form.annual_om_cost) : null
            } else if (form.acquisition_type === 'Lease') {
                resource.mrc = form.mrc ? Number(form.mrc) : null
                resource.nrc = form.nrc ? Number(form.nrc) : null
            }

            await createInventoryResource(resource)
            navigate('/inventory')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save')
        } finally {
            setSaving(false)
        }
    }

    const isIRU = form.acquisition_type === 'IRU'
    const isLease = form.acquisition_type === 'Lease'
    const isCapacity = form.type === 'Capacity'

    return (
        <div className="max-w-3xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
                <button
                    onClick={() => navigate('/inventory')}
                    className="p-2 rounded-lg hover:bg-surface-hover text-text-muted hover:text-text transition-colors cursor-pointer"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <h1 className="text-2xl font-bold">Add Resource</h1>
            </div>

            {/* Stepper */}
            <div className="flex items-center gap-2 mb-8">
                {steps.map((s, i) => (
                    <div key={s} className="flex items-center gap-2 flex-1">
                        <button
                            onClick={() => setStep(i)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${i === step
                                    ? 'bg-primary text-primary-foreground'
                                    : i < step
                                        ? 'bg-primary/20 text-primary'
                                        : 'bg-surface text-text-muted'
                                }`}
                        >
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white/20 text-xs">
                                {i < step ? <Check className="h-3 w-3" /> : i + 1}
                            </span>
                            {s}
                        </button>
                        {i < steps.length - 1 && <div className="flex-1 h-px bg-border-subtle" />}
                    </div>
                ))}
            </div>

            {/* Form card */}
            <div className="bg-surface rounded-xl border border-border-subtle p-6">
                {/* Step 1: Resource Info */}
                {step === 0 && (
                    <div className="space-y-5">
                        {/* Type pills */}
                        <div>
                            <label className="block text-sm font-medium text-text-muted mb-2">Resource Type</label>
                            <div className="flex gap-2">
                                {resourceTypes.map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => updateForm('type', t)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${form.type === t
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-surface-hover text-text-muted hover:text-text'
                                            }`}
                                    >
                                        {t}
                                    </button>
                                ))}
                                <button disabled className="px-4 py-2 rounded-lg text-sm text-text-dim bg-surface-hover opacity-50 cursor-not-allowed">
                                    Fiber 🔒
                                </button>
                                <button disabled className="px-4 py-2 rounded-lg text-sm text-text-dim bg-surface-hover opacity-50 cursor-not-allowed">
                                    Spectrum 🔒
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField label="Internal Ref" value={form.internal_ref} onChange={(v) => updateForm('internal_ref', v)} placeholder="e.g. HK-C-2024-001" />

                            {/* Spec with presets */}
                            <div>
                                <label className="block text-sm font-medium text-text-muted mb-1.5">Spec</label>
                                <div className="flex gap-1 mb-1.5 flex-wrap">
                                    {specPresets.map((s) => (
                                        <button
                                            key={s}
                                            onClick={() => { updateForm('spec', s); updateForm('capacity_value', s.replace('G', '').replace('T', '000')) }}
                                            className={`px-2 py-1 rounded text-xs transition-colors cursor-pointer ${form.spec === s ? 'bg-primary text-primary-foreground' : 'bg-surface-hover text-text-muted hover:text-text'
                                                }`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                                <input
                                    type="text"
                                    value={form.spec}
                                    onChange={(e) => updateForm('spec', e.target.value)}
                                    placeholder="Or enter custom spec..."
                                    className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-text-dim"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField label="Capacity Value (G)" value={form.capacity_value} onChange={(v) => updateForm('capacity_value', v)} type="number" placeholder="e.g. 100" />

                            {isCapacity && (
                                <div>
                                    <label className="block text-sm font-medium text-text-muted mb-1.5">Cable System</label>
                                    <select
                                        value={form.cable_system_id}
                                        onChange={(e) => updateForm('cable_system_id', e.target.value)}
                                        className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                    >
                                        <option value="">Select cable system...</option>
                                        {cableSystems.map((cs) => (
                                            <option key={cs.id} value={cs.id}>{cs.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField label="Supplier" value={form.supplier_name} onChange={(v) => updateForm('supplier_name', v)} placeholder="e.g. Telia Carrier" />
                            <div>
                                <label className="block text-sm font-medium text-text-muted mb-1.5">Acquisition Type</label>
                                <select
                                    value={form.acquisition_type}
                                    onChange={(e) => updateForm('acquisition_type', e.target.value)}
                                    className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                >
                                    {acquisitionTypes.map((a) => (
                                        <option key={a} value={a}>{a}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-text-muted mb-1.5">Protection</label>
                                <select
                                    value={form.protection}
                                    onChange={(e) => updateForm('protection', e.target.value)}
                                    className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                >
                                    <option value="Unprotected">Unprotected</option>
                                    <option value="Protected">Protected</option>
                                </select>
                            </div>
                            <FormField label="Contract Ref" value={form.contract_ref} onChange={(v) => updateForm('contract_ref', v)} placeholder="Supplier contract #" />
                        </div>

                        <FormField label="Notes" value={form.notes} onChange={(v) => updateForm('notes', v)} placeholder="Optional notes..." />
                    </div>
                )}

                {/* Step 2: Locations */}
                {step === 1 && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-primary">A-End</h3>
                                <FormField label="Country" value={form.country_a} onChange={(v) => updateForm('country_a', v)} placeholder="e.g. Singapore" />
                            </div>
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-primary">Z-End</h3>
                                <FormField label="Country" value={form.country_z} onChange={(v) => updateForm('country_z', v)} placeholder="e.g. France" />
                            </div>
                        </div>
                        <FormField label="Route Description" value={form.route_description} onChange={(v) => updateForm('route_description', v)} placeholder="e.g. Singapore - Egypt - France via PEACE Cable" />
                    </div>
                )}

                {/* Step 3: Contract & Costs */}
                {step === 2 && (
                    <div className="space-y-5">
                        <div className="grid grid-cols-3 gap-4">
                            <FormField label="Term (Months)" value={form.term_months} onChange={(v) => updateForm('term_months', v)} type="number" placeholder="e.g. 180" />
                            <FormField label="Start Date" value={form.start_date} onChange={(v) => updateForm('start_date', v)} type="date" />
                            <FormField label="End Date (auto)" value={form.end_date} onChange={(v) => updateForm('end_date', v)} type="date" />
                        </div>

                        {/* IRU fields */}
                        {isIRU && (
                            <div className="p-4 rounded-lg border border-border-subtle bg-background">
                                <h3 className="text-sm font-semibold mb-4 text-primary">IRU Financials</h3>
                                <div className="grid grid-cols-3 gap-4">
                                    <FormField label="OTC ($)" value={form.otc} onChange={(v) => updateForm('otc', v)} type="number" placeholder="450000" />
                                    <FormField label="O&M Rate (%)" value={form.om_rate} onChange={(v) => updateForm('om_rate', v)} type="number" placeholder="4.0" />
                                    <FormField label="Annual O&M ($)" value={form.annual_om_cost} onChange={(v) => updateForm('annual_om_cost', v)} type="number" placeholder="Auto-calculated" />
                                </div>
                                <p className="text-xs text-text-dim mt-2">Annual O&M = OTC × Rate%. You can override the calculated value.</p>
                            </div>
                        )}

                        {/* Lease fields */}
                        {isLease && (
                            <div className="p-4 rounded-lg border border-border-subtle bg-background">
                                <h3 className="text-sm font-semibold mb-4 text-primary">Lease Financials</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField label="MRC ($)" value={form.mrc} onChange={(v) => updateForm('mrc', v)} type="number" placeholder="12500" />
                                    <FormField label="NRC ($)" value={form.nrc} onChange={(v) => updateForm('nrc', v)} type="number" placeholder="5000" />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="mt-4 text-destructive text-sm bg-destructive/10 rounded-lg px-3 py-2">
                        {error}
                    </div>
                )}
            </div>

            {/* Navigation buttons */}
            <div className="flex justify-between mt-6">
                <button
                    onClick={() => step > 0 ? setStep(step - 1) : navigate('/inventory')}
                    className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm text-text-muted hover:text-text hover:bg-surface-hover transition-colors cursor-pointer"
                >
                    <ArrowLeft className="h-4 w-4" />
                    {step === 0 ? 'Cancel' : 'Previous'}
                </button>
                {step < steps.length - 1 ? (
                    <button
                        onClick={() => setStep(step + 1)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover text-primary-foreground rounded-lg text-sm font-medium transition-colors cursor-pointer"
                    >
                        Next
                        <ArrowRight className="h-4 w-4" />
                    </button>
                ) : (
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-50 text-primary-foreground rounded-lg text-sm font-medium transition-colors cursor-pointer"
                    >
                        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                        Create Resource
                    </button>
                )}
            </div>
        </div>
    )
}

// Reusable form field
function FormField({
    label,
    value,
    onChange,
    placeholder,
    type = 'text',
}: {
    label: string
    value: string
    onChange: (v: string) => void
    placeholder?: string
    type?: string
}) {
    return (
        <div>
            <label className="block text-sm font-medium text-text-muted mb-1.5">{label}</label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-text-dim"
            />
        </div>
    )
}
