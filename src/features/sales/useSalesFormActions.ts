import { useCallback } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { NavigateFunction } from 'react-router-dom'
import { toast } from 'sonner'
import { calcEndDateFromTerm, calculateAnnualOm, parsePositiveInt } from '@/lib/contract-utils'
import {
    allocateCircuits,
    createOrderItem,
    createSalesOrder,
    deallocateCircuits,
    deleteOrderItem,
    fetchOrderItems,
    recalcInventoryCapacity,
    updateOrderItem,
    updateSalesOrder,
} from '@/features/sales/api'
import type { SalesFormResource } from '@/features/sales/form-api'
import {
    buildOrderItemPayload,
    createEmptyItemDraft,
    type ItemDraft,
} from '@/features/sales/form-helpers'
import { SALES_FIELD_CONFIG } from '@/features/sales/sales-form-config'
import type { SalesStatus } from '@/types'

interface UseSalesFormActionsParams {
    id: string | undefined
    isEdit: boolean
    navigate: NavigateFunction
    customerId: string
    internalRef: string
    status: SalesStatus
    notes: string
    items: ItemDraft[]
    resources: SalesFormResource[]
    circuitsByResource: Record<string, { id: string; capacity: number }[]>
    setStep: Dispatch<SetStateAction<number>>
    setSaving: Dispatch<SetStateAction<boolean>>
    setOrderId: Dispatch<SetStateAction<string>>
    setItems: Dispatch<SetStateAction<ItemDraft[]>>
    loadCircuitsForResource: (resourceId: string) => Promise<void>
}

