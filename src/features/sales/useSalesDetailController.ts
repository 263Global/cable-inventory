import { useCallback, useEffect, useMemo, useState } from 'react'
import type { NavigateFunction } from 'react-router-dom'
import { toast } from 'sonner'
import { calcEndDateFromTerm, todayDateOnly } from '@/lib/contract-utils'
import {
    cancelSalesOrder,
    deleteOrderItem,
    deleteSalesOrder,
    fetchOrderItems,
    fetchSalesOrderById,
    renewSalesOrder,
    terminateSalesOrder,
} from '@/features/sales/api'
import type { SalesOrder, SalesOrderItem } from '@/types'
import {
    createReleaseItems,
    createRenewItems,
    createTerminateItems,
    type ReleaseItemDraft,
    type RenewItemDraft,
    type TerminateItemDraft,
} from '@/features/sales/sales-detail-helpers'

interface DeleteTarget {
    type: 'order' | 'item'
    id: string
    label: string
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message
    if (error && typeof error === 'object' && 'message' in error) {
        return String((error as { message?: unknown }).message)
    }
    return 'Unknown error'
}

export function useSalesDetailController(id: string | undefined, navigate: NavigateFunction) {
    const [order, setOrder] = useState<SalesOrder | null>(null)
    const [items, setItems] = useState<SalesOrderItem[]>([])
    const [loading, setLoading] = useState(true)
    const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
    const [deleting, setDeleting] = useState(false)

    const [terminateOpen, setTerminateOpen] = useState(false)
    const [cancelOpen, setCancelOpen] = useState(false)
    const [renewOpen, setRenewOpen] = useState(false)
    const [releaseOpen, setReleaseOpen] = useState(false)

    const [terminateDate, setTerminateDate] = useState(todayDateOnly())
    const [terminateReason, setTerminateReason] = useState('')
    const [actionLoading, setActionLoading] = useState(false)
    const [terminateItems, setTerminateItems] = useState<TerminateItemDraft[]>([])
    const [renewItems, setRenewItems] = useState<RenewItemDraft[]>([])
    const [releaseItems, setReleaseItems] = useState<ReleaseItemDraft[]>([])

    const load = useCallback(async () => {
        if (!id) return
        setLoading(true)
        try {
            const [orderData, itemsData] = await Promise.all([
                fetchSalesOrderById(id),
                fetchOrderItems(id),
            ])
            if (!orderData) {
                navigate('/sales')
                return
            }
            setOrder(orderData)
            setItems(itemsData)
        } catch (err) {
            console.error(err)
            toast.error('Failed to load order')
        } finally {
            setLoading(false)
        }
    }, [id, navigate])

    useEffect(() => {
        load()
    }, [load])

    const renewableItems = useMemo(
        () => items.filter((item) => item.disposal_type === 'Lease Out' || item.disposal_type === 'Swap Out'),
        [items]
    )

    const canRenew = useMemo(
        () => Boolean(order && ['Active', 'Expired'].includes(order.status) && renewableItems.length > 0),
        [order, renewableItems]
    )

    const handleDeleteConfirm = async () => {
        if (!deleteTarget) return
        setDeleting(true)
        try {
            if (deleteTarget.type === 'order') {
                await deleteSalesOrder(deleteTarget.id)
                toast.success('Order deleted')
                navigate('/sales')
                return
            }
            await deleteOrderItem(deleteTarget.id)
            toast.success('Item deleted')
            load()
        } catch (err) {
            console.error(err)
            toast.error(`Failed to delete: ${getErrorMessage(err)}`)
        } finally {
            setDeleting(false)
            setDeleteTarget(null)
        }
    }

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

    const openTerminateModal = () => {
        setTerminateItems(createTerminateItems(items))
        setTerminateOpen(true)
    }

    const handleTerminate = async () => {
        if (!id) return
        setActionLoading(true)
        try {
            await terminateSalesOrder(
                id,
                terminateDate,
                terminateReason,
                terminateItems.map((item) => ({
                    itemId: item.itemId,
                    selected: item.selected,
                    terminationFee: item.fee,
                })),
            )
            toast.success(terminateItems.every((item) => item.selected) ? 'Order terminated' : 'Selected items terminated')
            setTerminateOpen(false)
            setTerminateReason('')
            load()
        } catch (err) {
            console.error(err)
            toast.error('Failed to terminate')
        } finally {
            setActionLoading(false)
        }
    }

    const openReleaseModal = () => {
        setReleaseItems(createReleaseItems(items))
        setReleaseOpen(true)
    }

    const handleRelease = async () => {
        if (!id) return
        setActionLoading(true)
        try {
            await terminateSalesOrder(
                id,
                todayDateOnly(),
                '合同到期释放',
                releaseItems.map((item) => ({
                    itemId: item.itemId,
                    selected: item.selected,
                    terminationFee: 0,
                })),
            )
            toast.success('资源已释放')
            setReleaseOpen(false)
            load()
        } catch (err) {
            console.error(err)
            toast.error('Failed to release')
        } finally {
            setActionLoading(false)
        }
    }

    const openRenewModal = () => {
        setRenewItems(createRenewItems(renewableItems))
        setRenewOpen(true)
    }

    const updateRenewItem = (idx: number, field: string, value: string | number) => {
        setRenewItems((prev) => {
            const next = [...prev]
            const item = { ...next[idx], [field]: value }
            if (field === 'startDate' || field === 'termMonths') {
                item.endDate = calcEndDateFromTerm(
                    field === 'startDate' ? (value as string) : item.startDate,
                    field === 'termMonths' ? (value as number) : item.termMonths,
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
            await renewSalesOrder(
                id,
                renewItems
                    .filter((item) => item.selected)
                    .map((item) => ({
                        itemId: item.itemId,
                        startDate: item.startDate,
                        termMonths: item.termMonths,
                        endDate: item.endDate,
                        mrc: item.mrc || null,
                        nrc: item.nrc || null,
                    })),
            )
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

    return {
        order,
        items,
        loading,
        deleteTarget,
        deleting,
        terminateOpen,
        cancelOpen,
        renewOpen,
        releaseOpen,
        terminateDate,
        terminateReason,
        actionLoading,
        terminateItems,
        renewItems,
        releaseItems,
        canRenew,
        setDeleteTarget,
        setTerminateOpen,
        setCancelOpen,
        setRenewOpen,
        setReleaseOpen,
        setTerminateDate,
        setTerminateReason,
        setTerminateItems,
        setRenewItems,
        setReleaseItems,
        handleDeleteConfirm,
        handleCancel,
        openTerminateModal,
        handleTerminate,
        openReleaseModal,
        handleRelease,
        openRenewModal,
        updateRenewItem,
        handleRenew,
    }
}
