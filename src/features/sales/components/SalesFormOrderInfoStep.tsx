import { ArrowRight } from 'lucide-react'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import type { SalesStatus } from '@/types'
import type { SalesFormCustomer } from '@/features/sales/form-api'
import { SALES_STATUSES } from '@/features/sales/sales-form-config'

interface SalesFormOrderInfoStepProps {
    customers: SalesFormCustomer[]
    customerId: string
    status: SalesStatus
    internalRef: string
    notes: string
    onCustomerChange: (value: string) => void
    onStatusChange: (value: SalesStatus) => void
    onInternalRefChange: (value: string) => void
    onNotesChange: (value: string) => void
    onNext: () => void
}

export function SalesFormOrderInfoStep({
    customers,
    customerId,
    status,
    internalRef,
    notes,
    onCustomerChange,
    onStatusChange,
    onInternalRefChange,
    onNotesChange,
    onNext,
}: SalesFormOrderInfoStepProps) {
    return (
        <div className="bg-surface rounded-xl border border-border-subtle p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-text-muted mb-1">Customer *</label>
                    <SearchableSelect
                        options={customers.map((customer) => ({ value: customer.id, label: customer.name }))}
                        value={customerId}
                        onChange={onCustomerChange}
                        placeholder="Search customer..."
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-muted mb-1">Status</label>
                    <select
                        value={status}
                        onChange={(e) => onStatusChange(e.target.value as SalesStatus)}
                        className="w-full px-3 py-2 bg-background border border-border-subtle rounded-lg text-sm text-text focus:ring-1 focus:ring-primary focus:outline-none"
                    >
                        {SALES_STATUSES.map((statusValue) => <option key={statusValue} value={statusValue}>{statusValue}</option>)}
                    </select>
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-text-muted mb-1">Internal Ref (optional)</label>
                <input
                    type="text"
                    value={internalRef}
                    onChange={(e) => onInternalRefChange(e.target.value)}
                    placeholder="Your internal order number"
                    className="w-full px-3 py-2 bg-background border border-border-subtle rounded-lg text-sm text-text placeholder:text-text-dim focus:ring-1 focus:ring-primary focus:outline-none"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-text-muted mb-1">Notes</label>
                <textarea
                    value={notes}
                    onChange={(e) => onNotesChange(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 bg-background border border-border-subtle rounded-lg text-sm text-text placeholder:text-text-dim focus:ring-1 focus:ring-primary focus:outline-none resize-none"
                />
            </div>
            <div className="flex justify-end">
                <button
                    onClick={onNext}
                    className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                >
                    Next <ArrowRight className="h-4 w-4" />
                </button>
            </div>
        </div>
    )
}
