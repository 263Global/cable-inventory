import { useState } from 'react'
import { toast } from 'sonner'
import {
    calcEndDateFromTerm,
    nextDay,
    todayDateOnly,
} from '@/lib/contract-utils'
import {
    checkLinkedSalesOrders,
    fetchInventoryById,
    renewInventoryResource,
    terminateInventoryResource,
} from '@/features/inventory/api'
import type { InventoryResource } from '@/types'
import type {
    RenewFormState,
    TerminateWarning,
} from '@/features/inventory/inventory-detail-controller-types'

interface UseInventoryDetailLifecycleParams {
    resource: InventoryResource | null
    setResource: (resource: InventoryResource | null) => void
    loadCircuits: () => Promise<void>
}

export function useInventoryDetailLifecycle({
    resource,
    setResource,
    loadCircuits,
}: UseInventoryDetailLifecycleParams) {
    const [terminateOpen, setTerminateOpen] = useState(false)
    const [terminateDate, setTerminateDate] = useState(todayDateOnly())
    const [terminateReason, setTerminateReason] = useState('')
    const [terminateWarning, setTerminateWarning] = useState<TerminateWarning | null>(null)
    const [actionLoading, setActionLoading] = useState(false)

    const [renewOpen, setRenewOpen] = useState(false)
    const [renewForm, setRenewForm] = useState<RenewFormState>({
        startDate: '',
        termMonths: 12,
        endDate: '',
        mrc: 0,
        nrc: 0,
    })

    const openTerminateDialog = async () => {
        if (!resource) return
        const warning = await checkLinkedSalesOrders(resource.id)
        setTerminateWarning(warning)
        setTerminateOpen(true)
    }

    const openRenewDialog = () => {
        if (!resource) return
        const startDate = resource.end_date ? nextDay(resource.end_date) : todayDateOnly()
        const termMonths = resource.term_months ?? 12

        setRenewForm({
            startDate,
            termMonths,
            endDate: calcEndDateFromTerm(startDate, termMonths),
            mrc: Number(resource.mrc ?? 0),
            nrc: 0,
        })
        setRenewOpen(true)
    }

    const handleConfirmTerminate = async () => {
        if (!resource) return

        setActionLoading(true)
        try {
            await terminateInventoryResource(resource.id, terminateDate, terminateReason)
            toast.success('Resource terminated')
            setTerminateOpen(false)
            setTerminateReason('')
            const updated = await fetchInventoryById(resource.id)
            if (updated) setResource(updated)
            await loadCircuits()
        } catch (error) {
            console.error(error)
            toast.error('Failed to terminate')
        } finally {
            setActionLoading(false)
        }
    }

    const handleConfirmRenew = async () => {
        if (!resource) return

        setActionLoading(true)
        try {
            const costs = resource.acquisition_type === 'Swap-In'
                ? { otc: renewForm.mrc || null, om_rate: renewForm.nrc || null }
                : { mrc: renewForm.mrc || null, nrc: renewForm.nrc || null }

            await renewInventoryResource(
                resource.id,
                renewForm.startDate,
                renewForm.termMonths,
                renewForm.endDate,
                costs,
            )
            toast.success('Resource renewed')
            setRenewOpen(false)
            const updated = await fetchInventoryById(resource.id)
            if (updated) setResource(updated)
        } catch (error) {
            console.error(error)
            toast.error('Failed to renew')
        } finally {
            setActionLoading(false)
        }
    }

    const handleRenewStartDateChange = (value: string) => {
        setRenewForm((prev) => ({
            ...prev,
            startDate: value,
            endDate: calcEndDateFromTerm(value, prev.termMonths),
        }))
    }

    const handleRenewTermMonthsChange = (value: number) => {
        setRenewForm((prev) => ({
            ...prev,
            termMonths: value,
            endDate: calcEndDateFromTerm(prev.startDate, value),
        }))
    }

    const handleRenewMrcChange = (value: number) => {
        setRenewForm((prev) => ({ ...prev, mrc: value }))
    }

    const handleRenewNrcChange = (value: number) => {
        setRenewForm((prev) => ({ ...prev, nrc: value }))
    }

    return {
        terminateOpen,
        terminateDate,
        terminateReason,
        terminateWarning,
        actionLoading,
        renewOpen,
        renewForm,
        setTerminateOpen,
        setTerminateDate,
        setTerminateReason,
        setRenewOpen,
        setRenewForm,
        openTerminateDialog,
        openRenewDialog,
        handleConfirmTerminate,
        handleConfirmRenew,
        handleRenewStartDateChange,
        handleRenewTermMonthsChange,
        handleRenewMrcChange,
        handleRenewNrcChange,
    }
}
