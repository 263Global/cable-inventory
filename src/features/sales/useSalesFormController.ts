import { useState } from 'react'
import type { NavigateFunction } from 'react-router-dom'
import { useSalesFormActions } from '@/features/sales/useSalesFormActions'
import { useSalesFormData } from '@/features/sales/useSalesFormData'

export function useSalesFormController(id: string | undefined, navigate: NavigateFunction) {
    const isEdit = Boolean(id)
    const [step, setStep] = useState(1)
    const [saving, setSaving] = useState(false)

    const {
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
    } = useSalesFormData({
        id,
        isEdit,
        navigate,
    })

    const {
        addItem,
        removeItem,
        toggleCircuit,
        updateItem,
        updateItemResource,
        handleSave,
    } = useSalesFormActions({
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
    })

    return {
        isEdit,
        step,
        setStep,
        saving,
        orderId,
        internalRef,
        setInternalRef,
        customerId,
        setCustomerId,
        status,
        setStatus,
        notes,
        setNotes,
        items,
        customers,
        resources,
        circuitsByResource,
        addItem,
        removeItem,
        toggleCircuit,
        updateItem,
        updateItemResource,
        handleSave,
    }
}
