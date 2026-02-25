import { supabase } from '@/lib/supabase'
import { assertNoError } from '@/lib/supabase-utils'
import type { SalesItemCircuit } from '@/types'
import { fetchAllocatedCircuitsMap } from './shared'

/** Allocate circuits to a sales order item and set their status */
export async function allocateCircuits(
    salesOrderItemId: string,
    circuitIds: string[],
    orderStatus: string,
    interfaceOverrides?: Record<string, string>,  // circuitId → newTypeId
    salesOrderId?: string,
): Promise<void> {
    if (circuitIds.length === 0) return

    const { error } = await supabase.rpc('allocate_circuits_with_overrides', {
        p_sales_order_item_id: salesOrderItemId,
        p_circuit_ids: circuitIds,
        p_order_status: orderStatus,
        p_interface_overrides: interfaceOverrides ?? {},
        p_sales_order_id: salesOrderId ?? null,
    })
    assertNoError(error, 'Failed to allocate circuits')
}

/** Deallocate all circuits from a sales order item */
export async function deallocateCircuits(salesOrderItemId: string): Promise<string[]> {
    const { data: links, error: linksError } = await supabase
        .from('sales_item_circuits')
        .select('inventory_circuit_id')
        .eq('sales_order_item_id', salesOrderItemId)
    assertNoError(linksError, 'Failed to load circuits for deallocation')

    const circuitIds = (links ?? []).map((link) => link.inventory_circuit_id as string)

    if (circuitIds.length > 0) {
        const { error: deleteError } = await supabase
            .from('sales_item_circuits')
            .delete()
            .eq('sales_order_item_id', salesOrderItemId)
        assertNoError(deleteError, 'Failed to remove circuit allocations')

        const { error: resetError } = await supabase
            .from('inventory_circuits')
            .update({ status: 'Available', updated_at: new Date().toISOString() })
            .in('id', circuitIds)
        assertNoError(resetError, 'Failed to reset circuit statuses after deallocation')
    }

    return circuitIds
}

/** Fetch allocated circuit IDs for a sales order item */
export async function fetchAllocatedCircuits(salesOrderItemId: string): Promise<SalesItemCircuit[]> {
    const mapped = await fetchAllocatedCircuitsMap([salesOrderItemId])
    return mapped.get(salesOrderItemId) ?? []
}

/** Sync circuit statuses when order status changes */
export async function syncCircuitStatuses(salesOrderId: string, newStatus: string): Promise<void> {
    const { data: items, error: itemsError } = await supabase
        .from('sales_order_items')
        .select('id')
        .eq('sales_order_id', salesOrderId)
    assertNoError(itemsError, 'Failed to load sales items for status sync')

    if (!items || items.length === 0) return
    const itemIds = items.map((item) => item.id as string)

    const { data: links, error: linksError } = await supabase
        .from('sales_item_circuits')
        .select('inventory_circuit_id')
        .in('sales_order_item_id', itemIds)
    assertNoError(linksError, 'Failed to load circuit links for status sync')

    if (!links || links.length === 0) return
    const circuitIds = links.map((link) => link.inventory_circuit_id as string)

    if (['Pre-sold', 'Active'].includes(newStatus)) {
        const { error } = await supabase
            .from('inventory_circuits')
            .update({ status: 'Allocated', updated_at: new Date().toISOString() })
            .in('id', circuitIds)
        assertNoError(error, 'Failed to set circuits to Allocated')
        return
    }

    if (['Expired', 'Terminated', 'Cancelled'].includes(newStatus)) {
        const { error: deleteError } = await supabase
            .from('sales_item_circuits')
            .delete()
            .in('sales_order_item_id', itemIds)
        assertNoError(deleteError, 'Failed to remove circuit links while releasing')

        const { error: releaseError } = await supabase
            .from('inventory_circuits')
            .update({ status: 'Available', updated_at: new Date().toISOString() })
            .in('id', circuitIds)
        assertNoError(releaseError, 'Failed to release circuit statuses')
        return
    }

    const { error } = await supabase
        .from('inventory_circuits')
        .update({ status: 'Reserved', updated_at: new Date().toISOString() })
        .in('id', circuitIds)
    assertNoError(error, 'Failed to set circuits to Reserved')
}
