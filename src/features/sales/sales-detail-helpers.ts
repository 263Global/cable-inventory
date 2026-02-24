import { calcEndDateFromTerm, nextDay, todayDateOnly } from '@/lib/contract-utils'
import type { SalesOrderItem } from '@/types'

export interface TerminateItemDraft {
    itemId: string
    label: string
    selected: boolean
    fee: number
}

export interface ReleaseItemDraft {
    itemId: string
    label: string
    selected: boolean
}

export interface RenewItemDraft {
    itemId: string
    label: string
    selected: boolean
    startDate: string
    termMonths: number
    endDate: string
    mrc: number
    nrc: number
}

function buildSalesItemLabel(item: SalesOrderItem): string {
    if (item.resource_id) {
        return `${item.type} (${item.resource_id})`
    }
    if (item.description) {
        return `${item.type} — ${item.description}`
    }
    return item.type
}

export function createTerminateItems(items: SalesOrderItem[]): TerminateItemDraft[] {
    return items
        .filter((item) => item.status !== 'Terminated' && item.status !== 'Cancelled')
        .map((item) => ({
            itemId: item.id,
            label: buildSalesItemLabel(item),
            selected: true,
            fee: 0,
        }))
}

export function createReleaseItems(items: SalesOrderItem[]): ReleaseItemDraft[] {
    return items
        .filter((item) => item.status !== 'Terminated' && item.status !== 'Cancelled')
        .map((item) => ({
            itemId: item.id,
            label: buildSalesItemLabel(item),
            selected: true,
        }))
}

export function createRenewItems(items: SalesOrderItem[]): RenewItemDraft[] {
    return items
        .filter((item) => item.disposal_type === 'Lease Out' || item.disposal_type === 'Swap Out')
        .map((item) => {
            const startDate = item.end_date
                ? nextDay(item.end_date)
                : todayDateOnly()
            const termMonths = item.term_months ?? 12
            return {
                itemId: item.id,
                label: buildSalesItemLabel(item),
                selected: true,
                startDate,
                termMonths,
                endDate: calcEndDateFromTerm(startDate, termMonths),
                mrc: Number(item.sell_mrc ?? 0),
                nrc: 0,
            }
        })
}
