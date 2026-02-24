import type { BatchRow } from '@/features/inventory/form-batches'
import type { InventoryBatch, InventoryResource } from '@/types'
import type { InventoryFormState } from '@/features/inventory/inventory-form-types'
import type { InventoryResourceWritePayload } from '@/features/inventory/api'

export const defaultInventoryFormState: InventoryFormState = {
    type: 'Capacity',
    internal_ref: '',
    spec: '',
    capacity_value: '',
    cable_system_id: '',
    supplier_id: '',
    acquisition_type: 'IRU',
    protection: 'Unprotected',
    contract_ref: '',
    notes: '',
    cost_mode: 'Single',
    country_a: '',
    country_z: '',
    landing_station_a_id: '',
    landing_station_z_id: '',
    handover_location_a_id: '',
    handover_location_z_id: '',
    route_description: '',
    term_months: '',
    start_date: '',
    end_date: '',
    otc: '',
    om_rate: '4.0',
    annual_om_cost: '',
    mrc: '',
    nrc: '',
}

export function mapResourceToInventoryForm(resource: InventoryResource): InventoryFormState {
    return {
        type: resource.type ?? 'Capacity',
        internal_ref: resource.internal_ref ?? '',
        spec: resource.spec ?? '',
        capacity_value: resource.total_capacity != null ? String(resource.total_capacity) : '',
        cable_system_id: resource.cable_system_id ?? '',
        supplier_id: resource.supplier_id ?? '',
        acquisition_type: resource.acquisition_type ?? 'IRU',
        protection: resource.protection ?? 'Unprotected',
        contract_ref: resource.contract_ref ?? '',
        notes: resource.notes ?? '',
        cost_mode: resource.cost_mode ?? 'Single',
        country_a: resource.country_a ?? '',
        country_z: resource.country_z ?? '',
        landing_station_a_id: resource.landing_station_a_id ?? '',
        landing_station_z_id: resource.landing_station_z_id ?? '',
        handover_location_a_id: resource.handover_location_a_id ?? '',
        handover_location_z_id: resource.handover_location_z_id ?? '',
        route_description: resource.route_description ?? '',
        term_months: resource.term_months != null ? String(resource.term_months) : '',
        start_date: resource.start_date ?? '',
        end_date: resource.end_date ?? '',
        otc: resource.otc != null ? String(resource.otc) : '',
        om_rate: resource.om_rate != null ? String(resource.om_rate) : '4.0',
        annual_om_cost: resource.annual_om_cost != null ? String(resource.annual_om_cost) : '',
        mrc: resource.mrc != null ? String(resource.mrc) : '',
        nrc: resource.nrc != null ? String(resource.nrc) : '',
    }
}

export function mapDbBatchesToRows(existingBatches: InventoryBatch[]): BatchRow[] {
    return existingBatches.map((batch) => ({
        id: batch.id,
        capacity: String(batch.capacity),
        model: batch.model ?? 'IRU',
        start_date: batch.start_date ?? '',
        term_months: batch.term_months != null ? String(batch.term_months) : '',
        otc: batch.otc != null ? String(batch.otc) : '',
        om_rate: batch.om_rate != null ? String(batch.om_rate) : '4.0',
        annual_om_cost: batch.annual_om_cost != null ? String(batch.annual_om_cost) : '',
        mrc: batch.mrc != null ? String(batch.mrc) : '',
        status: batch.status ?? 'Planned',
    }))
}

export function validateInventoryFormStep(params: {
    step: number
    form: InventoryFormState
    batches: BatchRow[]
    isBatchMode: boolean
    batchCapacityExceeded: boolean
}): string[] {
    const { step, form, batches, isBatchMode, batchCapacityExceeded } = params
    const errors: string[] = []

    if (step === 0) {
        if (form.type !== 'Terrestrial' && !form.cable_system_id) errors.push('Cable System is required')
        if (!form.capacity_value || Number(form.capacity_value) <= 0) errors.push('Capacity must be a positive number')
    }

    if (step === 1) {
        if (form.type === 'Terrestrial') {
            if (!form.handover_location_a_id && !form.handover_location_z_id) {
                errors.push('At least one handover location is required')
            }
        } else if (!form.country_a && !form.country_z) {
            errors.push('At least one endpoint country is required')
        }
    }

    if (step === 2) {
        if (form.otc && Number(form.otc) < 0) errors.push('OTC cannot be negative')
        if (form.mrc && Number(form.mrc) < 0) errors.push('MRC cannot be negative')
        if (form.nrc && Number(form.nrc) < 0) errors.push('NRC cannot be negative')
        if (form.start_date && form.end_date && form.start_date > form.end_date) {
            errors.push('End date cannot be before start date')
        }
        if (isBatchMode && batches.length === 0) errors.push('Add at least one batch in Base+Batch mode')
        if (isBatchMode && batchCapacityExceeded) errors.push('Batch total capacity exceeds base capacity')
        if (isBatchMode) {
            batches.forEach((batch, index) => {
                if (!batch.capacity || Number(batch.capacity) <= 0) errors.push(`Batch ${index + 1}: capacity is required`)
                if (!batch.start_date) errors.push(`Batch ${index + 1}: start date is required`)
                if (batch.model === 'IRU' && batch.otc && Number(batch.otc) < 0) errors.push(`Batch ${index + 1}: OTC cannot be negative`)
                if (batch.model === 'Lease' && batch.mrc && Number(batch.mrc) < 0) errors.push(`Batch ${index + 1}: MRC cannot be negative`)
            })
        }
    }

    return errors
}

export function buildInventoryPayload(
    form: InventoryFormState,
    countryAId: string | null,
    countryZId: string | null,
): InventoryResourceWritePayload {
    return {
        type: form.type,
        internal_ref: form.internal_ref || null,
        spec: form.spec || null,
        capacity_value: form.capacity_value ? Number(form.capacity_value) : null,
        total_capacity: form.capacity_value ? Number(form.capacity_value) : null,
        cable_system_id: form.cable_system_id || null,
        supplier_id: form.supplier_id || null,
        acquisition_type: form.acquisition_type,
        protection: form.protection,
        contract_ref: form.contract_ref || null,
        notes: form.notes || null,
        cost_mode: form.cost_mode,
        country_a_id: countryAId,
        country_z_id: countryZId,
        landing_station_a_id: form.landing_station_a_id || null,
        landing_station_z_id: form.landing_station_z_id || null,
        handover_location_a_id: form.handover_location_a_id || null,
        handover_location_z_id: form.handover_location_z_id || null,
        route_description: form.route_description || null,
        term_months: form.term_months ? Number(form.term_months) : null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        otc: form.otc ? Number(form.otc) : null,
        om_rate: form.om_rate ? Number(form.om_rate) : null,
        annual_om_cost: form.annual_om_cost ? Number(form.annual_om_cost) : null,
        mrc: form.mrc ? Number(form.mrc) : null,
        nrc: form.nrc ? Number(form.nrc) : null,
    }
}
