import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useClickOutside } from '@/hooks/useClickOutside'
import {
    checkResourceDeletable,
    deleteInventoryResource,
    fetchInventoryResources,
} from '@/features/inventory/api'
import {
    emptyInventoryFilters,
    INVENTORY_COLUMN_STORAGE_KEY,
    inventoryAllColumnKeys,
    inventoryAllColumns,
    inventoryColumnGroups,
    inventoryDefaultColumns,
    type InventoryPageFilters,
} from '@/features/inventory/inventory-page-config'
import { usePersistentColumnVisibility } from '@/hooks/usePersistentColumnVisibility'
import type { InventoryResource } from '@/types'

export function useInventoryPageController() {
    const [activeTab, setActiveTab] = useState('All')
    const [data, setData] = useState<InventoryResource[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [showColPicker, setShowColPicker] = useState(false)
    const [showFilters, setShowFilters] = useState(false)
    const [filters, setFilters] = useState<InventoryPageFilters>(emptyInventoryFilters)
    const [deleteTarget, setDeleteTarget] = useState<InventoryResource | null>(null)
    const [deleteMessage, setDeleteMessage] = useState('')
    const [deleting, setDeleting] = useState(false)

    const { visibleKeys, toggleKey, reset } = usePersistentColumnVisibility({
        storageKey: INVENTORY_COLUMN_STORAGE_KEY,
        allKeys: inventoryAllColumnKeys,
        defaultKeys: inventoryDefaultColumns,
    })

    const pickerRef = useClickOutside<HTMLDivElement>(showColPicker, () => setShowColPicker(false))
    const filterRef = useClickOutside<HTMLDivElement>(showFilters, () => setShowFilters(false))

    const toggleFilter = useCallback((group: keyof InventoryPageFilters, value: string) => {
        setFilters((prev) => ({
            ...prev,
            [group]: prev[group].includes(value)
                ? prev[group].filter((item) => item !== value)
                : [...prev[group], value],
        }))
    }, [])

    const clearFilters = useCallback(() => {
        setFilters({ ...emptyInventoryFilters })
    }, [])

    const activeFilterCount = useMemo(
        () => filters.status.length + filters.acquisition.length + filters.protection.length + filters.costMode.length,
        [filters],
    )

    const activeColumns = useMemo(
        () => inventoryAllColumns.filter((column) => visibleKeys.includes(column.key)),
        [visibleKeys],
    )

    const loadData = useCallback(async () => {
        try {
            setLoading(true)
            const filter = activeTab === 'All' ? undefined : activeTab
            const result = await fetchInventoryResources(filter)
            setData(result)
        } catch (error) {
            console.error('Failed to load inventory:', error)
            toast.error('Failed to load inventory')
        } finally {
            setLoading(false)
        }
    }, [activeTab])

    useEffect(() => {
        loadData()
    }, [loadData])

    const filteredData = useMemo(() => {
        return data.filter((item) => {
            if (search) {
                const query = search.toLowerCase()
                const matched =
                    item.resource_id.toLowerCase().includes(query) ||
                    (item.internal_ref ?? '').toLowerCase().includes(query) ||
                    (item.cable_system_name ?? '').toLowerCase().includes(query) ||
                    (item.spec ?? '').toLowerCase().includes(query) ||
                    (item.country_a ?? '').toLowerCase().includes(query) ||
                    (item.country_z ?? '').toLowerCase().includes(query) ||
                    (item.supplier_name ?? '').toLowerCase().includes(query) ||
                    (item.contract_ref ?? '').toLowerCase().includes(query)
                if (!matched) return false
            }

            if (filters.status.length > 0 && !filters.status.includes(item.status)) return false
            if (filters.acquisition.length > 0 && !filters.acquisition.includes(item.acquisition_type)) return false
            if (filters.protection.length > 0 && !filters.protection.includes(item.protection)) return false
            if (filters.costMode.length > 0 && !filters.costMode.includes(item.cost_mode)) return false
            return true
        })
    }, [data, search, filters])

    const requestDeleteResource = useCallback(async (resource: InventoryResource) => {
        const check = await checkResourceDeletable(resource.id)
        if (check.status === 'blocked') {
            toast.error(`Cannot delete - linked to active orders: ${check.activeOrders.join(', ')}`)
            return
        }

        if (check.status === 'warn') {
            setDeleteMessage(`This resource is linked to orders: ${check.otherOrders.join(', ')}. Deleting will remove these associations.`)
        } else {
            setDeleteMessage('This will permanently delete the resource and all its batches and circuits.')
        }
        setDeleteTarget(resource)
    }, [])

    const confirmDeleteResource = useCallback(async () => {
        if (!deleteTarget) return

        setDeleting(true)
        try {
            await deleteInventoryResource(deleteTarget.id)
            toast.success(`${deleteTarget.resource_id} deleted`)
            await loadData()
        } catch (error) {
            console.error(error)
            toast.error('Failed to delete')
        } finally {
            setDeleting(false)
            setDeleteTarget(null)
        }
    }, [deleteTarget, loadData])

    return {
        activeTab,
        data,
        loading,
        search,
        showColPicker,
        showFilters,
        filters,
        deleteTarget,
        deleteMessage,
        deleting,
        visibleKeys,
        activeFilterCount,
        activeColumns,
        filteredData,
        columnGroups: inventoryColumnGroups,
        pickerRef,
        filterRef,
        setActiveTab,
        setSearch,
        setShowColPicker,
        setShowFilters,
        setDeleteTarget,
        toggleKey,
        reset,
        toggleFilter,
        clearFilters,
        requestDeleteResource,
        confirmDeleteResource,
    }
}
