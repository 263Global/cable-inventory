import { useEffect, useState } from 'react'
import type { NavigateFunction } from 'react-router-dom'
import { fetchInventoryById } from '@/features/inventory/api'
import { fetchBatches, fetchCableSystems, fetchCountriesForCable, fetchHandoverLocations, fetchStationsForCableAndCountry, fetchSuppliers } from '@/lib/reference-api'
import type { BatchRow } from '@/features/inventory/form-batches'
import type {
    CableSystemOption,
    HandoverLocationOption,
    InventoryFormState,
    StationOption,
    SupplierOption,
} from '@/features/inventory/inventory-form-types'
import { defaultInventoryFormState, mapDbBatchesToRows, mapResourceToInventoryForm } from '@/features/inventory/inventory-form-logic'

type UseInventoryFormDataParams = {
    editId: string | undefined
    navigate: NavigateFunction
}

export function useInventoryFormData({ editId, navigate }: UseInventoryFormDataParams) {
    const [loadingEdit, setLoadingEdit] = useState(false)
    const [form, setForm] = useState<InventoryFormState>(defaultInventoryFormState)
    const [batches, setBatches] = useState<BatchRow[]>([])

    const [cableSystems, setCableSystems] = useState<CableSystemOption[]>([])
    const [suppliers, setSuppliers] = useState<SupplierOption[]>([])
    const [countriesA, setCountriesA] = useState<string[]>([])
    const [countriesZ, setCountriesZ] = useState<string[]>([])
    const [stationsA, setStationsA] = useState<StationOption[]>([])
    const [stationsZ, setStationsZ] = useState<StationOption[]>([])
    const [handoverLocations, setHandoverLocations] = useState<HandoverLocationOption[]>([])

    useEffect(() => {
        fetchCableSystems().then(setCableSystems).catch(console.error)
        fetchSuppliers().then(setSuppliers).catch(console.error)
        fetchHandoverLocations().then(setHandoverLocations).catch(console.error)
    }, [])

    useEffect(() => {
        if (!editId) return

        setLoadingEdit(true)
        ;(async () => {
            try {
                const resource = await fetchInventoryById(editId)
                if (!resource) {
                    navigate('/inventory')
                    return
                }

                setForm(mapResourceToInventoryForm(resource))
                if (resource.cost_mode === 'Base+Batch') {
                    const existingBatches = await fetchBatches(editId)
                    setBatches(mapDbBatchesToRows(existingBatches))
                } else {
                    setBatches([])
                }
            } catch (loadError) {
                console.error(loadError)
            } finally {
                setLoadingEdit(false)
            }
        })()
    }, [editId, navigate])

    useEffect(() => {
        if (!form.cable_system_id) {
            setCountriesA([])
            setCountriesZ([])
            return
        }

        fetchCountriesForCable(form.cable_system_id)
            .then((countries) => {
                setCountriesA(countries)
                setCountriesZ(countries)
            })
            .catch(console.error)
    }, [form.cable_system_id])

    useEffect(() => {
        if (!form.cable_system_id || !form.country_a) {
            setStationsA([])
            return
        }

        fetchStationsForCableAndCountry(form.cable_system_id, form.country_a)
            .then(setStationsA)
            .catch(console.error)
    }, [form.cable_system_id, form.country_a])

    useEffect(() => {
        if (!form.cable_system_id || !form.country_z) {
            setStationsZ([])
            return
        }

        fetchStationsForCableAndCountry(form.cable_system_id, form.country_z)
            .then(setStationsZ)
            .catch(console.error)
    }, [form.cable_system_id, form.country_z])

    return {
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
    }
}
