import { todayDateOnly } from '@/lib/contract-utils'
import { supabase } from '@/lib/supabase'
import { assertNoError } from '@/lib/supabase-utils'
import { recalcForOrder } from './capacity'
import { syncCircuitStatuses } from './circuits'
import type { SalesOrderItem, SalesRenewalSnapshot, SalesStatus } from '@/types'

interface SalesOrderRenewalRow {
    status: SalesStatus
    renewal_history: SalesRenewalSnapshot[] | null
    sales_order_items: SalesOrderItem[] | null
}

/** Cancel a Pre-sold order → Cancelled */
export async function cancelSalesOrder(
    id: string,
    reason: string,
): Promise<void> {
    const now = new Date().toISOString()
    const { error } = await supabase
        .from('sales_orders')
        .update({
            status: 'Cancelled',
            terminated_at: todayDateOnly(),
            termination_reason: reason || null,
            updated_at: now,
        })
        .eq('id', id)
    assertNoError(error, 'Failed to cancel sales order')

    const { error: itemUpdateError } = await supabase
        .from('sales_order_items')
        .update({ status: 'Cancelled', updated_at: now })
        .eq('sales_order_id', id)
    assertNoError(itemUpdateError, 'Failed to update sales order items during cancellation')

    await syncCircuitStatuses(id, 'Cancelled')
    await recalcForOrder(id)
}

/** Terminate selected items in an Active order. Full termination → order Terminated; partial → stays Active. */
export async function terminateSalesOrder(
    id: string,
    terminatedAt: string,
    reason: string,
    items: { itemId: string; selected: boolean; terminationFee: number }[],
): Promise<void> {
    const now = new Date().toISOString()
    const selectedIds = items.filter((item) => item.selected).map((item) => item.itemId)
    if (selectedIds.length === 0) return

    for (const item of items) {
        if (!item.selected) continue
        const { error } = await supabase
            .from('sales_order_items')
            .update({
                status: 'Terminated',
                terminated_at: terminatedAt,
                termination_fee: item.terminationFee || 0,
                updated_at: now,
            })
            .eq('id', item.itemId)
        assertNoError(error, 'Failed to terminate sales order item')
    }

    const { data: links, error: linksError } = await supabase
        .from('sales_item_circuits')
        .select('inventory_circuit_id')
        .in('sales_order_item_id', selectedIds)
    assertNoError(linksError, 'Failed to load circuit links for termination')

    if (links && links.length > 0) {
        const circuitIds = links
            .map((link) => link.inventory_circuit_id)
            .filter((circuitId): circuitId is string => typeof circuitId === 'string')
        const { error: deleteError } = await supabase
            .from('sales_item_circuits')
            .delete()
            .in('sales_order_item_id', selectedIds)
        assertNoError(deleteError, 'Failed to remove circuit links during termination')

        const { error: releaseError } = await supabase
            .from('inventory_circuits')
            .update({ status: 'Available', updated_at: now })
            .in('id', circuitIds)
        assertNoError(releaseError, 'Failed to release circuits during termination')
    }

    const { data: allItems, error: allItemsError } = await supabase
        .from('sales_order_items')
        .select('status')
        .eq('sales_order_id', id)
    assertNoError(allItemsError, 'Failed to load order items for termination status')

    const statuses = (allItems ?? []).map((item) => item.status as string)
    const allTerminal = statuses.every((status) => ['Terminated', 'Cancelled', 'Expired'].includes(status))

    const { error: orderError } = await supabase
        .from('sales_orders')
        .update({
            status: allTerminal ? 'Terminated' : undefined,
            terminated_at: allTerminal ? terminatedAt : undefined,
            termination_reason: reason || null,
            updated_at: now,
        })
        .eq('id', id)
    assertNoError(orderError, 'Failed to update order termination status')

    await recalcForOrder(id)
}

/** Renew a sales order — only Lease Out / Swap Out items get renewed */
export async function renewSalesOrder(
    id: string,
    renewals: {
        itemId: string
        startDate: string
        termMonths: number
        endDate: string
        mrc: number | null
        nrc: number | null
    }[],
): Promise<void> {
    const now = new Date().toISOString()

    const { data: order, error: orderLoadError } = await supabase
        .from('sales_orders')
        .select('*, sales_order_items(*)')
        .eq('id', id)
        .single()
    assertNoError(orderLoadError, 'Failed to load sales order for renewal')

    if (!order) throw new Error('Order not found')
    const orderRow = order as SalesOrderRenewalRow

    const snapshot: SalesRenewalSnapshot = {
        renewed_at: now,
        old_status: orderRow.status,
        items: (orderRow.sales_order_items ?? []).map((item) => ({
            item_id: item.id,
            old_start_date: item.start_date,
            old_end_date: item.end_date,
            old_term_months: item.term_months,
            old_mrc: item.sell_mrc,
            old_nrc: item.sell_nrc,
        })),
    }

    const history = Array.isArray(orderRow.renewal_history) ? orderRow.renewal_history : []
    history.push(snapshot)

    for (const renewal of renewals) {
        const { error } = await supabase
            .from('sales_order_items')
            .update({
                start_date: renewal.startDate,
                end_date: renewal.endDate,
                term_months: renewal.termMonths,
                sell_mrc: renewal.mrc,
                sell_nrc: renewal.nrc,
                status: new Date(renewal.startDate) <= new Date() ? 'Active' : 'Pre-sold',
                updated_at: now,
            })
            .eq('id', renewal.itemId)
        assertNoError(error, `Failed to renew item ${renewal.itemId}`)
    }

    const today = new Date()
    const hasActive = renewals.some((renewal) =>
        new Date(renewal.startDate) <= today && new Date(renewal.endDate) >= today,
    )
    const newStatus = hasActive ? 'Active' : 'Pre-sold'

    const { error: updateOrderError } = await supabase
        .from('sales_orders')
        .update({
            status: newStatus,
            renewal_history: history,
            terminated_at: null,
            termination_reason: null,
            updated_at: now,
        })
        .eq('id', id)
    assertNoError(updateOrderError, 'Failed to update sales order during renewal')
}
