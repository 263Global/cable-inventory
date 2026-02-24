import type { ItemDraft } from '@/features/sales/form-helpers'
import { SALES_FIELD_CONFIG, isIruStyleDisposal } from '@/features/sales/sales-form-config'

interface SalesItemPricingFieldsProps {
    item: ItemDraft
    onUpdateItem: (uiId: string, field: keyof ItemDraft, value: string) => void
}

export function SalesItemPricingFields({
    item,
    onUpdateItem,
}: SalesItemPricingFieldsProps) {
    return (
        <div className="grid grid-cols-4 gap-4">
            {SALES_FIELD_CONFIG[item.type]?.disposal && isIruStyleDisposal(item.disposal_type) ? (
                <>
                    <div>
                        <label className="block text-xs text-text-dim mb-1">Sell OTC ($)</label>
                        <input
                            type="number"
                            value={item.sell_otc}
                            onChange={(event) => onUpdateItem(item.ui_id, 'sell_otc', event.target.value)}
                            className="w-full px-3 py-2 bg-background border border-border-subtle rounded-lg text-sm text-text focus:ring-1 focus:ring-primary focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-text-dim mb-1">O&M Rate (%)</label>
                        <input
                            type="number"
                            step="0.1"
                            value={item.sell_om_rate}
                            onChange={(event) => onUpdateItem(item.ui_id, 'sell_om_rate', event.target.value)}
                            className="w-full px-3 py-2 bg-background border border-border-subtle rounded-lg text-sm text-text focus:ring-1 focus:ring-primary focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-text-dim mb-1">Annual O&M ($)</label>
                        <input
                            type="number"
                            value={item.sell_annual_om}
                            onChange={(event) => onUpdateItem(item.ui_id, 'sell_annual_om', event.target.value)}
                            className="w-full px-3 py-2 bg-background border border-border-subtle rounded-lg text-sm text-text focus:ring-1 focus:ring-primary focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-text-dim mb-1">NRC ($)</label>
                        <input
                            type="number"
                            value={item.sell_nrc}
                            onChange={(event) => onUpdateItem(item.ui_id, 'sell_nrc', event.target.value)}
                            className="w-full px-3 py-2 bg-background border border-border-subtle rounded-lg text-sm text-text focus:ring-1 focus:ring-primary focus:outline-none"
                        />
                    </div>
                </>
            ) : (
                <>
                    {SALES_FIELD_CONFIG[item.type]?.mrc && (
                        <div>
                            <label className="block text-xs text-text-dim mb-1">Sell MRC ($)</label>
                            <input
                                type="number"
                                value={item.sell_mrc}
                                onChange={(event) => onUpdateItem(item.ui_id, 'sell_mrc', event.target.value)}
                                className="w-full px-3 py-2 bg-background border border-border-subtle rounded-lg text-sm text-text focus:ring-1 focus:ring-primary focus:outline-none"
                            />
                        </div>
                    )}
                    {SALES_FIELD_CONFIG[item.type]?.nrc && (
                        <div>
                            <label className="block text-xs text-text-dim mb-1">NRC ($)</label>
                            <input
                                type="number"
                                value={item.sell_nrc}
                                onChange={(event) => onUpdateItem(item.ui_id, 'sell_nrc', event.target.value)}
                                className="w-full px-3 py-2 bg-background border border-border-subtle rounded-lg text-sm text-text focus:ring-1 focus:ring-primary focus:outline-none"
                            />
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
