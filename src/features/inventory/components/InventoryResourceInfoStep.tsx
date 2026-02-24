import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { InventoryFormField } from '@/features/inventory/components/InventoryFormField'
import type { AcquisitionType, CostMode, ResourceType } from '@/types'
import type {
    CableSystemOption,
    InventoryFormState,
    SupplierOption,
} from '@/features/inventory/inventory-form-types'

const resourceTypes: ResourceType[] = ['Capacity', 'Terrestrial']
const acquisitionTypes: AcquisitionType[] = ['IRU', 'Lease', 'Swap-In', 'Owned']
const costModes: CostMode[] = ['Single', 'Base+Batch']
const specPresets = ['10G', '40G', '100G', '200G', '400G', '800G', '1.6T']

interface InventoryResourceInfoStepProps {
    form: InventoryFormState
    isBatchMode: boolean
    cableSystems: CableSystemOption[]
    suppliers: SupplierOption[]
    onUpdateForm: (key: keyof InventoryFormState, value: string) => void
    onSpecPresetSelect: (spec: string) => void
    onSpecInputChange: (spec: string) => void
}

export function InventoryResourceInfoStep({
    form,
    isBatchMode,
    cableSystems,
    suppliers,
    onUpdateForm,
    onSpecPresetSelect,
    onSpecInputChange,
}: InventoryResourceInfoStepProps) {
    return (
        <div className="space-y-5">
            <div>
                <label className="block text-sm font-medium text-text-muted mb-2">Resource Type</label>
                <div className="flex gap-2">
                    {resourceTypes.map((type) => (
                        <button
                            key={type}
                            onClick={() => onUpdateForm('type', type)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${form.type === type ? 'bg-primary text-primary-foreground' : 'bg-surface-hover text-text-muted hover:text-text'}`}
                        >
                            {type}
                        </button>
                    ))}
                    <button disabled className="px-4 py-2 rounded-lg text-sm text-text-dim bg-surface-hover opacity-50 cursor-not-allowed">Fiber 🔒</button>
                    <button disabled className="px-4 py-2 rounded-lg text-sm text-text-dim bg-surface-hover opacity-50 cursor-not-allowed">Spectrum 🔒</button>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-text-muted mb-2">Cost Mode</label>
                <div className="flex gap-2">
                    {costModes.map((mode) => (
                        <button
                            key={mode}
                            onClick={() => onUpdateForm('cost_mode', mode)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${form.cost_mode === mode ? 'bg-primary text-primary-foreground' : 'bg-surface-hover text-text-muted hover:text-text'}`}
                        >
                            {mode}
                        </button>
                    ))}
                </div>
                {isBatchMode && (
                    <p className="text-xs text-info mt-2">
                        ℹ Base = total unlit capacity purchased. Batches = portions lit over time.
                    </p>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <InventoryFormField
                    label="Internal Ref"
                    value={form.internal_ref}
                    onChange={(value) => onUpdateForm('internal_ref', value)}
                    placeholder="e.g. HK-C-2024-001"
                />
                <div>
                    <label className="block text-sm font-medium text-text-muted mb-1.5">Spec</label>
                    <div className="flex gap-1 mb-1.5 flex-wrap">
                        {specPresets.map((preset) => (
                            <button
                                key={preset}
                                onClick={() => onSpecPresetSelect(preset)}
                                className={`px-2 py-1 rounded text-xs transition-colors cursor-pointer ${form.spec === preset ? 'bg-primary text-primary-foreground' : 'bg-surface-hover text-text-muted hover:text-text'}`}
                            >
                                {preset}
                            </button>
                        ))}
                    </div>
                    <input
                        type="text"
                        value={form.spec}
                        onChange={(event) => onSpecInputChange(event.target.value)}
                        placeholder="Or enter custom spec (e.g. 300G, 1.6T)..."
                        className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-text-dim"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <InventoryFormField
                    label={isBatchMode ? 'Base Capacity (Total, Unlit)' : 'Capacity Value'}
                    value={form.capacity_value}
                    onChange={(value) => onUpdateForm('capacity_value', value)}
                    type="number"
                    placeholder="e.g. 1000"
                />
                {form.type !== 'Terrestrial' && (
                    <div>
                        <label className="block text-sm font-medium text-text-muted mb-1.5">Cable System</label>
                        <SearchableSelect
                            options={cableSystems.map((cable) => ({
                                value: cable.id,
                                label: cable.name,
                                sublabel: cable.status,
                            }))}
                            value={form.cable_system_id}
                            onChange={(value) => {
                                onUpdateForm('cable_system_id', value)
                                onUpdateForm('country_a', '')
                                onUpdateForm('country_z', '')
                                onUpdateForm('landing_station_a_id', '')
                                onUpdateForm('landing_station_z_id', '')
                            }}
                            placeholder="Search cable system..."
                        />
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-text-muted mb-1.5">Supplier</label>
                    <SearchableSelect
                        options={suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name }))}
                        value={form.supplier_id}
                        onChange={(value) => onUpdateForm('supplier_id', value)}
                        placeholder="Search supplier..."
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-muted mb-1.5">Acquisition Type</label>
                    <div className="flex gap-2 flex-wrap">
                        {acquisitionTypes.map((acquisitionType) => (
                            <button
                                key={acquisitionType}
                                onClick={() => onUpdateForm('acquisition_type', acquisitionType)}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${form.acquisition_type === acquisitionType ? 'bg-primary text-primary-foreground' : 'bg-surface-hover text-text-muted hover:text-text'}`}
                            >
                                {acquisitionType}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-text-muted mb-1.5">Protection</label>
                    <div className="flex gap-2">
                        {['Protected', 'Unprotected'].map((protection) => (
                            <button
                                key={protection}
                                onClick={() => onUpdateForm('protection', protection)}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${form.protection === protection ? 'bg-primary text-primary-foreground' : 'bg-surface-hover text-text-muted hover:text-text'}`}
                            >
                                {protection}
                            </button>
                        ))}
                    </div>
                </div>
                <InventoryFormField
                    label="Contract Ref"
                    value={form.contract_ref}
                    onChange={(value) => onUpdateForm('contract_ref', value)}
                    placeholder="e.g. CTR-2024-001"
                />
            </div>

            <InventoryFormField
                label="Notes"
                value={form.notes}
                onChange={(value) => onUpdateForm('notes', value)}
                placeholder="Optional notes..."
            />
        </div>
    )
}
