import type { ReactNode } from 'react'
import { formatCurrency } from '@/lib/utils'
import type { InventoryResource } from '@/types'
import {
    resourceStatusBadgeClass,
    resourceStatusLabel,
    resourceTypeBadgeClass,
} from '@/lib/status-styles'

export const inventoryTypeTabs: Array<{ label: string; filter: string }> = [
    { label: 'All', filter: 'All' },
    { label: 'Capacity', filter: 'Capacity' },
    { label: 'Terrestrial', filter: 'Terrestrial' },
    { label: 'Fiber', filter: 'Fiber' },
    { label: 'Spectrum', filter: 'Spectrum' },
]

export interface ColumnDef {
    key: string
    label: string
    group: string
    defaultVisible: boolean
    minWidth?: string
    render: (item: InventoryResource) => ReactNode
}

function renderCapacityBar({ used, total }: { used: number; total: number }) {
    if (!total) return <span className="text-text-dim text-xs">—</span>
    const pct = Math.min((used / total) * 100, 100)
    const color = pct >= 100 ? 'bg-status-full' : 'bg-status-partial'

    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-surface-hover rounded-full overflow-hidden min-w-[80px]">
                <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-text-muted whitespace-nowrap">
                {used}/{total}G ({Math.round(pct)}%)
            </span>
        </div>
    )
}

export const inventoryAllColumns: ColumnDef[] = [
    {
        key: 'resource_id', label: 'Resource ID', group: 'Basic', defaultVisible: true,
        render: (item) => (
            <span className="text-sm font-medium">{item.resource_id}</span>
        ),
    },
    {
        key: 'internal_ref', label: 'Internal Ref', group: 'Basic', defaultVisible: false,
        render: (item) => <span className="text-sm font-mono text-text-muted">{item.internal_ref ?? '—'}</span>,
    },
    {
        key: 'type', label: 'Type', group: 'Basic', defaultVisible: true,
        render: (item) => <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${resourceTypeBadgeClass[item.type]}`}>{item.type}</span>,
    },
    {
        key: 'cable_system', label: 'Cable System', group: 'Basic', defaultVisible: true,
        render: (item) => <span className="text-sm">{item.cable_system_name ?? '—'}</span>,
    },
    {
        key: 'spec', label: 'Spec', group: 'Basic', defaultVisible: true,
        render: (item) => <span className="text-sm font-medium">{item.spec ?? '—'}</span>,
    },
    {
        key: 'route', label: 'Route', group: 'Location', defaultVisible: true,
        render: (item) => <span className="text-sm text-text-muted">{`${item.country_a || '—'} → ${item.country_z || '—'}`}</span>,
    },
    {
        key: 'status', label: 'Status', group: 'Basic', defaultVisible: true,
        render: (item) => <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${resourceStatusBadgeClass[item.status]}`}>{resourceStatusLabel[item.status] || item.status}</span>,
    },
    {
        key: 'capacity', label: 'Capacity Usage', group: 'Basic', defaultVisible: true, minWidth: '200px',
        render: (item) => renderCapacityBar({ used: Number(item.used_capacity ?? 0), total: Number(item.total_capacity ?? 0) }),
    },
    {
        key: 'supplier', label: 'Supplier', group: 'Basic', defaultVisible: false,
        render: (item) => <span className="text-sm">{item.supplier_name ?? '—'}</span>,
    },
    {
        key: 'acquisition_type', label: 'Acquisition', group: 'Contract', defaultVisible: false,
        render: (item) => <span className="text-sm">{item.acquisition_type}</span>,
    },
    {
        key: 'cost_mode', label: 'Cost Mode', group: 'Contract', defaultVisible: false,
        render: (item) => <span className="text-sm">{item.cost_mode}</span>,
    },
    {
        key: 'protection', label: 'Protection', group: 'Basic', defaultVisible: false,
        render: (item) => <span className="text-sm">{item.protection}</span>,
    },
    {
        key: 'contract_ref', label: 'Contract Ref', group: 'Contract', defaultVisible: false,
        render: (item) => <span className="text-sm text-text-muted">{item.contract_ref ?? '—'}</span>,
    },
    {
        key: 'start_date', label: 'Start Date', group: 'Contract', defaultVisible: false,
        render: (item) => <span className="text-sm">{item.start_date ?? '—'}</span>,
    },
    {
        key: 'end_date', label: 'End Date', group: 'Contract', defaultVisible: false,
        render: (item) => <span className="text-sm">{item.end_date ?? '—'}</span>,
    },
    {
        key: 'term_months', label: 'Term', group: 'Contract', defaultVisible: false,
        render: (item) => <span className="text-sm">{item.term_months ? `${item.term_months}mo` : '—'}</span>,
    },
    {
        key: 'otc', label: 'OTC', group: 'Financial', defaultVisible: false,
        render: (item) => <span className="text-sm">{item.otc ? formatCurrency(Number(item.otc)) : '—'}</span>,
    },
    {
        key: 'annual_om', label: 'Annual O&M', group: 'Financial', defaultVisible: false,
        render: (item) => <span className="text-sm">{item.annual_om_cost ? formatCurrency(Number(item.annual_om_cost)) : '—'}</span>,
    },
    {
        key: 'mrc', label: 'MRC', group: 'Financial', defaultVisible: false,
        render: (item) => <span className="text-sm">{item.mrc ? formatCurrency(Number(item.mrc)) : '—'}</span>,
    },
    {
        key: 'nrc', label: 'NRC', group: 'Financial', defaultVisible: false,
        render: (item) => <span className="text-sm">{item.nrc ? formatCurrency(Number(item.nrc)) : '—'}</span>,
    },
    {
        key: 'landing_a', label: 'Station A', group: 'Location', defaultVisible: false,
        render: (item) => <span className="text-sm text-text-muted">{item.landing_station_a_name ?? '—'}</span>,
    },
    {
        key: 'landing_z', label: 'Station Z', group: 'Location', defaultVisible: false,
        render: (item) => <span className="text-sm text-text-muted">{item.landing_station_z_name ?? '—'}</span>,
    },
    {
        key: 'handover_a', label: 'Handover A', group: 'Location', defaultVisible: false,
        render: (item) => <span className="text-sm text-text-muted">{item.handover_a_name ?? '—'}</span>,
    },
    {
        key: 'handover_z', label: 'Handover Z', group: 'Location', defaultVisible: false,
        render: (item) => <span className="text-sm text-text-muted">{item.handover_z_name ?? '—'}</span>,
    },
]

export const INVENTORY_COLUMN_STORAGE_KEY = 'inventory-visible-columns'
export const inventoryDefaultColumns = inventoryAllColumns.filter((column) => column.defaultVisible).map((column) => column.key)
export const inventoryAllColumnKeys = inventoryAllColumns.map((column) => column.key)
export const inventoryColumnGroups = Array.from(new Set(inventoryAllColumns.map((column) => column.group)))

export interface InventoryPageFilters {
    status: string[]
    acquisition: string[]
    protection: string[]
    costMode: string[]
}

export const emptyInventoryFilters: InventoryPageFilters = {
    status: [],
    acquisition: [],
    protection: [],
    costMode: [],
}

export const inventoryStatusFilterOptions = ['Available', 'Partially Used', 'Fully Used', 'Expired', 'Terminated']
export const inventoryAcquisitionFilterOptions = ['IRU', 'Lease', 'Swap-In', 'Owned']
export const inventoryProtectionFilterOptions = ['Protected', 'Unprotected']
export const inventoryCostModeFilterOptions = ['Single', 'Base+Batch']
