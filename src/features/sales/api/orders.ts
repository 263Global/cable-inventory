import { todayDateOnly } from '@/lib/contract-utils'
import { addDays } from '@/lib/contract-state'
import { supabase } from '@/lib/supabase'
import { assertNoError } from '@/lib/supabase-utils'
import type { SalesOrder, SalesOrderCircuitCode, SalesStatus } from '@/types'
import { recalcForOrder, recalcInventoryCapacity } from './capacity'
import { deallocateCircuits, syncCircuitStatuses } from './circuits'

type MaybeRelation<T> = T | T[] | null

interface RollingSyncRow {
    id: string
    end_date: string | null
    status: string | null
    terminated_at: string | null
    contract_state: string | null
}

interface OrderStatusSyncRow {
    id: string
    sales_order_items: MaybeRelation<{ start_date: string | null; end_date: string | null }>
}

interface SalesOrderItemPriceRow {
    sell_mrc: number | null
    sell_otc: number | null
    sell_nrc: number | null
    sell_annual_om: number | null
}

interface SalesOrderQueryRow extends Omit<SalesOrder, 'customer_name' | 'item_count' | 'total_mrc' | 'total_otc' | 'total_nrc' | 'total_annual_om'> {
    customers: MaybeRelation<{ name: string }>
    sales_order_items?: MaybeRelation<SalesOrderItemPriceRow>
}

interface SalesOrderItemLinkRow {
    id: string
    inventory_resource_id: string | null
}

function pickRelation<T>(value: MaybeRelation<T> | undefined): T | null {
    if (Array.isArray(value)) return value[0] ?? null
    return value ?? null
}

function relationToArray<T>(value: MaybeRelation<T> | undefined): T[] {
    if (Array.isArray(value)) return value
    return value ? [value] : []
}

function mapSalesOrderRow(row: SalesOrderQueryRow): SalesOrder {
    const customer = pickRelation(row.customers)
    const items = relationToArray(row.sales_order_items)

    const sumField = (field: keyof SalesOrderItemPriceRow): number | null => {
        const values = items.map((i) => i[field]).filter((v): v is number => v != null)
        return values.length > 0 ? values.reduce((a, b) => a + b, 0) : null
    }

    const { customers: _c, sales_order_items: _i, ...rest } = row
    return {
        ...rest,
        customer_name: customer?.name,
        item_count: items.length,
        total_mrc: sumField('sell_mrc'),
        total_otc: sumField('sell_otc'),
        total_nrc: sumField('sell_nrc'),
        total_annual_om: sumField('sell_annual_om'),
    }
}

export async function syncOrderStatuses(): Promise<number> {
    const today = todayDateOnly()
    let transitioned = 0

    const { data: presoldOrders, error: presoldError } = await supabase
        .from('sales_orders')
        .select('id, sales_order_items(start_date)')
        .eq('status', 'Pre-sold')
    assertNoError(presoldError, 'Failed to load Pre-sold orders for status sync')

    const presoldRows = (presoldOrders ?? []) as OrderStatusSyncRow[]
    for (const order of presoldRows) {
        const items = relationToArray(order.sales_order_items)
        const hasStarted = items.some((item) => item.start_date && item.start_date <= today)
        if (!hasStarted) continue

        const { error } = await supabase
            .from('sales_orders')
            .update({ status: 'Active', updated_at: new Date().toISOString() })
            .eq('id', order.id)
        assertNoError(error, 'Failed to transition order to Active')

        await syncCircuitStatuses(order.id, 'Active')
        await recalcForOrder(order.id)
        transitioned++
    }

    // 滚动续期口径（migration 028）：合同期满未续签不再自动转 Expired、不释放端口，
    // 而是把订单行标记为 rolling（软占用），rolling_since = 原结束日次日。
    const { data: dueItems, error: dueError } = await supabase
        .from('sales_order_items')
        .select('id, end_date, status, terminated_at, contract_state, sales_orders!inner(status)')
        .lt('end_date', today)
        .is('terminated_at', null)
        .or('contract_state.is.null,contract_state.eq.in_term')
        .in('sales_orders.status', ['Pre-sold', 'Active', 'Expired'])
    assertNoError(dueError, 'Failed to load items due for rolling renewal')

    const dueRows = (dueItems ?? []) as RollingSyncRow[]
    for (const item of dueRows) {
        if (!item.end_date || item.status === 'Terminated' || item.status === 'Cancelled') continue
        const { error } = await supabase
            .from('sales_order_items')
            .update({ contract_state: 'rolling', rolling_since: addDays(item.end_date, 1) })
            .eq('id', item.id)
        assertNoError(error, 'Failed to mark item as rolling')
        transitioned++
    }

    return transitioned
}

