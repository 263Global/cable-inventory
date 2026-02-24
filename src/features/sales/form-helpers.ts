import type { DisposalType, SalesItemType, SalesOrderItem, SalesStatus } from '@/types'
import type { OrderItemWritePayload } from '@/features/sales/api/items'

export interface ItemDraft {
    ui_id: string
    id?: string
    type: SalesItemType
    inventory_resource_id: string
    description: string
    disposal_type: DisposalType
    capacity: string
    spec: string
    start_date: string
    end_date: string
    term_months: string
    sell_otc: string
    sell_mrc: string
    sell_nrc: string
    sell_om_rate: string
    sell_annual_om: string
    status: SalesStatus
    selectedCircuitIds: string[]
    existingCircuitIds: string[]
}

export interface ItemPayload extends OrderItemWritePayload {
    sales_order_id: string
}

export function createDraftId(seed?: string): string {
    if (seed) return `item-${seed}`
    return `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function createEmptyItemDraft(): ItemDraft {
    return {
        ui_id: createDraftId(),
        type: 'Capacity',
        inventory_resource_id: '',
        description: '',
        disposal_type: 'Lease Out',
        capacity: '',
        spec: '',
        start_date: '',
        end_date: '',
        term_months: '',
        sell_otc: '',
        sell_mrc: '',
        sell_nrc: '',
        sell_om_rate: '4',
        sell_annual_om: '',
        status: 'Draft',
        selectedCircuitIds: [],
        existingCircuitIds: [],
    }
}

export function mapSalesOrderItemToDraft(item: SalesOrderItem): ItemDraft {
    const circuitIds = (item.allocated_circuits ?? []).map((c) => c.inventory_circuit_id)
    return {
        ui_id: createDraftId(item.id),
        id: item.id,
        type: item.type,
        inventory_resource_id: item.inventory_resource_id ?? '',
        description: item.description ?? '',
        disposal_type: item.disposal_type ?? 'Lease Out',
        capacity: item.capacity?.toString() ?? '',
        spec: item.spec ?? '',
        start_date: item.start_date ?? '',
        end_date: item.end_date ?? '',
        term_months: item.term_months?.toString() ?? '',
        sell_otc: item.sell_otc?.toString() ?? '',
        sell_mrc: item.sell_mrc?.toString() ?? '',
        sell_nrc: item.sell_nrc?.toString() ?? '',
        sell_om_rate: item.sell_om_rate?.toString() ?? '4',
        sell_annual_om: item.sell_annual_om?.toString() ?? '',
        status: item.status,
        selectedCircuitIds: circuitIds,
        existingCircuitIds: circuitIds,
    }
}

export function buildOrderItemPayload(item: ItemDraft, salesOrderId: string): ItemPayload {
    return {
        sales_order_id: salesOrderId,
        type: item.type,
        inventory_resource_id: item.inventory_resource_id || undefined,
        description: item.description || undefined,
        disposal_type: item.disposal_type,
        capacity: item.capacity ? parseFloat(item.capacity) : undefined,
        spec: item.spec || undefined,
        start_date: item.start_date || undefined,
        end_date: item.end_date || undefined,
        term_months: item.term_months ? parseInt(item.term_months, 10) : undefined,
        sell_otc: item.sell_otc ? parseFloat(item.sell_otc) : undefined,
        sell_mrc: item.sell_mrc ? parseFloat(item.sell_mrc) : undefined,
        sell_nrc: item.sell_nrc ? parseFloat(item.sell_nrc) : undefined,
        sell_om_rate: item.sell_om_rate ? parseFloat(item.sell_om_rate) : undefined,
        sell_annual_om: item.sell_annual_om ? parseFloat(item.sell_annual_om) : undefined,
        status: item.status,
    }
}