export function useSalesFormActions({
    id,
    isEdit,
    navigate,
    customerId,
    internalRef,
    status,
    notes,
    items,
    resources,
    circuitsByResource,
    setStep,
    setSaving,
    setOrderId,
    setItems,
    loadCircuitsForResource,
}: UseSalesFormActionsParams) {
    const addItem = useCallback(() => {
        setItems((prev) => [...prev, createEmptyItemDraft()])
    }, [setItems])

    const removeItem = useCallback((uiId: string) => {
        setItems((prev) => prev.filter((item) => item.ui_id !== uiId))
    }, [setItems])

    const toggleCircuit = useCallback((uiId: string, circuitId: string) => {
        setItems((prev) =>
            prev.map((item) => {
                if (item.ui_id !== uiId) return item

                const selected = item.selectedCircuitIds.includes(circuitId)
                    ? item.selectedCircuitIds.filter((idValue) => idValue !== circuitId)
                    : [...item.selectedCircuitIds, circuitId]

                const circuits = circuitsByResource[item.inventory_resource_id] ?? []
                const totalCap = circuits
                    .filter((circuit) => selected.includes(circuit.id))
                    .reduce((sum, circuit) => sum + circuit.capacity, 0)

                // Remove override when circuit deselected
                const overrides = { ...item.circuitInterfaceOverrides }
                if (!selected.includes(circuitId)) delete overrides[circuitId]

                return { ...item, selectedCircuitIds: selected, capacity: totalCap.toString(), circuitInterfaceOverrides: overrides }
            }),
        )
    }, [circuitsByResource, setItems])

    const updateCircuitInterface = useCallback((uiId: string, circuitId: string, newTypeId: string) => {
        setItems((prev) =>
            prev.map((item) => {
                if (item.ui_id !== uiId) return item
                const overrides = { ...item.circuitInterfaceOverrides }
                if (newTypeId) {
                    overrides[circuitId] = newTypeId
                } else {
                    delete overrides[circuitId]
                }
                return { ...item, circuitInterfaceOverrides: overrides }
            }),
        )
    }, [setItems])

    const updateItem = useCallback((uiId: string, field: keyof ItemDraft, value: string) => {
        setItems((prev) =>
            prev.map((item) => {
                if (item.ui_id !== uiId) return item

                const updated = { ...item, [field]: value }

                if ((field === 'sell_otc' || field === 'sell_om_rate') && updated.sell_otc && updated.sell_om_rate) {
                    const otc = parseFloat(updated.sell_otc) || 0
                    const rate = parseFloat(updated.sell_om_rate) || 0
                    updated.sell_annual_om = calculateAnnualOm(otc, rate).toFixed(2)
                }

                if ((field === 'start_date' || field === 'term_months') && updated.start_date && updated.term_months) {
                    updated.end_date = calcEndDateFromTerm(updated.start_date, parsePositiveInt(updated.term_months))
                }

                if (field === 'type') {
                    const cfg = SALES_FIELD_CONFIG[value] ?? SALES_FIELD_CONFIG['Other']
                    if (!cfg.resource) {
                        updated.inventory_resource_id = ''
                        updated.selectedCircuitIds = []
                        updated.existingCircuitIds = []
                    }
                    if (!cfg.capacity) {
                        updated.capacity = ''
                        updated.spec = ''
                    }
                    if (!cfg.disposal) {
                        updated.disposal_type = value === 'Cross-Connect' ? 'Lease Out' : 'IRU Out'
                    }
                    if (!cfg.term) {
                        updated.term_months = ''
                        updated.end_date = ''
                    }
                    if (!cfg.mrc) {
                        updated.sell_mrc = ''
                        updated.sell_otc = ''
                        updated.sell_om_rate = ''
                        updated.sell_annual_om = ''
                    }
                }

                return updated
            }),
        )
    }, [setItems])

    const updateItemResource = useCallback((uiId: string, resourceId: string) => {
        const resource = resources.find((item) => item.id === resourceId)
        setItems((prev) =>
            prev.map((item) =>
                item.ui_id === uiId
                    ? {
                        ...item,
                        inventory_resource_id: resourceId,
                        spec: resource?.spec || item.spec,
                        selectedCircuitIds: [],
                        existingCircuitIds: [],
                        capacity: '',
                    }
                    : item,
            ),
        )
        if (resourceId) void loadCircuitsForResource(resourceId)
    }, [loadCircuitsForResource, resources, setItems])

    const handleSave = useCallback(async () => {
        if (!customerId) {
            toast.error('Please select a customer')
            setStep(1)
            return
        }

        setSaving(true)
        try {
            let salesOrderId = id

            if (isEdit && id) {
                await updateSalesOrder(id, { customer_id: customerId, internal_ref: internalRef, status, notes })

                const existing = await fetchOrderItems(id)
                const existingIds = new Set(items.filter((item) => item.id).map((item) => item.id!))
                for (const existingItem of existing) {
                    if (!existingIds.has(existingItem.id)) {
                        await deleteOrderItem(existingItem.id)
                    }
                }
            } else {
                const createdOrder = await createSalesOrder({
                    internal_ref: internalRef || undefined,
                    customer_id: customerId,
                    status,
                    notes,
                })
                salesOrderId = createdOrder.id
                setOrderId(createdOrder.order_id)
            }

            if (!salesOrderId) {
                throw new Error('Missing order id while saving')
            }

            const affectedResourceIds = new Set<string>()
            for (const item of items) {
                const payload = buildOrderItemPayload(item, salesOrderId)
                let itemId = item.id

                if (item.id && isEdit) {
                    await updateOrderItem(item.id, payload)
                } else {
                    const createdItem = await createOrderItem(payload)
                    itemId = createdItem.id
                }

                if (itemId && item.inventory_resource_id) {
                    affectedResourceIds.add(item.inventory_resource_id)
                    if (item.existingCircuitIds.length > 0) {
                        await deallocateCircuits(itemId)
                    }
                    if (item.selectedCircuitIds.length > 0) {
                        const overrides = Object.keys(item.circuitInterfaceOverrides).length > 0
                            ? item.circuitInterfaceOverrides
                            : undefined
                        await allocateCircuits(itemId, item.selectedCircuitIds, status, overrides, salesOrderId)
                    }
                }
            }

            await Promise.all([...affectedResourceIds].map(recalcInventoryCapacity))
            toast.success(isEdit ? 'Order updated' : 'Order created')
            navigate(`/sales/${salesOrderId}`)
        } catch (error) {
            console.error(error)
            toast.error(error instanceof Error ? error.message : 'Failed to save')
        } finally {
            setSaving(false)
        }
    }, [
        customerId,
        id,
        internalRef,
        isEdit,
        items,
        navigate,
        notes,
        setOrderId,
        setSaving,
        setStep,
        status,
    ])

    return {
        addItem,
        removeItem,
        toggleCircuit,
        updateCircuitInterface,
        updateItem,
        updateItemResource,
        handleSave,
    }
}
