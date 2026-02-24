import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
    ArrowLeft, Pencil, Trash2, FileText, Package, ExternalLink, Loader2,
    Ban, XCircle, RefreshCw, History, AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
    fetchSalesOrderById, fetchOrderItems, deleteSalesOrder, deleteOrderItem,
    cancelSalesOrder, terminateSalesOrder, renewSalesOrder,
} from './api'
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

    // Modal states
    const [terminateOpen, setTerminateOpen] = useState(false)
    const [cancelOpen, setCancelOpen] = useState(false)
    const [renewOpen, setRenewOpen] = useState(false)

    // Terminate / Cancel form
    const [terminateDate, setTerminateDate] = useState(new Date().toISOString().split('T')[0])
    const [terminateReason, setTerminateReason] = useState('')
    const [actionLoading, setActionLoading] = useState(false)

    // Renew form
    const [renewItems, setRenewItems] = useState<{
        itemId: string; label: string; selected: boolean;
        startDate: string; termMonths: number; endDate: string;
        mrc: number; nrc: number;
    }[]>([])

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

    // ─── Cancel (Pre-sold → Cancelled) ───
    const handleCancel = async () => {
        if (!id) return
        setActionLoading(true)
        try {
            await cancelSalesOrder(id, terminateReason)
            toast.success('Order cancelled')
            setCancelOpen(false)
            setTerminateReason('')
            load()
        } catch (err) {
            console.error(err)
            toast.error('Failed to cancel order')
        } finally {
            setActionLoading(false)
        }
    }

    // ─── Terminate (Active → Terminated) ───
    const handleTerminate = async () => {
        if (!id) return
        setActionLoading(true)
        try {
            await terminateSalesOrder(id, terminateDate, terminateReason)
            toast.success('Order terminated')
            setTerminateOpen(false)
            setTerminateReason('')
            load()
        } catch (err) {
            console.error(err)
            toast.error('Failed to terminate order')
        } finally {
            setActionLoading(false)
        }
    }

    // ─── Renew helpers ───
    const renewableItems = useMemo(() =>
        items.filter(i =>
            i.disposal_type === 'Lease Out' || i.disposal_type === 'Swap Out'
        ), [items])

    const canRenew = useMemo(() =>
        order && ['Active', 'Expired'].includes(order.status) && renewableItems.length > 0,
        [order, renewableItems])

    function calcEndDate(start: string, months: number): string {
        const d = new Date(start)
        d.setMonth(d.getMonth() + months)
        d.setDate(d.getDate() - 1)
        return d.toISOString().split('T')[0]
    }

    const openRenewModal = () => {
        setRenewItems(renewableItems.map(item => {
            const newStart = item.end_date
                ? (() => { const d = new Date(item.end_date); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0] })()
                : new Date().toISOString().split('T')[0]
            const term = item.term_months ?? 12
            return {
                itemId: item.id,
                label: `${item.type}${item.resource_id ? ` (${item.resource_id})` : item.description ? ` — ${item.description}` : ''}`,
                selected: true,
                startDate: newStart,
                termMonths: term,
                endDate: calcEndDate(newStart, term),
                mrc: Number(item.sell_mrc ?? 0),
                nrc: 0,
            }
        }))
        setRenewOpen(true)
    }

    const updateRenewItem = (idx: number, field: string, value: string | number) => {
        setRenewItems(prev => {
            const next = [...prev]
            const item = { ...next[idx], [field]: value }
            if (field === 'startDate' || field === 'termMonths') {
                item.endDate = calcEndDate(
                    field === 'startDate' ? value as string : item.startDate,
                    field === 'termMonths' ? value as number : item.termMonths,
                )
            }
            next[idx] = item
            return next
        })
    }

    const handleRenew = async () => {
        if (!id) return
        setActionLoading(true)
        try {
            await renewSalesOrder(id, renewItems.filter(r => r.selected).map(r => ({
                itemId: r.itemId,
                startDate: r.startDate,
                termMonths: r.termMonths,
                endDate: r.endDate,
                mrc: r.mrc || null,
                nrc: r.nrc || null,
            })))
            toast.success('Order renewed successfully')
            setRenewOpen(false)
            load()
        } catch (err) {
            console.error(err)
            toast.error('Failed to renew order')
        } finally {
            setActionLoading(false)
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
                    {/* Cancel — Pre-sold only */}
                    {order.status === 'Pre-sold' && (
                        <button
                            onClick={() => setCancelOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm font-medium text-amber-400 hover:bg-amber-500/20 transition-colors cursor-pointer"
                        >
                            <XCircle className="h-4 w-4" /> Cancel
                        </button>
                    )}
                    {/* Terminate — Active only */}
                    {order.status === 'Active' && (
                        <button
                            onClick={() => setTerminateOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
                        >
                            <Ban className="h-4 w-4" /> Terminate
                        </button>
                    )}
                    {/* Renew — Active/Expired + has Lease Out or Swap Out items */}
                    {canRenew && (
                        <button
                            onClick={openRenewModal}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                        >
                            <RefreshCw className="h-4 w-4" /> Renew
                        </button>
                    )}
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

            {/* Expired order reminder */}
            {order.status === 'Expired' && !order.terminated_at && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
                    <div className="flex-1">
                        <p className="text-sm font-medium text-amber-400">此订单已到期，资源尚未释放</p>
                        <p className="text-xs text-text-muted mt-1">请确认客户是否续约。如不续约，请终止订单以释放电路和容量。</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        {canRenew && (
                            <button onClick={openRenewModal} className="px-3 py-1.5 text-xs font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-colors cursor-pointer">
                                续约 Renew
                            </button>
                        )}
                        <button onClick={() => setTerminateOpen(true)} className="px-3 py-1.5 text-xs font-medium bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors cursor-pointer">
                            终止 Terminate
                        </button>
                    </div>
                </div>
            )}

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

            {/* Termination Info */}
            {order.terminated_at && (
                <div className="bg-red-500/5 rounded-xl border border-red-500/20 p-6 mb-6">
                    <h2 className="text-sm font-medium text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        {order.status === 'Cancelled' ? 'Cancellation' : 'Termination'} Info
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                            <span className="text-xs text-text-dim">Date</span>
                            <p className="text-sm font-medium mt-0.5">{order.terminated_at}</p>
                        </div>
                        <div className="col-span-2">
                            <span className="text-xs text-text-dim">Reason</span>
                            <p className="text-sm mt-0.5 text-text-muted">{order.termination_reason || '—'}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Renewal History */}
            {order.renewal_history && order.renewal_history.length > 0 && (
                <div className="bg-surface rounded-xl border border-border-subtle p-6 mb-6">
                    <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                        <History className="h-4 w-4" />
                        Renewal History ({order.renewal_history.length})
                    </h2>
                    <div className="space-y-3">
                        {[...order.renewal_history].reverse().map((snap, idx) => {
                            const s = snap as unknown as Record<string, unknown>
                            const snapItems = (s.items as Record<string, unknown>[]) ?? []
                            return (
                                <div key={idx} className="bg-background rounded-lg border border-border-subtle p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs text-text-dim">
                                            Renewed on {new Date(String(s.renewed_at)).toLocaleDateString()}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLORS[(s.old_status as SalesStatus) ?? 'Draft']}`}>
                                            was {s.old_status as string}
                                        </span>
                                    </div>
                                    {snapItems.map((si, j) => (
                                        <div key={j} className="text-xs text-text-muted mt-1">
                                            {String(si.old_start_date ?? '—')} → {String(si.old_end_date ?? '—')}
                                            {si.old_term_months ? <span className="ml-1">({Number(si.old_term_months)}mo)</span> : null}
                                            {si.old_mrc != null ? <span className="ml-2">MRC: {formatCurrency(Number(si.old_mrc))}</span> : null}
                                        </div>
                                    ))}
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

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
                                        <div className="flex items-center gap-3 flex-wrap">
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

                                        {/* Capacity + Spec */}
                                        <div>
                                            <span className="text-xs text-text-dim">Capacity</span>
                                            <p className="text-sm font-medium mt-0.5">
                                                {item.capacity ? `${item.capacity}G` : '—'}
                                                {item.spec && <span className="text-text-dim ml-1">({item.spec})</span>}
                                            </p>
                                        </div>

                                        {/* Contract Period */}
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
                                                {!item.sell_otc && !item.sell_mrc && !item.sell_nrc && <p className="text-text-dim">—</p>}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Allocated Circuits */}
                                    {item.allocated_circuits && item.allocated_circuits.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-border-subtle">
                                            <span className="text-xs text-text-dim">Allocated Circuits</span>
                                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                {item.allocated_circuits.map((c) => (
                                                    <span key={c.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-mono">
                                                        #{c.circuit_number} {c.capacity}G {c.interface_type_name || ''}
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

            {/* ─── Delete Confirmation ─── */}
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

            {/* ─── Cancel Modal (Pre-sold) ─── */}
            {cancelOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setCancelOpen(false)}>
                    <div className="bg-surface rounded-xl border border-border-subtle p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
                            <XCircle className="h-5 w-5 text-amber-400" /> Cancel Order
                        </h3>
                        <p className="text-sm text-text-muted mb-4">
                            This will cancel <span className="font-medium text-text">{order.order_id}</span> and release any allocated circuits.
                        </p>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-text-dim block mb-1">Reason (optional)</label>
                                <textarea
                                    value={terminateReason}
                                    onChange={e => setTerminateReason(e.target.value)}
                                    placeholder="e.g. Customer withdrew before service start"
                                    className="w-full bg-background border border-border-subtle rounded-lg px-3 py-2 text-sm resize-none h-20"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                            <button onClick={() => setCancelOpen(false)} className="px-4 py-2 text-sm rounded-lg hover:bg-surface-hover transition-colors cursor-pointer">
                                Back
                            </button>
                            <button
                                onClick={handleCancel}
                                disabled={actionLoading}
                                className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg text-sm font-medium hover:bg-amber-500/20 transition-colors cursor-pointer disabled:opacity-50"
                            >
                                {actionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                                Confirm Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Terminate Modal (Active) ─── */}
            {terminateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setTerminateOpen(false)}>
                    <div className="bg-surface rounded-xl border border-border-subtle p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
                            <Ban className="h-5 w-5 text-red-400" /> Terminate Order
                        </h3>
                        <p className="text-sm text-text-muted mb-4">
                            This will terminate <span className="font-medium text-text">{order.order_id}</span>, release allocated circuits, and recalculate capacity.
                        </p>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-text-dim block mb-1">Termination Date</label>
                                <input
                                    type="date"
                                    value={terminateDate}
                                    onChange={e => setTerminateDate(e.target.value)}
                                    className="w-full bg-background border border-border-subtle rounded-lg px-3 py-2 text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-text-dim block mb-1">Reason (optional)</label>
                                <textarea
                                    value={terminateReason}
                                    onChange={e => setTerminateReason(e.target.value)}
                                    placeholder="e.g. SLA breach, customer request"
                                    className="w-full bg-background border border-border-subtle rounded-lg px-3 py-2 text-sm resize-none h-20"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                            <button onClick={() => setTerminateOpen(false)} className="px-4 py-2 text-sm rounded-lg hover:bg-surface-hover transition-colors cursor-pointer">
                                Back
                            </button>
                            <button
                                onClick={handleTerminate}
                                disabled={actionLoading}
                                className="flex items-center gap-2 px-4 py-2 bg-destructive text-white rounded-lg text-sm font-medium hover:bg-destructive/90 transition-colors cursor-pointer disabled:opacity-50"
                            >
                                {actionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                                Confirm Terminate
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Renew Modal ─── */}
            {renewOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setRenewOpen(false)}>
                    <div className="bg-surface rounded-xl border border-border-subtle p-6 w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
                            <RefreshCw className="h-5 w-5 text-emerald-400" /> Renew Order
                        </h3>
                        <p className="text-sm text-text-muted mb-4">
                            Renewing <span className="font-medium text-text">{order.order_id}</span> — only Lease Out / Swap Out items shown.
                        </p>
                        <div className="space-y-4">
                            {renewItems.map((r, idx) => (
                                <div key={r.itemId} className={`bg-background rounded-lg border ${r.selected ? 'border-border-subtle' : 'border-border-subtle/50 opacity-50'} p-4 transition-opacity`}>
                                    <label className="flex items-center gap-2 mb-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={r.selected}
                                            onChange={() => setRenewItems(prev => prev.map((item, i) => i === idx ? { ...item, selected: !item.selected } : item))}
                                            className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                                        />
                                        <span className="text-sm font-medium">{r.label}</span>
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs text-text-dim block mb-1">Start Date</label>
                                            <input
                                                type="date"
                                                value={r.startDate}
                                                onChange={e => updateRenewItem(idx, 'startDate', e.target.value)}
                                                className="w-full bg-surface border border-border-subtle rounded-lg px-3 py-2 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-text-dim block mb-1">Term (months)</label>
                                            <input
                                                type="number"
                                                min={1}
                                                value={r.termMonths}
                                                onChange={e => updateRenewItem(idx, 'termMonths', parseInt(e.target.value) || 1)}
                                                className="w-full bg-surface border border-border-subtle rounded-lg px-3 py-2 text-sm"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="text-xs text-text-dim block mb-1">End Date</label>
                                            <input
                                                type="date"
                                                value={r.endDate}
                                                readOnly
                                                className="w-full bg-surface border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-dim"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-text-dim block mb-1">MRC</label>
                                            <input
                                                type="number"
                                                min={0} step={0.01}
                                                value={r.mrc}
                                                onChange={e => updateRenewItem(idx, 'mrc', parseFloat(e.target.value) || 0)}
                                                className="w-full bg-surface border border-border-subtle rounded-lg px-3 py-2 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-text-dim block mb-1">NRC</label>
                                            <input
                                                type="number"
                                                min={0} step={0.01}
                                                value={r.nrc}
                                                onChange={e => updateRenewItem(idx, 'nrc', parseFloat(e.target.value) || 0)}
                                                className="w-full bg-surface border border-border-subtle rounded-lg px-3 py-2 text-sm"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                            <button onClick={() => setRenewOpen(false)} className="px-4 py-2 text-sm rounded-lg hover:bg-surface-hover transition-colors cursor-pointer">
                                Back
                            </button>
                            <button
                                onClick={handleRenew}
                                disabled={actionLoading || !renewItems.some(r => r.selected)}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-sm font-medium hover:bg-emerald-500/20 transition-colors cursor-pointer disabled:opacity-50"
                            >
                                {actionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                                Confirm Renew
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
