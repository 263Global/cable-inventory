import { supabase } from '@/lib/supabase'
import { assertNoError } from '@/lib/supabase-utils'
import type { InventoryResourceWritePayload } from '@/features/inventory/api/shared'

export async function terminateInventoryResource(
    id: string,
    terminatedAt: string,
    reason: string,
): Promise<void> {
    const now = new Date().toISOString()

    const { data: circuits, error: circuitsError } = await supabase
        .from('inventory_circuits')
        .select('id')
        .eq('inventory_resource_id', id)
        .in('status', ['Allocated', 'Reserved'])
    assertNoError(circuitsError, 'Failed to load resource circuits for termination')

    if (circuits && circuits.length > 0) {
        const circuitIds = circuits.map((circuit) => circuit.id as string)

        const { error: deleteLinksError } = await supabase
            .from('sales_item_circuits')
            .delete()
            .in('inventory_circuit_id', circuitIds)
        assertNoError(deleteLinksError, 'Failed to clear circuit allocations during termination')

        const { error: resetCircuitError } = await supabase
            .from('inventory_circuits')
            .update({ status: 'Available', updated_at: now })
            .in('id', circuitIds)
        assertNoError(resetCircuitError, 'Failed to reset circuits during termination')
    }

    const { error: updateError } = await supabase
        .from('inventory_resources')
        .update({
            status: 'Terminated',
            terminated_at: terminatedAt,
            termination_reason: reason || null,
            used_capacity: 0,
            updated_at: now,
        })
        .eq('id', id)
    assertNoError(updateError, 'Failed to terminate inventory resource')
}

export async function renewInventoryResource(
    id: string,
    newStartDate: string,
    newTermMonths: number,
    newEndDate: string,
    costs?: { mrc?: number | null; nrc?: number | null; otc?: number | null; om_rate?: number | null },
): Promise<void> {
    const now = new Date().toISOString()

    const { data: resource, error } = await supabase
        .from('inventory_resources')
        .select('*')
        .eq('id', id)
        .single()
    assertNoError(error, 'Failed to load inventory resource for renewal')

    if (!resource) throw new Error('Resource not found')

    const snapshot = {
        renewed_at: now,
        old_start_date: resource.start_date,
        old_end_date: resource.end_date,
        old_term_months: resource.term_months,
        old_mrc: resource.mrc,
        old_nrc: resource.nrc,
        old_otc: resource.otc,
        old_om_rate: resource.om_rate,
        old_status: resource.status,
    }

    const history = Array.isArray(resource.renewal_history) ? resource.renewal_history : []
    history.push(snapshot)

    const updates: InventoryResourceWritePayload = {
        start_date: newStartDate,
        end_date: newEndDate,
        term_months: newTermMonths,
        status: 'Available',
        terminated_at: null,
        termination_reason: null,
        renewal_history: history,
        updated_at: now,
    }
    if (costs?.mrc !== undefined) updates.mrc = costs.mrc
    if (costs?.nrc !== undefined) updates.nrc = costs.nrc
    if (costs?.otc !== undefined) updates.otc = costs.otc
    if (costs?.om_rate !== undefined) updates.om_rate = costs.om_rate
    if (costs?.otc != null && costs?.om_rate != null) {
        updates.annual_om_cost = (costs.otc * costs.om_rate) / 100
    }

    const { error: updateError } = await supabase
        .from('inventory_resources')
        .update(updates)
        .eq('id', id)
    assertNoError(updateError, 'Failed to renew inventory resource')
}
