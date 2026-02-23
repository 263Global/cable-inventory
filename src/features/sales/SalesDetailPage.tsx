import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Pencil, Trash2, FileText, Package, ExternalLink, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { fetchSalesOrderById, fetchOrderItems, deleteSalesOrder, deleteOrderItem } from './api'
import type { SalesOrder, SalesOrderItem, SalesStatus } from '@/types'
import { formatCurrency } from '@/lib/utils'

const STATUS_COLORS: Record<SalesStatus, string> = {
    Draft: 'bg-gray-500/15 text-gray-400',
    'Pre-sold': 'bg-amber-500/15 text-amber-400',
    Active: 'bg-emerald-500/15 text-emerald-400',
    Expired: 'bg-red-500/15 text-red-400',
    Terminated: 'bg-red-500/15 text-red-400',
    Cancelled: 'bg-gray-500/15 text-gray-400',
}

export function SalesDetailPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const [order, setOrder] = useState<SalesOrder | null>(null)
    const [items, setItems] = useState<SalesOrderItem[]>([])
    const [loading, setLoading] = useState(true)
    const [deleteTarget, setDeleteTarget] = useState<{ type: 'order' | 'item'; id: string; label: string } | null>(null)
    const [deleting, setDeleting] = useState(false)

    const load = useCallback(async () => {
        if (!id) return
        setLoading(true)
        try {
            const [orderData, itemsData] = await Promise.all([
                fetchSalesOrderById(id),
                fetchOrderItems(id),
            ])
            if (!orderData) { navigate('/sales'); return }
            setOrder(orderData)
            setItems(itemsData)
        } catch (err) {
            console.error(err)
            toast.error('Failed to load order')
        } finally {
            setLoading(false)
        }
    }, [id, navigate])

    useEffect(() => { load() }, [load])

    const handleDeleteConfirm = async () => {
        if (!deleteTarget) return
        setDeleting(true)
        try {
            if (deleteTarget.type === 'order') {
                await deleteSalesOrder(deleteTarget.id)
                toast.success('Order deleted')
                navigate('/sales')
                return
            } else {
                await deleteOrderItem(deleteTarget.id)
                toast.success('Item deleted')
                load()
            }
        } catch (err) {
            console.error(err)
            toast.error('Failed to delete')
        } finally {
            setDeleting(false)
            setDeleteTarget(null)
        }
    }

    if (loading) return (
        <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
    )

    if (!order) return null

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/sales')} className="p-2 rounded-lg hover:bg-surface-hover transition-colors cursor-pointer">
                        <ArrowLeft className="h-5 w-5 text-text-muted" />
                    </button>
                    <FileText className="h-6 w-6 text-primary" />
                    <h1 className="text-xl font-bold font-mono">{order.order_id}</h1>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                        {order.status}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigate(`/sales/${id}/edit`)}
                        className="flex items-center gap-2 px-4 py-2 bg-surface border border-border-subtle rounded-lg text-sm font-medium text-text hover:bg-surface-hover transition-colors cursor-pointer"
                    >
                        <Pencil className="h-4 w-4" /> Edit
                    </button>
                    <button
                        onClick={() => setDeleteTarget({ type: 'order', id: order.id, label: order.order_id })}
                        className="flex items-center gap-2 px-4 py-2 bg-destructive/10 border border-destructive/20 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/20 transition-colors cursor-pointer"
                    >
                        <Trash2 className="h-4 w-4" /> Delete
                    </button>
                </div>
            </div>

            {/* Order Info */}
            <div className="bg-surface rounded-xl border border-border-subtle p-6 mb-6">
                <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-4">Order Information</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div>
                        <span className="text-xs text-text-dim">Customer</span>
                        <p className="text-sm font-medium mt-0.5">{order.customer_name || '—'}</p>
                    </div>
                    <div>
                        <span className="text-xs text-text-dim">Internal Ref</span>
                        <p className="text-sm font-medium mt-0.5">{order.internal_ref || '—'}</p>
                    </div>
                    <div>
                        <span className="text-xs text-text-dim">Created</span>
                        <p className="text-sm font-medium mt-0.5">{new Date(order.created_at).toLocaleDateString()}</p>
                    </div>
                    <div>
                        <span className="text-xs text-text-dim">Updated</span>
                        <p className="text-sm font-medium mt-0.5">{new Date(order.updated_at).toLocaleDateString()}</p>
                    </div>
                </div>
                {order.notes && (
                    <div className="mt-4 pt-4 border-t border-border-subtle">
                        <span className="text-xs text-text-dim">Notes</span>
                        <p className="text-sm mt-1 text-text-muted">{order.notes}</p>
                    </div>
                )}
            </div>

            {/* Line Items */}
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
                                        <div className="flex items-center gap-3">
                                            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                                {item.type}
                                            </span>
                                            {item.disposal_type && (
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-hover text-text-muted">
                                                    {item.disposal_type}
                                                </span>
                                            )}
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[item.status]}`}>
                                                {item.status}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => setDeleteTarget({ type: 'item', id: item.id, label: `${item.type} item` })}
                                            className="p-1 rounded-md hover:bg-destructive/10 text-text-dim hover:text-destructive transition-colors cursor-pointer"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                                        {/* Resource or description */}
                                        {item.resource_id ? (
                                            <div>
                                                <span className="text-xs text-text-dim">Inventory</span>
                                                <Link to={`/inventory/${item.inventory_resource_id}`}
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

                                        {/* Capacity */}
                                        {item.capacity && (
                                            <div>
                                                <span className="text-xs text-text-dim">Capacity</span>
                                                <p className="text-sm font-medium mt-0.5">{item.capacity}G {item.spec || ''}</p>
                                            </div>
                                        )}

                                        {/* Dates */}
                                        {item.start_date && (
                                            <div>
                                                <span className="text-xs text-text-dim">Period</span>
                                                <p className="text-sm mt-0.5">
                                                    {item.start_date} → {item.end_date || '—'}
                                                    {item.term_months && <span className="text-text-dim ml-1">({item.term_months}mo)</span>}
                                                </p>
                                            </div>
                                        )}

                                        {/* Financials */}
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
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Delete Confirmation */}
            <ConfirmDialog
                open={!!deleteTarget}
                title={`Delete ${deleteTarget?.label ?? 'item'}?`}
                message={deleteTarget?.type === 'order'
                    ? 'This will permanently delete this order and all its items.'
                    : 'This will permanently delete this line item.'}
                confirmLabel="Delete"
                variant="danger"
                loading={deleting}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={handleDeleteConfirm}
            />
        </div>
    )
}
