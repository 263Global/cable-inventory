import { formatDateOnly } from '@/lib/contract-utils'
import { summarizeDelivery, type DeliveryCircuit } from '@/lib/circuit-codes'
import {
    committedRecurringRevenue,
    deriveContractState,
    localToday,
    type ContractState,
} from '@/lib/contract-state'
import { supabase } from '@/lib/supabase'
import { assertNoError } from '@/lib/supabase-utils'
import type { SalesStatus } from '@/types'
import type {
    DashboardData,
    ExpiredUnreleased,
    ExpiringItem,
    PipelineItem,
    RecentOrder,
    ResourceRow,
    RevenueSummary,
    RollingContract,
} from './types'

type MaybeRelation<T> = T | T[] | null

function pickOne<T>(value: MaybeRelation<T> | undefined): T | null {
    if (Array.isArray(value)) return value[0] ?? null
    return value ?? null
}

interface ContractItemRow {
    id: string
    capacity: number | null
    sell_mrc: number | null
    end_date: string | null
    status: string | null
    terminated_at: string | null
    contract_state: ContractState | null
    rolling_since: string | null
    notice_period_days: number | null
    notice_given_at: string | null
    inventory_resource_id: string | null
    sales_orders: MaybeRelation<{ id: string; order_id: string; status: string; customers: MaybeRelation<{ name: string }> }>
    inventory_resources: MaybeRelation<{ resource_id: string }>
}

const pipelineOrder: SalesStatus[] = ['Draft', 'Pre-sold', 'Active', 'Expired', 'Terminated', 'Cancelled']

