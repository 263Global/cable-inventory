import { SearchableSelect } from '@/components/ui/SearchableSelect'
import type { SalesFormResource } from '@/features/sales/form-api'
import type { ItemDraft } from '@/features/sales/form-helpers'
import {
    canLinkInventoryByType,
    SALES_DISPOSAL_TYPES,
    SALES_FIELD_CONFIG,
    SALES_ITEM_TYPES,
} from '@/features/sales/sales-form-config'

interface SalesItemBasicsProps {
    item: ItemDraft
    resources: SalesFormResource[]
    onUpdateItem: (uiId: string, field: keyof ItemDraft, value: string) => void
    onUpdateItemResource: (uiId: string, resourceId: string) => void
}

function isResourceTypeMatched(itemType: ItemDraft['type'], resourceType: string): boolean {
    return SALES_FIELD_CONFIG[itemType]?.resource === 'terrestrial'
        ? resourceType === 'Terrestrial'
        : resourceType === 'Capacity'
}

function mapResourceOption(resource: SalesFormResource) {
    const route = resource.type === 'Terrestrial'
        ? [resource.handover_a_name, resource.handover_z_name].filter(Boolean).join(' → ') || resource.route_description || ''
        : resource.landing_a_name && resource.landing_z_name
            ? `${resource.landing_a_name} → ${resource.landing_z_name}`
            : resource.route_description || ''

    const avail = resource.total_capacity
        ? `${resource.total_capacity - (resource.used_capacity ?? 0)}G avail / ${resource.total_capacity}G`
        : ''

    const sublabel = [route, avail].filter(Boolean).join(' | ')
    return {
        value: resource.id,
        label: `${resource.resource_id} | ${resource.cable_system_name || resource.type} ${resource.spec || ''}`,
        sublabel: sublabel || undefined,
    }
}

export function SalesItemBasics({
    item,
    resources,
    onUpdateItem,
    onUpdateItemResource,
}: SalesItemBasicsProps) {
    return (
        <div className="grid grid-cols-3 gap-4">
            <div>
                <label className="block text-xs text-text-dim mb-1">Type</label>
                <select
                    value={item.type}
                    onChange={(event) => onUpdateItem(item.ui_id, 'type', event.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border-subtle rounded-lg text-sm text-text focus:ring-1 focus:ring-primary focus:outline-none"
                >
                    {SALES_ITEM_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
            </div>

            {(SALES_FIELD_CONFIG[item.type]?.disposal ?? false) && (
                <div>
                    <label className="block text-xs text-text-dim mb-1">Disposal Type</label>
                    <select
                        value={item.disposal_type}
                        onChange={(event) => onUpdateItem(item.ui_id, 'disposal_type', event.target.value)}
                        className="w-full px-3 py-2 bg-background border border-border-subtle rounded-lg text-sm text-text focus:ring-1 focus:ring-primary focus:outline-none"
                    >
                        {SALES_DISPOSAL_TYPES.map((disposalType) => <option key={disposalType} value={disposalType}>{disposalType}</option>)}
                    </select>
                </div>
            )}

            {canLinkInventoryByType(item.type) ? (
                <div>
                    <label className="block text-xs text-text-dim mb-1">Inventory Resource</label>
                    <SearchableSelect
                        options={resources
                            .filter((resource) => isResourceTypeMatched(item.type, resource.type))
                            .map(mapResourceOption)}
                        value={item.inventory_resource_id}
                        onChange={(value) => onUpdateItemResource(item.ui_id, value)}
                        placeholder="Select resource..."
                    />
                </div>
            ) : (
                <div className={!SALES_FIELD_CONFIG[item.type]?.disposal ? 'col-span-2' : ''}>
                    <label className="block text-xs text-text-dim mb-1">
                        Description {SALES_FIELD_CONFIG[item.type]?.description === 'required' && <span className="text-destructive">*</span>}
                    </label>
                    <input
                        type="text"
                        value={item.description}
                        onChange={(event) => onUpdateItem(item.ui_id, 'description', event.target.value)}
                        placeholder="e.g. 楼内线 中环17楼"
                        className="w-full px-3 py-2 bg-background border border-border-subtle rounded-lg text-sm text-text placeholder:text-text-dim focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                </div>
            )}
        </div>
    )
}
