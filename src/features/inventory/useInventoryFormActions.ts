import { useCallback } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { NavigateFunction } from 'react-router-dom'
import { toast } from 'sonner'
import {
    calcBatchTermToBaseEnd,
    calcEndDateFromTerm,
    calculateAnnualOm,
    parsePositiveInt,
    suggestBatchStatusFromBaseTerm,
} from '@/lib/contract-utils'
import { createInventoryResource, fetchCountryIdByName, updateInventoryResource } from '@/features/inventory/api'
import { newBatchRow, syncResourceBatches, type BatchRow } from '@/features/inventory/form-batches'
import type { InventoryFormState } from '@/features/inventory/inventory-form-types'
import { buildInventoryPayload, validateInventoryFormStep } from '@/features/inventory/inventory-form-logic'

type UseInventoryFormActionsParams = {
    batches: BatchRow[]
    batchCapacityExceeded: boolean
    editId: string | undefined
    form: InventoryFormState
    isBatchMode: boolean
    isEdit: boolean
    navigate: NavigateFunction
    setBatches: Dispatch<SetStateAction<BatchRow[]>>
    setError: Dispatch<SetStateAction<string>>
    setForm: Dispatch<SetStateAction<InventoryFormState>>
    setSaving: Dispatch<SetStateAction<boolean>>
    setStep: Dispatch<SetStateAction<number>>
    step: number
}

function specToCapacity(spec: string): string {
    const upper = spec.toUpperCase().trim()
    if (upper.endsWith('T')) {
        const num = parseFloat(upper.replace('T', ''))
        return Number.isNaN(num) ? '' : String(num * 1000)
    }
    if (upper.endsWith('G')) {
        const num = parseFloat(upper.replace('G', ''))
        return Number.isNaN(num) ? '' : String(num)
    }
    const num = parseFloat(upper)
    return Number.isNaN(num) ? '' : String(num)
}

async function getCountryId(name: string): Promise<string | null> {
    try {
        return await fetchCountryIdByName(name)
    } catch {
        return null
    }
}

export function useInventoryFormActions({
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
}: UseInventoryFormActionsParams) {
    const updateForm = useCallback((key: keyof InventoryFormState, value: string) => {
        setForm((prev) => {
            const next = { ...prev, [key]: value }
            if (key === 'start_date' || key === 'term_months') {
                const startDate = key === 'start_date' ? value : prev.start_date
                const termMonths = key === 'term_months' ? value : prev.term_months
                next.end_date = calcEndDateFromTerm(startDate, parsePositiveInt(termMonths))
            }
            if (key === 'otc' || key === 'om_rate') {
                const otc = parseFloat(key === 'otc' ? value : prev.otc) || 0
                const rate = parseFloat(key === 'om_rate' ? value : prev.om_rate) || 0
                next.annual_om_cost = calculateAnnualOm(otc, rate).toFixed(2)
            }
            if (key === 'type' && value === 'Terrestrial') {
                next.cable_system_id = ''
                next.country_a = ''
                next.country_z = ''
                next.landing_station_a_id = ''
                next.landing_station_z_id = ''
            }
            return next
        })

        if (key === 'start_date' || key === 'term_months') {
            setBatches((prev) =>
                prev.map((batch) => ({
                    ...batch,
                    term_months: batch.start_date
                        ? String(
                            calcBatchTermToBaseEnd(
                                key === 'start_date' ? value : form.start_date,
                                parsePositiveInt(key === 'term_months' ? value : form.term_months),
                                batch.start_date,
                            ),
                        )
                        : '',
                })),
            )
        }
    }, [form.start_date, form.term_months, setBatches, setForm])

    const updateBatchRow = useCallback((batchId: string, key: keyof BatchRow, value: string) => {
        setBatches((prev) =>
            prev.map((batch) => {
                if (batch.id !== batchId) return batch

                const next = { ...batch, [key]: value }
                if (key === 'start_date') {
                    const term = calcBatchTermToBaseEnd(
                        form.start_date,
                        parsePositiveInt(form.term_months),
                        value,
                    )
                    next.term_months = term > 0 ? String(term) : ''
                    next.status = suggestBatchStatusFromBaseTerm(
                        value,
                        form.start_date,
                        parsePositiveInt(form.term_months),
                    )
                }
                if (key === 'otc' || key === 'om_rate') {
                    const otc = parseFloat(key === 'otc' ? value : batch.otc) || 0
                    const rate = parseFloat(key === 'om_rate' ? value : batch.om_rate) || 0
                    next.annual_om_cost = calculateAnnualOm(otc, rate).toFixed(2)
                }
                return next
            }),
        )
    }, [form.start_date, form.term_months, setBatches])

    const validateStep = useCallback((targetStep: number): boolean => {
        const errors = validateInventoryFormStep({
            step: targetStep,
            form,
            batches,
            isBatchMode,
            batchCapacityExceeded,
        })
        if (errors.length > 0) {
            errors.forEach((msg) => toast.error(msg))
            return false
        }
        return true
    }, [batches, batchCapacityExceeded, form, isBatchMode])

    const handleNext = useCallback(() => {
        if (validateStep(step)) {
            setStep((prev) => prev + 1)
        }
    }, [setStep, step, validateStep])

    const handleSave = useCallback(async () => {
        for (let index = 0; index <= 2; index++) {
            if (!validateStep(index)) {
                setStep(index)
                return
            }
        }

        setSaving(true)
        setError('')
        try {
            const countryAId = form.country_a ? await getCountryId(form.country_a) : null
            const countryZId = form.country_z ? await getCountryId(form.country_z) : null
            const payload = buildInventoryPayload(form, countryAId, countryZId)

            if (isEdit && editId) {
                await updateInventoryResource(editId, payload)
                await syncResourceBatches(editId, batches, isBatchMode)
                toast.success('Resource updated')
                navigate(`/inventory/${editId}`)
            } else {
                const created = await createInventoryResource(payload)
                if (isBatchMode && batches.length > 0) {
                    await syncResourceBatches(created.id, batches, true)
                }
                navigate(`/inventory/${created.id}`)
                toast.success('Resource created')
            }
        } catch (saveError) {
            const msg = saveError instanceof Error ? saveError.message : 'Failed to save'
            setError(msg)
            toast.error(msg)
        } finally {
            setSaving(false)
        }
    }, [batches, editId, form, isBatchMode, isEdit, navigate, setError, setSaving, setStep, validateStep])

    const handleSpecPresetSelect = useCallback((spec: string) => {
        setForm((prev) => ({
            ...prev,
            spec,
            capacity_value: specToCapacity(spec),
        }))
    }, [setForm])

    const handleSpecInputChange = useCallback((spec: string) => {
        const derivedCapacity = specToCapacity(spec)
        setForm((prev) => ({
            ...prev,
            spec,
            capacity_value: derivedCapacity || prev.capacity_value,
        }))
    }, [setForm])

    const handleBackToInventory = useCallback(() => {
        navigate('/inventory')
    }, [navigate])

    const handleRemoveBatch = useCallback((batchId: string) => {
        setBatches((prev) => prev.filter((batch) => batch.id !== batchId))
    }, [setBatches])

    const handleAddBatch = useCallback(() => {
        setBatches((prev) => [...prev, newBatchRow()])
    }, [setBatches])

    return {
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
