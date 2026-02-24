import { formatDateOnly } from '@/lib/contract-utils'
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
} from './types'

const pipelineOrder: SalesStatus[] = ['Draft', 'Pre-sold', 'Active', 'Expired', 'Terminated', 'Cancelled']

export async function fetchDashboardData(): Promise<DashboardData> {
    const today = new Date()
    const in90Days = new Date(today)
    in90Days.setDate(in90Days.getDate() + 90)
    const todayStr = formatDateOnly(today)
    const in90Str = formatDateOnly(in90Days)

    const { data: resourcesRaw, error: resourcesError } = await supabase
        .from('inventory_resources')
        .select('resource_id, type, total_capacity, used_capacity, status, cable_system:cable_systems(name)')
        .order('resource_id')
    assertNoError(resourcesError, 'Failed to load dashboard resources')

    const resources: ResourceRow[] = (resourcesRaw ?? []).map((resource: Record<string, unknown>) => ({
        resource_id: resource.resource_id as string,
        type: resource.type as string,
        cable_system_name: (resource.cable_system as { name: string } | null)?.name ?? null,
        total_capacity: Number(resource.total_capacity ?? 0),
        used_capacity: Number(resource.used_capacity ?? 0),
        status: resource.status as string,
    }))

    const totalCapacity = resources.reduce((sum, resource) => sum + resource.total_capacity, 0)
    const usedCapacity = resources.reduce((sum, resource) => sum + resource.used_capacity, 0)

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
        },
        resources,
        pipeline,
        expiring,
        recent: allOrders.slice(0, 10),
        expiredUnreleased,
    }
}
