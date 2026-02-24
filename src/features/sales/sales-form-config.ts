import type { DisposalType, SalesItemType, SalesStatus } from '@/types'

export const SALES_STATUSES: SalesStatus[] = ['Draft', 'Pre-sold', 'Active', 'Expired', 'Terminated', 'Cancelled']
export const SALES_ITEM_TYPES: SalesItemType[] = ['Capacity', 'Backhaul', 'Cross-Connect', 'NRC', 'Other']

export interface SalesFormFieldConfig {
    disposal: boolean
    resource: boolean | 'terrestrial'
    circuits: boolean
    capacity: boolean
    description: 'optional' | 'required'
    term: boolean
    mrc: boolean
    nrc: boolean
}

export const SALES_FIELD_CONFIG: Record<string, SalesFormFieldConfig> = {
    'Capacity': { disposal: true, resource: true, circuits: true, capacity: true, description: 'optional', term: true, mrc: true, nrc: true },
    'Backhaul': { disposal: true, resource: 'terrestrial', circuits: true, capacity: true, description: 'optional', term: true, mrc: true, nrc: true },
    'Cross-Connect': { disposal: false, resource: false, circuits: false, capacity: false, description: 'required', term: true, mrc: true, nrc: true },
    'NRC': { disposal: false, resource: false, circuits: false, capacity: false, description: 'required', term: false, mrc: false, nrc: true },
    'Other': { disposal: false, resource: false, circuits: false, capacity: false, description: 'required', term: true, mrc: true, nrc: true },
}

export const SALES_DISPOSAL_TYPES: DisposalType[] = ['IRU Out', 'Lease Out', 'Swap Out', 'Self Use']

export function isIruStyleDisposal(disposalType: DisposalType): boolean {
    return disposalType === 'IRU Out' || disposalType === 'Swap Out'
}

export function canLinkInventoryByType(type: SalesItemType): boolean {
    return Boolean(SALES_FIELD_CONFIG[type]?.resource)
}