export async function fetchSalesOrders(): Promise<SalesOrder[]> {
    const { data, error } = await supabase
        .from('sales_orders')
        .select('*, customers(name), sales_order_items(sell_mrc, sell_otc, sell_nrc, sell_annual_om)')
        .order('created_at', { ascending: false })

    assertNoError(error, 'Failed to load sales orders')
    const rows = (data ?? []) as SalesOrderQueryRow[]
    const orders = rows.map(mapSalesOrderRow)

    // 占用端口的 SR / JOC（circuit_code_lookup，migration 029），供列表展示和按编号搜索
    const { data: codeRows, error: codeError } = await supabase
        .from('circuit_code_lookup')
        .select('sales_order_id, circuit_number, supplier_sr, supplier_sr_old, supplier_service_id, juno_circuit_id')
        .not('sales_order_id', 'is', null)
        .order('circuit_number')
    assertNoError(codeError, 'Failed to load circuit codes for sales orders')

    const codesByOrder = new Map<string, SalesOrderCircuitCode[]>()
    for (const row of (codeRows ?? []) as Array<SalesOrderCircuitCode & { sales_order_id: string }>) {
        const { sales_order_id, ...code } = row
        const list = codesByOrder.get(sales_order_id) ?? []
        list.push(code)
        codesByOrder.set(sales_order_id, list)
    }
    return orders.map((order) => ({ ...order, circuit_codes: codesByOrder.get(order.id) ?? [] }))
}

export async function fetchSalesOrderById(id: string): Promise<SalesOrder | null> {
    const { data, error } = await supabase
        .from('sales_orders')
        .select('*, customers(name), sales_order_items(sell_mrc, sell_otc, sell_nrc, sell_annual_om)')
        .eq('id', id)
        .single()

    assertNoError(error, 'Failed to load sales order')
    return data ? mapSalesOrderRow(data as SalesOrderQueryRow) : null
}

// order_id is auto-assigned by DB trigger when omitted
export async function createSalesOrder(payload: {
    order_id?: string
    internal_ref?: string
    customer_id: string
    status: SalesStatus
    notes?: string
}): Promise<SalesOrder> {
    const { data, error } = await supabase
        .from('sales_orders')
        .insert(payload)
        .select()
        .single()

    assertNoError(error, 'Failed to create sales order')
    return data as SalesOrder
}

export async function updateSalesOrder(
    id: string,
    payload: Partial<Pick<SalesOrder, 'internal_ref' | 'customer_id' | 'status' | 'notes'>>,
): Promise<void> {
    const { error } = await supabase
        .from('sales_orders')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id)

    assertNoError(error, 'Failed to update sales order')
    if (payload.status) {
        await syncCircuitStatuses(id, payload.status)
        await recalcForOrder(id)
    }
}

export async function deleteSalesOrder(id: string): Promise<void> {
    const { data: items, error: itemsError } = await supabase
        .from('sales_order_items')
        .select('id, inventory_resource_id')
        .eq('sales_order_id', id)
    assertNoError(itemsError, 'Failed to load sales order items before deletion')

    const affectedResourceIds = new Set<string>()
    const itemRows = (items ?? []) as SalesOrderItemLinkRow[]
    for (const item of itemRows) {
        if (item.inventory_resource_id) affectedResourceIds.add(item.inventory_resource_id)
        await deallocateCircuits(item.id)
    }

    const { error } = await supabase
        .from('sales_orders')
        .delete()
        .eq('id', id)
        .select('id')
        .single()
    assertNoError(error, 'Failed to delete sales order')

    await Promise.all([...affectedResourceIds].map(recalcInventoryCapacity))
}
