export interface SalesFormTypeConfig {
    disposal: boolean
    resource: boolean | 'terrestrial'
    capacity: boolean
    term: boolean
    mrc: boolean
}

export interface SalesItemStateLike {
    inventory_resource_id: string
    selectedCircuitIds: string[]
    existingCircuitIds: string[]
    circuitInterfaceOverrides: Record<string, string>
    capacity: string
    spec: string
    disposal_type: string
    term_months: string
    end_date: string
    sell_mrc: string
    sell_otc: string
    sell_om_rate: string
    sell_annual_om: string
}

export function applyItemTypeStateRules<T extends SalesItemStateLike>(
    item: T,
    nextType: string,
    fieldConfig: Record<string, SalesFormTypeConfig>,
): T {
    const cfg = fieldConfig[nextType] ?? fieldConfig.Other
    if (!cfg) return item

    const updated: T = { ...item }

    if (!cfg.resource) {
        updated.inventory_resource_id = ''
        updated.selectedCircuitIds = []
        updated.existingCircuitIds = []
        updated.circuitInterfaceOverrides = {}
    }

    if (!cfg.capacity) {
        updated.capacity = ''
        updated.spec = ''
    }

    if (!cfg.disposal) {
        updated.disposal_type = nextType === 'Cross-Connect' ? 'Lease Out' : 'IRU Out'
    }

    if (!cfg.term) {
        updated.term_months = ''
        updated.end_date = ''
    }

    if (!cfg.mrc) {
        updated.sell_mrc = ''
        updated.sell_otc = ''
        updated.sell_om_rate = ''
        updated.sell_annual_om = ''
    }

    return updated
}

export function applyResourceChangeState<T extends SalesItemStateLike>(
    item: T,
    resourceId: string,
    specFromResource?: string | null,
): T {
    return {
        ...item,
        inventory_resource_id: resourceId,
        spec: specFromResource || item.spec,
        selectedCircuitIds: [],
        existingCircuitIds: [],
        circuitInterfaceOverrides: {},
        capacity: '',
    }
}
