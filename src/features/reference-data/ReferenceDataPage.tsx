import { useState } from 'react'
import { Database, Cable } from 'lucide-react'
import { fetchLandingStationsWithCables } from '@/lib/reference-api'
import { ReferenceDataTable, type ReferenceColumn, type ReferenceFieldDef } from '@/features/reference-data/ReferenceDataTable'

type AnyRecord = { id: string; [key: string]: unknown }

interface TabConfig {
    table: string
    columns: ReferenceColumn<AnyRecord>[]
    fields: ReferenceFieldDef[]
    emptyMessage: string
    fetchFn?: () => Promise<AnyRecord[]>
}

const cableSystemsConfig: TabConfig = {
    table: 'cable_systems',
    columns: [
        { key: 'name', label: 'Cable System' },
        { key: 'rfs_year', label: 'RFS Year' },
        {
            key: 'status', label: 'Status', render: (item: AnyRecord) => (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.status === 'Active' ? 'bg-status-available/15 text-status-available'
                    : item.status === 'Planned' ? 'bg-info/15 text-info'
                        : 'bg-status-expired/15 text-status-expired'
                    }`}>{String(item.status)}</span>
            ),
        },
        { key: 'owners', label: 'Owners' },
    ],
    fields: [
        { key: 'name', label: 'Cable System Name', required: true, placeholder: 'e.g. PEACE Cable' },
        { key: 'rfs_year', label: 'RFS Year', type: 'number', placeholder: '2024' },
        { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Planned', 'Retired'] },
        { key: 'notes', label: 'Notes', placeholder: 'Optional notes...' },
    ],
    emptyMessage: 'No cable systems found.',
}

const landingStationsConfig: TabConfig = {
    table: 'landing_stations',
    columns: [
        { key: 'name', label: 'Station Name' },
        { key: 'country', label: 'Country' },
        {
            key: 'cable_names', label: 'Connected Cables', render: (item: AnyRecord) => {
                const cables = (item.cable_names as string[]) || []
                if (cables.length === 0) return <span className="text-text-dim">—</span>
                return (
                    <div className="flex items-center gap-1 flex-wrap">
                        <Cable className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="text-xs">
                            {cables.length <= 3 ? cables.join(', ') : `${cables.slice(0, 3).join(', ')} +${cables.length - 3} more`}
                        </span>
                    </div>
                )
            },
        },
    ],
    fields: [
        { key: 'name', label: 'Station Name', required: true, placeholder: 'e.g. Tuas, Singapore' },
        { key: 'country', label: 'Country', required: true, placeholder: 'e.g. Singapore' },
        { key: 'notes', label: 'Notes', placeholder: 'Optional notes...' },
    ],
    emptyMessage: 'No landing stations.',
    fetchFn: fetchLandingStationsWithCables as () => Promise<AnyRecord[]>,
}

const regionColors: Record<string, string> = {
    'Asia': 'bg-red-500/15 text-red-400',
    'Europe': 'bg-blue-500/15 text-blue-400',
    'Africa': 'bg-amber-500/15 text-amber-400',
    'North America': 'bg-green-500/15 text-green-400',
    'South America': 'bg-emerald-500/15 text-emerald-400',
    'Oceania': 'bg-purple-500/15 text-purple-400',
    'Caribbean': 'bg-cyan-500/15 text-cyan-400',
}

const countriesConfig: TabConfig = {
    table: 'countries',
    columns: [
        { key: 'name', label: 'Country Name' },
        { key: 'code', label: 'Code' },
        {
            key: 'region', label: 'Region', render: (item: AnyRecord) => {
                const region = String(item.region ?? '')
                if (!region) return <span className="text-text-dim">—</span>
                return (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${regionColors[region] ?? 'bg-surface-hover text-text-muted'}`}>
                        {region}
                    </span>
                )
            },
        },
    ],
    fields: [
        { key: 'name', label: 'Country Name', required: true, placeholder: 'e.g. Singapore' },
        { key: 'code', label: 'ISO Code (2-letter)', placeholder: 'e.g. SG' },
        { key: 'region', label: 'Region', type: 'select', options: ['Asia', 'Europe', 'Africa', 'North America', 'South America', 'Oceania', 'Caribbean'] },
    ],
    emptyMessage: 'No countries found.',
}

const handoverLocationsConfig: TabConfig = {
    table: 'handover_locations',
    columns: [
        { key: 'name', label: 'Location Name' },
        { key: 'country', label: 'Country' },
        { key: 'city', label: 'City' },
        {
            key: 'type', label: 'Type', render: (item: AnyRecord) => (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-info/15 text-info">{String(item.type)}</span>
            ),
        },
    ],
    fields: [
        { key: 'name', label: 'Location Name', required: true, placeholder: 'e.g. Equinix SG3' },
        { key: 'country', label: 'Country', required: true, placeholder: 'e.g. Singapore' },
        { key: 'city', label: 'City', placeholder: 'e.g. Singapore' },
        { key: 'address', label: 'Address', placeholder: 'Physical address' },
        { key: 'type', label: 'Type', type: 'select', options: ['PoP', 'Data Center', 'Exchange', 'Other'] },
        { key: 'notes', label: 'Notes', placeholder: 'Optional notes...' },
    ],
    emptyMessage: 'No handover locations.',
}

const interfaceTypesConfig: TabConfig = {
    table: 'interface_types',
    columns: [
        { key: 'name', label: 'Interface Type' },
        { key: 'description', label: 'Description' },
    ],
    fields: [
        { key: 'name', label: 'Type Name', required: true, placeholder: 'e.g. 400GE' },
        { key: 'description', label: 'Description', placeholder: 'e.g. 400 Gigabit Ethernet' },
    ],
    emptyMessage: 'No interface types.',
}

const tabs: Array<{ id: string; label: string; config: TabConfig }> = [
    { id: 'cable_systems', label: 'Cable Systems', config: cableSystemsConfig },
    { id: 'landing_stations', label: 'Landing Stations', config: landingStationsConfig },
    { id: 'countries', label: 'Countries', config: countriesConfig },
    { id: 'handover_locations', label: 'Handover Locations', config: handoverLocationsConfig },
    { id: 'interface_types', label: 'Interface Types', config: interfaceTypesConfig },
]

export function ReferenceDataPage() {
    const [activeTab, setActiveTab] = useState(tabs[0].id)
    const activeConfig = tabs.find((tab) => tab.id === activeTab)!.config

    return (
        <div>
            <div className="flex items-center gap-3 mb-8">
                <Database className="h-7 w-7 text-primary" />
                <h1 className="text-2xl font-bold">Reference Data</h1>
            </div>

            <div className="flex gap-1 mb-6 border-b border-border-subtle overflow-x-auto">
                {tabs.map((tab) => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer border-b-2 whitespace-nowrap ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text'
                            }`}>{tab.label}</button>
                ))}
            </div>

            <ReferenceDataTable
                key={activeTab}
                table={activeConfig.table}
                columns={activeConfig.columns}
                fields={activeConfig.fields}
                emptyMessage={activeConfig.emptyMessage}
                fetchFn={activeConfig.fetchFn}
            />
        </div>
    )
}
