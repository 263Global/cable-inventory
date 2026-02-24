import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useInventoryFormActions } from '@/features/inventory/useInventoryFormActions'
import { useInventoryFormData } from '@/features/inventory/useInventoryFormData'

export function useInventoryFormController() {
    const navigate = useNavigate()
    const { id: editId } = useParams<{ id: string }>()

    const isEdit = Boolean(editId)
    const [step, setStep] = useState(0)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const {
        loadingEdit,
        form,
        setForm,
        batches,
        setBatches,
        cableSystems,
        suppliers,
        countriesA,
        countriesZ,
        stationsA,
        stationsZ,
        handoverLocations,
    } = useInventoryFormData({ editId, navigate })

    const isIRU = form.acquisition_type === 'IRU'
    const isLease = form.acquisition_type === 'Lease'
    const isBatchMode = form.cost_mode === 'Base+Batch'

    const batchTotalCapacity = useMemo(
        () => batches.reduce((sum, batch) => sum + (parseFloat(batch.capacity) || 0), 0),
        [batches],
    )
    const baseCapacity = useMemo(() => parseFloat(form.capacity_value) || 0, [form.capacity_value])
    const batchCapacityExceeded = batchTotalCapacity > baseCapacity && baseCapacity > 0

    const {
        updateForm,
        updateBatchRow,
        handleNext,
        handleSave,
        handleSpecPresetSelect,
        handleSpecInputChange,
        handleBackToInventory,
        handleAddBatch,
        handleRemoveBatch,
    } = useInventoryFormActions({
        batches,
        batchCapacityExceeded,
        editId,
        form,
        isBatchMode,
        isEdit,
        navigate,
        setBatches,
        setError,
        setForm,
        setSaving,
        setStep,
        step,
    })

    return {
        isEdit,
        step,
        saving,
        loadingEdit,
        error,
        form,
        batches,
        cableSystems,
        suppliers,
        countriesA,
        countriesZ,
        stationsA,
        stationsZ,
        handoverLocations,
        isIRU,
        isLease,
        isBatchMode,
        batchTotalCapacity,
        baseCapacity,
        batchCapacityExceeded,
        setStep,
        updateForm,
        updateBatchRow,
        handleNext,
        handleSave,
        handleSpecPresetSelect,
        handleSpecInputChange,
        handleBackToInventory,
        handleAddBatch,
        handleRemoveBatch,
    }
}