export async function fetchDashboardData(): Promise<DashboardData> {
    const today = new Date()
    const in90Days = new Date(today)
    in90Days.setDate(in90Days.getDate() + 90)
    const todayStr = formatDateOnly(today)
    const in90Str = formatDateOnly(in90Days)

    const { data: resourcesRaw, error: resourcesError } = await supabase
        .from('inventory_resources')
        .select('id, resource_id, type, total_capacity, used_capacity, status, cable_system:cable_systems(name)')
        .order('resource_id')
    assertNoError(resourcesError, 'Failed to load dashboard resources')

    // 合同状态（滚动续期 / 软占用，migration 028）
    const { data: itemsRaw, error: itemsError } = await supabase
        .from('sales_order_items')
        .select('id, capacity, sell_mrc, end_date, status, terminated_at, contract_state, rolling_since, notice_period_days, notice_given_at, inventory_resource_id, sales_orders!inner(id, order_id, status, customers(name)), inventory_resources(resource_id)')
    assertNoError(itemsError, 'Failed to load contract states')

    const contractToday = localToday()
    const hardByResource = new Map<string, number>()
    const softByResource = new Map<string, number>()
    const rolling: RollingContract[] = []
    const revenue: RevenueSummary = { inTermMrc: 0, rollingMrc: 0, committed12m: 0, naive12m: 0 }

    for (const item of (itemsRaw ?? []) as unknown as ContractItemRow[]) {
        const order = pickOne(item.sales_orders)
        const derived = deriveContractState(item, order?.status, contractToday)
        const capacity = Number(item.capacity) || 0
        const mrc = Number(item.sell_mrc) || 0
        if (item.inventory_resource_id && derived.occupancy !== 'none') {
            const target = derived.occupancy === 'hard' ? hardByResource : softByResource
            target.set(item.inventory_resource_id, (target.get(item.inventory_resource_id) ?? 0) + capacity)
        }
        if (derived.occupancy === 'none') continue
        revenue.committed12m += committedRecurringRevenue(mrc, derived, item.end_date, contractToday)
        if (derived.occupancy === 'hard') {
            revenue.inTermMrc += mrc
            revenue.naive12m += committedRecurringRevenue(mrc, derived, item.end_date, contractToday)
        } else {
            revenue.rollingMrc += mrc
            revenue.naive12m += mrc * 12
            rolling.push({
                sales_order_item_id: item.id,
                sales_order_id: order?.id ?? '',
                order_id: order?.order_id ?? '',
                customer_name: pickOne(order?.customers)?.name ?? null,
                resource_id: pickOne(item.inventory_resources)?.resource_id ?? null,
                capacity,
                sell_mrc: item.sell_mrc,
                end_date: item.end_date,
                contract: derived,
            })
        }
    }
    rolling.sort((a, b) => (a.contract.earliestExitDate ?? '').localeCompare(b.contract.earliestExitDate ?? '')
        || a.order_id.localeCompare(b.order_id))

    // 端口交付状态（migration 029）：有 SR / JOC 或已有订单 = 已交付；已点亮空闲无编号 = 交付中
    const { data: circuitsRaw, error: circuitsError } = await supabase
        .from('circuit_code_lookup')
        .select('inventory_resource_id, capacity, status, supplier_sr, juno_circuit_id, order_id')
    assertNoError(circuitsError, 'Failed to load circuit delivery status')
    const circuitsByResource = new Map<string, DeliveryCircuit[]>()
    for (const row of (circuitsRaw ?? []) as Array<Record<string, unknown>>) {
        const key = row.inventory_resource_id as string
        const list = circuitsByResource.get(key) ?? []
        list.push({
            capacity: Number(row.capacity) || 0,
            status: row.status as string,
            supplier_sr: row.supplier_sr as string | null,
            juno_circuit_id: row.juno_circuit_id as string | null,
            has_order: Boolean(row.order_id),
        })
        circuitsByResource.set(key, list)
    }

    const resources: ResourceRow[] = (resourcesRaw ?? []).map((resource: Record<string, unknown>) => ({
        resource_id: resource.resource_id as string,
        type: resource.type as string,
        cable_system_name: (resource.cable_system as { name: string } | null)?.name ?? null,
        total_capacity: Number(resource.total_capacity ?? 0),
        used_capacity: Number(resource.used_capacity ?? 0),
        hard_capacity: hardByResource.get(resource.id as string) ?? 0,
        soft_capacity: softByResource.get(resource.id as string) ?? 0,
        status: resource.status as string,
        delivery: summarizeDelivery(Number(resource.total_capacity ?? 0), circuitsByResource.get(resource.id as string) ?? []),
    }))
    const liveResources = resources.filter((resource) => resource.status !== 'Terminated' && resource.status !== 'Expired')
    const sellableCapacity = liveResources.reduce((sum, resource) => sum + resource.delivery.sellable, 0)
    const pendingCapacity = liveResources.reduce((sum, resource) => sum + resource.delivery.pending, 0)

    const totalCapacity = resources.reduce((sum, resource) => sum + resource.total_capacity, 0)
    const usedCapacity = resources.reduce((sum, resource) => sum + resource.used_capacity, 0)
    const hardCapacity = resources.reduce((sum, resource) => sum + resource.hard_capacity, 0)
    const softCapacity = resources.reduce((sum, resource) => sum + resource.soft_capacity, 0)

    const { data: ordersRaw, error: ordersError } = await supabase
        .from('sales_orders')
        .select('id, order_id, status, updated_at, customers(name)')
        .order('updated_at', { ascending: false })
    assertNoError(ordersError, 'Failed to load dashboard orders')

    const allOrders: RecentOrder[] = (ordersRaw ?? []).map((order: Record<string, unknown>) => ({
        id: order.id as string,
        order_id: order.order_id as string,
        status: order.status as SalesStatus,
        customer_name: (order.customers as { name: string } | null)?.name ?? null,
        updated_at: order.updated_at as string,
    }))

    const statusCounts: Partial<Record<SalesStatus, number>> = {}
    for (const order of allOrders) {
        statusCounts[order.status] = (statusCounts[order.status] ?? 0) + 1
    }

    const pipeline: PipelineItem[] = pipelineOrder
        .filter((status) => statusCounts[status])
        .map((status) => ({ status, count: statusCounts[status] ?? 0 }))

    const { data: expiringRaw, error: expiringError } = await supabase
        .from('sales_order_items')
        .select('end_date, sales_orders!inner(id, order_id, status, customers(name)), inventory_resources(resource_id)')
        .gte('end_date', todayStr)
        .lte('end_date', in90Str)
        .in('sales_orders.status', ['Active', 'Pre-sold'])
        .order('end_date', { ascending: true })
        .limit(10)
    assertNoError(expiringError, 'Failed to load expiring contracts')

    const expiring: ExpiringItem[] = (expiringRaw ?? []).map((item: Record<string, unknown>) => {
        const order = item.sales_orders as { id: string; order_id: string; customers: { name: string } | null } | null
        const resource = item.inventory_resources as { resource_id: string } | null
        const endDate = item.end_date as string
        const daysRemaining = Math.ceil((new Date(endDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        return {
            order_id: order?.order_id ?? '',
            customer_name: order?.customers?.name ?? null,
            resource_id: resource?.resource_id ?? null,
            end_date: endDate,
            days_remaining: daysRemaining,
            sales_order_id: order?.id ?? '',
        }
    })

    const { data: expiredRaw, error: expiredError } = await supabase
        .from('sales_orders')
        .select('id, order_id, customers(name)')
        .eq('status', 'Expired')
        .is('terminated_at', null)
        .limit(10)
    assertNoError(expiredError, 'Failed to load unreleased expired orders')

    const expiredUnreleased: ExpiredUnreleased[] = (expiredRaw ?? []).map((order: Record<string, unknown>) => ({
        id: order.id as string,
        order_id: order.order_id as string,
        customer_name: (order.customers as { name: string } | null)?.name ?? null,
        end_date: '',
    }))

    return {
        kpi: {
            totalResources: resources.length,
            totalCapacity,
            usedCapacity,
            activeOrders: allOrders.filter((order) => order.status === 'Active').length,
            expiringSoon: expiring.length,
            hardCapacity,
            softCapacity,
            rollingCount: rolling.length,
            sellableCapacity,
            pendingCapacity,
        },
        resources,
        pipeline,
        expiring,
        recent: allOrders.slice(0, 10),
        expiredUnreleased,
        rolling,
        revenue,
    }
}
