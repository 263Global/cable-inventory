import { useCallback, useEffect, useRef, useState } from 'react'
import type { NavigateFunction } from 'react-router-dom'
import { toast } from 'sonner'
import { fetchOrderItems, fetchSalesOrderById } from '@/features/sales/api'
import {
    fetchAvailableCircuitsForResource,
    fetchSalesFormReferences,
    type AvailableCircuit,
    type SalesFormCustomer,
    type SalesFormResource,
} from '@/features/sales/form-api'
import { mapSalesOrderItemToDraft, type ItemDraft } from '@/features/sales/form-helpers'
import type { SalesStatus } from '@/types'

interface UseSalesFormDataParams {
    id: string | undefined
    isEdit: boolean
    navigate: NavigateFunction
}

export function useSalesFormData({
    id,
    isEdit,
    navigate,
}: UseSalesFormDataParams) {
    const [orderId, setOrderId] = useState('')
    const [internalRef, setInternalRef] = useState('')
    const [customerId, setCustomerId] = useState('')
    const [status, setStatus] = useState<SalesStatus>('Draft')
    const [notes, setNotes] = useState('')
    const [items, setItems] = useState<ItemDraft[]>([])
    const [customers, setCustomers] = useState<SalesFormCustomer[]>([])
    const [resources, setResources] = useState<SalesFormResource[]>([])
    const [circuitsByResource, setCircuitsByResource] = useState<Record<string, AvailableCircuit[]>>({})

    const circuitsByResourceRef = useRef<Record<string, AvailableCircuit[]>>({})
    useEffect(() => {
        circuitsByResourceRef.current = circuitsByResource
    }, [circuitsByResource])

    const loadCircuitsForResource = useCallback(async (resourceId: string) => {
        if (!resourceId || circuitsByResourceRef.current[resourceId]) return

        const mapped = await fetchAvailableCircuitsForResource(resourceId)
        setCircuitsByResource((prev) => {
            if (prev[resourceId]) return prev
            return { ...prev, [resourceId]: mapped }
        })
    }, [])

    useEffect(() => {
        (async () => {
            const { customers: loadedCustomers, resources: loadedResources } = await fetchSalesFormReferences()
            setCustomers(loadedCustomers)
            setResources(loadedResources)
        })().catch((error) => {
            console.error(error)
            toast.error(error instanceof Error ? error.message : 'Failed to load reference data')
        })
    }, [])

    useEffect(() => {
        let cancelled = false
        if (!isEdit || !id) return

        ;(async () => {
            const order = await fetchSalesOrderById(id)
            if (!order) {
                navigate('/sales')
                return
            }
            if (cancelled) return

            setOrderId(order.order_id)
            setInternalRef(order.internal_ref ?? '')
            setCustomerId(order.customer_id ?? '')
            setStatus(order.status)
            setNotes(order.notes ?? '')

            const existingItems = await fetchOrderItems(id)
            if (cancelled) return
            setItems(existingItems.map(mapSalesOrderItemToDraft))

            const resourceIds = [
                ...new Set(
                    existingItems
                        .filter((item) => item.inventory_resource_id)
                        .map((item) => item.inventory_resource_id!),
                ),
            ]
            await Promise.all(resourceIds.map((resourceId) => loadCircuitsForResource(resourceId)))
        })().catch((error) => {
            console.error(error)
            toast.error(error instanceof Error ? error.message : 'Failed to load order')
        })

        return () => {
            cancelled = true
        }
    }, [id, isEdit, loadCircuitsForResource, navigate])

    return {
        orderId,
        setOrderId,
        internalRef,
        setInternalRef,
        customerId,
        setCustomerId,
        status,
        setStatus,
        notes,
        setNotes,
        items,
        setItems,
        customers,
        resources,
        circuitsByResource,
        loadCircuitsForResource,
    }
}
