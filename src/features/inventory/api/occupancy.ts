import { supabase } from '@/lib/supabase'
import { assertNoError } from '@/lib/supabase-utils'
import { deriveContractState, localToday, type ContractState } from '@/lib/contract-state'
import {
    deliverySegments,
    occupancyBucket,
    summarizeDelivery,
    type DeliveryCircuit,
    type DeliverySegments,
    type DeliverySummary,
} from '@/lib/circuit-codes'

/** 每条资源的容量拆分：Inventory 列表、看板共用（资源详情用同一组纯函数在页面内算） */
export interface ResourceOccupancy {
    delivery: DeliverySummary
    segments: DeliverySegments
}

type MaybeRelation<T> = T | T[] | null

interface OccupancyItemRow {
    capacity: number | null
    end_date: string | null
    status: string | null
    disposal_type: string | null
    terminated_at: string | null
    contract_state: ContractState | null
    rolling_since: string | null
    notice_period_days: number | null
    notice_given_at: string | null
    inventory_resource_id: string | null
    sales_orders: MaybeRelation<{ status: string }>
}

function pickOne<T>(value: MaybeRelation<T> | undefined): T | null {
    if (Array.isArray(value)) return value[0] ?? null
    return value ?? null
}

/**
 * 按资源汇总：硬占用 / 软占用（滚动）/ 复用（自用）按订单行合同状态与处置类型；
 * 已交付 / 可售 / 交付中 / 未点亮按端口交付编号（migration 029）。
 */
export async function fetchResourceOccupancy(
    resources: Array<{ id: string; total_capacity: number | null }>,
): Promise<Map<string, ResourceOccupancy>> {
    const [{ data: itemsRaw, error: itemsError }, { data: circuitsRaw, error: circuitsError }] = await Promise.all([
        supabase
            .from('sales_order_items')
            .select('capacity, end_date, status, disposal_type, terminated_at, contract_state, rolling_since, notice_period_days, notice_given_at, inventory_resource_id, sales_orders!inner(status)')
            .not('inventory_resource_id', 'is', null),
        supabase
            .from('circuit_code_lookup')
            .select('inventory_resource_id, capacity, status, supplier_sr, juno_circuit_id, order_id'),
    ])
    assertNoError(itemsError, 'Failed to load contract states for occupancy')
    assertNoError(circuitsError, 'Failed to load circuit delivery status')

    const today = localToday()
    const buckets = new Map<string, { hard: number; soft: number; selfUse: number }>()
    for (const item of (itemsRaw ?? []) as unknown as OccupancyItemRow[]) {
        const derived = deriveContractState(item, pickOne(item.sales_orders)?.status, today)
        const bucket = occupancyBucket(item.disposal_type, derived.occupancy)
        if (!bucket || !item.inventory_resource_id) continue
        const entry = buckets.get(item.inventory_resource_id) ?? { hard: 0, soft: 0, selfUse: 0 }
        entry[bucket] += Number(item.capacity) || 0
        buckets.set(item.inventory_resource_id, entry)
    }

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

    const result = new Map<string, ResourceOccupancy>()
    for (const resource of resources) {
        const delivery = summarizeDelivery(Number(resource.total_capacity ?? 0), circuitsByResource.get(resource.id) ?? [])
        const b = buckets.get(resource.id) ?? { hard: 0, soft: 0, selfUse: 0 }
        result.set(resource.id, { delivery, segments: deliverySegments(b.hard, b.soft, delivery, b.selfUse) })
    }
    return result
}
