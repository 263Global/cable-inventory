import type { DerivedContractState } from '@/lib/contract-state'
import type { SalesStatus } from '@/types'
import type { DeliverySummary } from '@/lib/circuit-codes'

export interface KPI {
    totalResources: number
    totalCapacity: number
    usedCapacity: number
    activeOrders: number
    expiringSoon: number
    /** 合同期内占用（硬占用） */
    hardCapacity: number
    /** 滚动续期 / 已通知占用（软占用） */
    softCapacity: number
    rollingCount: number
    /** 已交付且空闲（按交付编号判定的资源） */
    sellableCapacity: number
    /** 已点亮但还没交付给我们 */
    pendingCapacity: number
}

export interface ResourceRow {
    resource_id: string
    type: string
    cable_system_name: string | null
    total_capacity: number
    used_capacity: number
    hard_capacity: number
    soft_capacity: number
    status: string
    /** 合同 / 点亮 / 交付 / 可售 / 交付中 拆分（migration 029 交付编号） */
    delivery: DeliverySummary
}

export interface RollingContract {
    sales_order_item_id: string
    sales_order_id: string
    order_id: string
    customer_name: string | null
    resource_id: string | null
    capacity: number
    sell_mrc: number | null
    end_date: string | null
    contract: DerivedContractState
}

export interface RevenueSummary {
    /** 合同期内 MRC 合计（月） */
    inTermMrc: number
    /** 滚动 / 已通知 MRC 合计（月） */
    rollingMrc: number
    /** 未来 12 个月确定的经常性收入：合同期内按剩余月数，滚动只计 1 个月 */
    committed12m: number
    /** 如果把滚动合同也按 12 个月算会是多少（用于对比"不确定部分"） */
    naive12m: number
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
    rolling: RollingContract[]
    revenue: RevenueSummary
}

export const EMPTY_DASHBOARD_DATA: DashboardData = {
    kpi: {
        totalResources: 0,
        totalCapacity: 0,
        usedCapacity: 0,
        activeOrders: 0,
        expiringSoon: 0,
        hardCapacity: 0,
        softCapacity: 0,
        rollingCount: 0,
        sellableCapacity: 0,
        pendingCapacity: 0,
    },
    resources: [],
    pipeline: [],
    expiring: [],
    recent: [],
    expiredUnreleased: [],
    rolling: [],
    revenue: { inTermMrc: 0, rollingMrc: 0, committed12m: 0, naive12m: 0 },
}
