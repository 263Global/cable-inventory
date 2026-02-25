import type { ReactNode } from 'react'
import { formatCurrency } from '@/lib/utils'
import { salesStatusBadgeClass } from '@/lib/status-styles'
import type { SalesOrder, SalesStatus } from '@/types'

export interface SalesColumnDef {
    key: string
    label: string
    group: string
    defaultVisible: boolean
    render: (item: SalesOrder) => ReactNode
}

export const salesAllStatuses: SalesStatus[] = [
    'Draft',
    'Pre-sold',
    'Active',
    'Expired',
    'Terminated',
    'Cancelled',
]

export const salesAllColumns: SalesColumnDef[] = [
    {
        key: 'order_id',
        label: 'Order ID',
        group: 'Basic',
        defaultVisible: true,
        render: (item) => <span className="font-mono text-primary font-medium">{item.order_id}</span>,
    },
    {
        key: 'internal_ref',
        label: 'Internal Ref',
        group: 'Basic',
        defaultVisible: true,
        render: (item) => <span className="text-text-muted">{item.internal_ref || '—'}</span>,
    },
    {
        key: 'customer',
        label: 'Customer',
        group: 'Basic',
        defaultVisible: true,
        render: (item) => <span>{item.customer_name || '—'}</span>,
    },
    {
        key: 'status',
        label: 'Status',
        group: 'Basic',
        defaultVisible: true,
        render: (item) => (
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${salesStatusBadgeClass[item.status]}`}>
                {item.status}
            </span>
        ),
    },
    {
        key: 'created_at',
        label: 'Created',
        group: 'Basic',
        defaultVisible: true,
        render: (item) => (
            <span className="text-text-muted">{new Date(item.created_at).toLocaleDateString()}</span>
        ),
    },
    {
        key: 'updated_at',
        label: 'Updated',
        group: 'Basic',
        defaultVisible: false,
        render: (item) => (
            <span className="text-text-muted">{new Date(item.updated_at).toLocaleDateString()}</span>
        ),
    },
    {
        key: 'notes',
        label: 'Notes',
        group: 'Basic',
        defaultVisible: false,
        render: (item) => (
            <span className="text-text-muted text-sm truncate max-w-[200px] block">{item.notes || '—'}</span>
        ),
    },
    {
        key: 'total_mrc',
        label: 'Total MRC',
        group: 'Revenue',
        defaultVisible: false,
        render: (item) => <span className="text-sm">{item.total_mrc != null ? formatCurrency(item.total_mrc) : '—'}</span>,
    },
    {
        key: 'total_otc',
        label: 'Total OTC',
        group: 'Revenue',
        defaultVisible: false,
        render: (item) => <span className="text-sm">{item.total_otc != null ? formatCurrency(item.total_otc) : '—'}</span>,
    },
    {
        key: 'total_nrc',
        label: 'Total NRC',
        group: 'Revenue',
        defaultVisible: false,
        render: (item) => <span className="text-sm">{item.total_nrc != null ? formatCurrency(item.total_nrc) : '—'}</span>,
    },
    {
        key: 'total_annual_om',
        label: 'Total Annual O&M',
        group: 'Revenue',
        defaultVisible: false,
        render: (item) => <span className="text-sm">{item.total_annual_om != null ? formatCurrency(item.total_annual_om) : '—'}</span>,
    },
]

export const SALES_COLUMN_STORAGE_KEY = 'sales-visible-columns'
export const salesDefaultColumns = salesAllColumns
    .filter((column) => column.defaultVisible)
    .map((column) => column.key)
export const salesAllColumnKeys = salesAllColumns.map((column) => column.key)
export const salesColumnGroups = Array.from(new Set(salesAllColumns.map((column) => column.group)))
