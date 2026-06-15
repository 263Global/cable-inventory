import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { InventoryFormField } from '@/features/inventory/components/InventoryFormField'
import type {
    HandoverLocationOption,
    InventoryFormState,
    StationOption,
} from '@/features/inventory/inventory-form-types'

interface InventoryLocationsStepProps {
    form: InventoryFormState
    countriesA: string[]
    countriesZ: string[]
    stationsA: StationOption[]
    stationsZ: StationOption[]
    handoverLocations: HandoverLocationOption[]
    onUpdateForm: (key: keyof InventoryFormState, value: string) => void
}

export function InventoryLocationsStep({
    form,
    countriesA,
    countriesZ,
    stationsA,
    stationsZ,
    handoverLocations,
    onUpdateForm,
}: InventoryLocationsStepProps) {
    // Delivery often happens at the landing station, not just at a data center,
    // so include landing stations in the Handover dropdown for all resource types.
    const filteredHandovers = handoverLocations

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-primary border-b border-border-subtle pb-2">A-End</h3>
                    {form.type !== 'Terrestrial' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-text-muted mb-1.5">Country</label>
                                <SearchableSelect
                                    options={countriesA.map((country) => ({ value: country, label: country }))}
                                    value={form.country_a}
                                    onChange={(value) => onUpdateForm('country_a', value)}
                                    placeholder={form.cable_system_id ? 'Select country...' : 'Select cable first'}
                                    disabled={!form.cable_system_id}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-muted mb-1.5">Landing Station</label>
                                <SearchableSelect
                                    options={stationsA.map((station) => ({ value: station.id, label: station.name }))}
                                    value={form.landing_station_a_id}
                                    onChange={(value) => onUpdateForm('landing_station_a_id', value)}
                                    placeholder={form.country_a ? 'Select station...' : 'Select country first'}
                                    disabled={!form.country_a}
                                />
                            </div>
                        </>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-text-muted mb-1.5">Handover Location</label>
                        <SearchableSelect
                            options={filteredHandovers.map((handover) => ({
                                value: handover.id,
                                label: handover.name,
                                sublabel: `${handover.city || ''}, ${handover.country}`,
                                group: handover.type || 'Other',
                            }))}
                            value={form.handover_location_a_id}
                            onChange={(value) => onUpdateForm('handover_location_a_id', value)}
                            placeholder="Search all locations..."
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-primary border-b border-border-subtle pb-2">Z-End</h3>
                    {form.type !== 'Terrestrial' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-text-muted mb-1.5">Country</label>
                                <SearchableSelect
                                    options={countriesZ.map((country) => ({ value: country, label: country }))}
                                    value={form.country_z}
                                    onChange={(value) => onUpdateForm('country_z', value)}
                                    placeholder={form.cable_system_id ? 'Select country...' : 'Select cable first'}
                                    disabled={!form.cable_system_id}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-muted mb-1.5">Landing Station</label>
                                <SearchableSelect
                                    options={stationsZ.map((station) => ({ value: station.id, label: station.name }))}
                                    value={form.landing_station_z_id}
                                    onChange={(value) => onUpdateForm('landing_station_z_id', value)}
                                    placeholder={form.country_z ? 'Select station...' : 'Select country first'}
                                    disabled={!form.country_z}
                                />
                            </div>
                        </>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-text-muted mb-1.5">Handover Location</label>
                        <SearchableSelect
                            options={filteredHandovers.map((handover) => ({
                                value: handover.id,
                                label: handover.name,
                                sublabel: `${handover.city || ''}, ${handover.country}`,
                                group: handover.type || 'Other',
                            }))}
                            value={form.handover_location_z_id}
                            onChange={(value) => onUpdateForm('handover_location_z_id', value)}
                            placeholder="Search all locations..."
                        />
                    </div>
                </div>
            </div>

            <InventoryFormField
                label="Route Description"
                value={form.route_description}
                onChange={(value) => onUpdateForm('route_description', value)}
                placeholder="e.g. Singapore - Egypt - France via PEACE Cable"
            />
        </div>
    )
}
