import { Link } from 'react-router-dom'
import { Ban, ExternalLink, Package, Trash2 } from 'lucide-react'
import { salesStatusBadgeClass } from '@/lib/status-styles'
import { formatCurrency } from '@/lib/utils'
import type { SalesOrderItem } from '@/types'

interface SalesLineItemsCardProps {
    items: SalesOrderItem[]
    onDeleteItem: (item: SalesOrderItem) => void
}

export function SalesLineItemsCard({
    items,
    onDeleteItem,
}: SalesLineItemsCardProps) {
    return (
        <div className="bg-surface rounded-xl border border-border-subtle p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Line Items ({items.length})
                </h2>
            </div>

            {items.length === 0 ? (
                <p className="text-center text-text-dim py-8">No items. Edit this order to add items.</p>
            ) : (
                <div className="space-y-3">
                    {items.map((item) => {
                        const isIRU = item.disposal_type === 'IRU Out' || item.disposal_type === 'Swap Out'
                        return (
                            <div key={item.id} className="bg-background rounded-lg border border-border-subtle p-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                            {item.type}
                                        </span>
                                        {item.disposal_type && (
                                            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-hover text-text-muted">
                                                {item.disposal_type}
                                            </span>
                                        )}
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${salesStatusBadgeClass[item.status]}`}>
                                            {item.status}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => onDeleteItem(item)}
                                        className="p-1 rounded-md hover:bg-destructive/10 text-text-dim hover:text-destructive transition-colors cursor-pointer"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                                    {item.resource_id ? (
                                        <div>
                                            <span className="text-xs text-text-dim">Inventory</span>
                                            <Link
                                                to={`/inventory/${item.inventory_resource_id}`}
                                                className="flex items-center gap-1 text-sm text-primary hover:underline mt-0.5"
                                            >
                                                {item.resource_id} <ExternalLink className="h-3 w-3" />
                                            </Link>
                                            {item.cable_system_name && (
                                                <p className="text-xs text-text-dim">{item.cable_system_name}</p>
                                            )}
                                        </div>
                                    ) : item.description ? (
                                        <div>
                                            <span className="text-xs text-text-dim">Description</span>
                                            <p className="text-sm mt-0.5">{item.description}</p>
                                        </div>
                                    ) : null}

                                    <div>
                                        <span className="text-xs text-text-dim">Capacity</span>
                                        <p className="text-sm font-medium mt-0.5">
                                            {item.capacity ? `${item.capacity}G` : '—'}
                                            {item.spec && <span className="text-text-dim ml-1">({item.spec})</span>}
                                        </p>
                                    </div>

                                    <div>
                                        <span className="text-xs text-text-dim">Period</span>
                                        <p className="text-sm mt-0.5">
                                            {item.start_date ? (
                                                <>
                                                    {item.start_date} → {item.end_date || '—'}
                                                    {item.term_months && <span className="text-text-dim ml-1">({item.term_months}mo)</span>}
                                                </>
                                            ) : '—'}
                                        </p>
                                    </div>

                                    <div>
                                        <span className="text-xs text-text-dim">Revenue</span>
                                        <div className="text-sm mt-0.5 space-y-0.5">
                                            {isIRU ? (
                                                <>
                                                    {item.sell_otc != null && <p>OTC: {formatCurrency(item.sell_otc)}</p>}
                                                    {item.sell_annual_om != null && <p>O&M: {formatCurrency(item.sell_annual_om)}/yr</p>}
                                                </>
                                            ) : (
                                                <>
                                                    {item.sell_mrc != null && <p>MRC: {formatCurrency(item.sell_mrc)}</p>}
                                                </>
                                            )}
                                            {item.sell_nrc != null && item.sell_nrc > 0 && <p>NRC: {formatCurrency(item.sell_nrc)}</p>}
                                            {!item.sell_otc && !item.sell_mrc && !item.sell_nrc && <p className="text-text-dim">—</p>}
                                        </div>
                                    </div>
                                </div>

                                {item.terminated_at && (
                                    <div className="mt-3 pt-3 border-t border-red-500/20 flex items-center gap-4 text-sm">
                                        <span className="text-red-400 text-xs font-medium flex items-center gap-1">
                                            <Ban className="h-3 w-3" /> Terminated {item.terminated_at}
                                        </span>
                                        {item.termination_fee != null && item.termination_fee > 0 && (
                                            <span className="text-xs text-text-muted">
                                                ETF: {formatCurrency(item.termination_fee)}
                                            </span>
                                        )}
                                    </div>
                                )}

                                {item.allocated_circuits && item.allocated_circuits.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-border-subtle">
                                        <span className="text-xs text-text-dim">Allocated Circuits</span>
                                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                                            {item.allocated_circuits.map((circuit) => (
                                                <span key={circuit.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-mono">
                                                    #{circuit.circuit_number} {circuit.capacity}G {circuit.interface_type_name || ''}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
