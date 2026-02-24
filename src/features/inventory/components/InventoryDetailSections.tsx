import { Link } from 'react-router-dom'
import {
    AlertTriangle,
    Calendar,
    DollarSign,
    ExternalLink,
    FileText,
    History,
    MapPin,
    Shield,
    ShieldOff,
} from 'lucide-react'
import type { InventoryRenewalSnapshot, InventoryResource } from '@/types'
import type { LinkedSalesItem } from '@/features/inventory/api'
import { formatCurrency } from '@/lib/utils'
import { salesStatusBadgeClass } from '@/lib/status-styles'

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
    return (
        <div>
            <p className="text-xs text-text-dim">{label}</p>
            <p className="text-sm font-medium mt-0.5">{value ?? '—'}</p>
        </div>
    )
}

export function ResourceSummaryCard({
    resource,
    isBatchMode,
    totalCap,
}: {
    resource: InventoryResource
    isBatchMode: boolean
    totalCap: number
}) {
    return (
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
    )
}

export function LocationsCard({ resource }: { resource: InventoryResource }) {
    return (
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
    )
}

export function LinkedSalesCard({
    linkedSales,
    totalCapacity,
}: {
    linkedSales: LinkedSalesItem[]
    totalCapacity: number | null
}) {
    if (linkedSales.length === 0) return null

    return (
        <div className="bg-surface rounded-xl border border-border-subtle p-6">
            <div className="flex items-center gap-2 mb-4">
                <FileText className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">
                    Linked Sales ({linkedSales.length})
                </h2>
            </div>

            {totalCapacity && (() => {
                const activeUsed = linkedSales
                    .filter((s) => s.order_status === 'Active' || s.order_status === 'Pre-sold')
                    .reduce((sum, s) => sum + (s.capacity ?? 0), 0)
                const draftUsed = linkedSales
                    .filter((s) => s.order_status === 'Draft')
                    .reduce((sum, s) => sum + (s.capacity ?? 0), 0)
                const activePct = Math.min((activeUsed / totalCapacity) * 100, 100)
                const draftPct = Math.min((draftUsed / totalCapacity) * 100, 100 - activePct)
                return (
                    <div className="mb-4">
                        <div className="flex justify-between text-xs text-text-dim mb-1">
                            <span>Allocated: {activeUsed}G / {totalCapacity}G</span>
                            {draftUsed > 0 && <span className="text-gray-500">+ {draftUsed}G draft</span>}
                        </div>
                        <div className="h-2 bg-background rounded-full overflow-hidden">
                            <div className="h-full flex">
                                <div className="bg-status-partial h-full" style={{ width: `${activePct}%` }} />
                                <div className="bg-gray-600 h-full" style={{ width: `${draftPct}%` }} />
                            </div>
                        </div>
                    </div>
                )
            })()}

            <div className="space-y-2">
                {linkedSales.map((sale) => (
                    <Link
                        key={sale.id}
                        to={`/sales/${sale.sales_order_id}`}
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
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${salesStatusBadgeClass[sale.order_status as keyof typeof salesStatusBadgeClass] ?? ''}`}>
                                {sale.order_status}
                            </span>
                            <ExternalLink className="h-3.5 w-3.5 text-text-dim" />
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    )
}

export function ContractFinancialsCard({
    resource,
    isBatchMode,
    isIRU,
    isLease,
}: {
    resource: InventoryResource
    isBatchMode: boolean
    isIRU: boolean
    isLease: boolean
}) {
    return (
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
    )
}

export function TerminationInfoCard({ resource }: { resource: InventoryResource }) {
    if (!resource.terminated_at) return null

    return (
        <div className="bg-red-500/5 rounded-xl border border-red-500/20 p-6">
            <h2 className="text-sm font-medium text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Termination Info
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                    <span className="text-xs text-text-dim">Terminated On</span>
                    <p className="text-sm font-medium mt-0.5">{resource.terminated_at}</p>
                </div>
                <div className="col-span-2">
                    <span className="text-xs text-text-dim">Reason</span>
                    <p className="text-sm mt-0.5 text-text-muted">{resource.termination_reason || '—'}</p>
                </div>
            </div>
        </div>
    )
}

function renewalSnapshotTitleDate(renewedAt: string) {
    const parsed = new Date(renewedAt)
    return Number.isNaN(parsed.getTime()) ? renewedAt : parsed.toLocaleDateString()
}

export function RenewalHistoryCard({ renewalHistory }: { renewalHistory: InventoryRenewalSnapshot[] | null }) {
    if (!renewalHistory || renewalHistory.length === 0) return null

    return (
        <div className="bg-surface rounded-xl border border-border-subtle p-6">
            <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                <History className="h-4 w-4" /> Renewal History ({renewalHistory.length})
            </h2>
            <div className="space-y-3">
                {[...renewalHistory].reverse().map((snap, idx) => {
                    const key = `${snap.renewed_at}-${idx}`
                    return (
                        <div key={key} className="bg-background rounded-lg border border-border-subtle p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-text-dim">
                                    Renewed on {renewalSnapshotTitleDate(snap.renewed_at)}
                                </span>
                                <span className="text-xs text-text-muted">was {snap.old_status}</span>
                            </div>
                            <div className="text-xs text-text-muted mt-1">
                                {snap.old_start_date ?? '—'} → {snap.old_end_date ?? '—'}
                                {snap.old_term_months ? <span className="ml-1">({snap.old_term_months}mo)</span> : null}
                                {snap.old_mrc != null ? <span className="ml-2">MRC: {formatCurrency(Number(snap.old_mrc))}</span> : null}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
