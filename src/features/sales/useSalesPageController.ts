import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useClickOutside } from '@/hooks/useClickOutside'
import { usePersistentColumnVisibility } from '@/hooks/usePersistentColumnVisibility'
import { deleteSalesOrder, fetchSalesOrders, syncOrderStatuses } from '@/features/sales/api'
import {
    salesAllColumnKeys,
    salesAllColumns,
    SALES_COLUMN_STORAGE_KEY,
    salesColumnGroups,
    salesDefaultColumns,
} from '@/features/sales/sales-page-config'
import type { SalesOrder, SalesStatus } from '@/types'

export function useSalesPageController() {
    const [orders, setOrders] = useState<SalesOrder[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<SalesStatus[]>([])
    const [showFilters, setShowFilters] = useState(false)
    const [showColPicker, setShowColPicker] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<SalesOrder | null>(null)
    const [deleting, setDeleting] = useState(false)

    const { visibleKeys, toggleKey, reset } = usePersistentColumnVisibility({
        storageKey: SALES_COLUMN_STORAGE_KEY,
        allKeys: salesAllColumnKeys,
        defaultKeys: salesDefaultColumns,
    })

    const pickerRef = useClickOutside<HTMLDivElement>(showColPicker, () => setShowColPicker(false))
    const filterRef = useClickOutside<HTMLDivElement>(showFilters, () => setShowFilters(false))

    const activeColumns = useMemo(
        () => salesAllColumns.filter((column) => visibleKeys.includes(column.key)),
        [visibleKeys],
    )

    const loadOrders = useCallback(async () => {
        setLoading(true)
        try {
            const transitioned = await syncOrderStatuses()
            if (transitioned > 0) {
                toast.info(`${transitioned} order(s) auto-transitioned`)
            }

            const data = await fetchSalesOrders()
            setOrders(data)
        } catch (error) {
            console.error(error)
            toast.error('Failed to load sales orders')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadOrders()
    }, [loadOrders])

    const filteredOrders = useMemo(() => {
        return orders.filter((order) => {
            const query = search.toLowerCase()
            const matchesSearch =
                !query ||
                order.order_id.toLowerCase().includes(query) ||
                (order.internal_ref ?? '').toLowerCase().includes(query) ||
                (order.customer_name ?? '').toLowerCase().includes(query) ||
                (order.notes ?? '').toLowerCase().includes(query)

            const matchesStatus = statusFilter.length === 0 || statusFilter.includes(order.status)
            return matchesSearch && matchesStatus
        })
    }, [orders, search, statusFilter])

    const activeFilterCount = statusFilter.length

    const toggleStatusFilter = useCallback((status: SalesStatus) => {
        setStatusFilter((prev) =>
            prev.includes(status) ? prev.filter((value) => value !== status) : [...prev, status],
        )
    }, [])

    const clearStatusFilter = useCallback(() => {
        setStatusFilter([])
    }, [])

    const confirmDeleteOrder = useCallback(async () => {
        if (!deleteTarget) return

        setDeleting(true)
        try {
            await deleteSalesOrder(deleteTarget.id)
            toast.success(`${deleteTarget.order_id} deleted`)
            await loadOrders()
        } catch (error) {
            console.error(error)
            toast.error('Failed to delete')
        } finally {
            setDeleting(false)
            setDeleteTarget(null)
        }
    }, [deleteTarget, loadOrders])

    return {
        orders,
        loading,
        search,
        statusFilter,
        showFilters,
        showColPicker,
        deleteTarget,
        deleting,
        visibleKeys,
        filterRef,
        pickerRef,
        activeColumns,
        filteredOrders,
        activeFilterCount,
        columnGroups: salesColumnGroups,
        setSearch,
        setShowFilters,
        setShowColPicker,
        setDeleteTarget,
        toggleKey,
        reset,
        toggleStatusFilter,
        clearStatusFilter,
        loadOrders,
        confirmDeleteOrder,
    }
}
