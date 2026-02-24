import type { SalesStatus } from '@/types'

export interface KPI {
    totalResources: number
    totalCapacity: number
    usedCapacity: number
    activeOrders: number
    expiringSoon: number
}

export interface ResourceRow {
    resource_id: string
    type: string
    cable_system_name: string | null
    total_capacity: number
    used_capacity: number
    status: string
}

export interface PipelineItem {
    status: SalesStatus
    count: number
}

export interface ExpiringItem {
    order_id: string
    customer_name: string | null
    resource_id: string | null
    end_date: string
    days_remaining: number
    sales_order_id: string
}

export interface RecentOrder {
    id: string
    order_id: string
    customer_name: string | null
    status: SalesStatus
    updated_at: string
}

export interface ExpiredUnreleased {
    id: string
    order_id: string
    customer_name: string | null
    end_date: string
}

export interface DashboardData {
    kpi: KPI
    resources: ResourceRow[]
    pipeline: PipelineItem[]
    expiring: ExpiringItem[]
    recent: RecentOrder[]
    expiredUnreleased: ExpiredUnreleased[]
}

export const EMPTY_DASHBOARD_DATA: DashboardData = {
    kpi: {
        totalResources: 0,
        totalCapacity: 0,
        usedCapacity: 0,
        activeOrders: 0,
        expiringSoon: 0,
    },
    resources: [],
    pipeline: [],
    expiring: [],
    recent: [],
    expiredUnreleased: [],
}
