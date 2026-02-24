import type { RefObject } from 'react'
import { Filter, Search, Settings2, X } from 'lucide-react'
import { resourceStatusLabel } from '@/lib/status-styles'
import {
    inventoryAcquisitionFilterOptions,
    inventoryAllColumns,
    inventoryCostModeFilterOptions,
    inventoryProtectionFilterOptions,
    inventoryStatusFilterOptions,
    type InventoryPageFilters,
} from '@/features/inventory/inventory-page-config'

interface InventoryPageControlsProps {
    search: string
    onSearchChange: (value: string) => void
    showFilters: boolean
    activeFilterCount: number
    filters: InventoryPageFilters
    showColPicker: boolean
    visibleKeys: string[]
    columnGroups: string[]
    filterRef: RefObject<HTMLDivElement | null>
    pickerRef: RefObject<HTMLDivElement | null>
    onToggleFilterPanel: () => void
    onToggleColumnPanel: () => void
    onToggleFilter: (group: keyof InventoryPageFilters, value: string) => void
    onClearFilters: () => void
    onToggleColumn: (key: string) => void
    onResetColumns: () => void
}

function FilterChip({
    active,
    label,
    onClick,
}: {
    active: boolean
    label: string
    onClick: () => void
}) {
    return (
        <button
            onClick={onClick}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${active ? 'bg-primary text-primary-foreground' : 'bg-surface-hover text-text-muted hover:text-text'}`}
        >
            {label}
        </button>
    )
}

export function InventoryPageControls({
    search,
    onSearchChange,
    showFilters,
    activeFilterCount,
    filters,
    showColPicker,
    visibleKeys,
    columnGroups,
    filterRef,
    pickerRef,
    onToggleFilterPanel,
    onToggleColumnPanel,
    onToggleFilter,
    onClearFilters,
    onToggleColumn,
    onResetColumns,
}: InventoryPageControlsProps) {
    return (
        <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-dim" />
                <input
                    type="text"
                    placeholder="Search by ID, cable system, spec, route..."
                    value={search}
                    onChange={(event) => onSearchChange(event.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-text-dim"
                />
            </div>

            <div className="relative" ref={filterRef}>
                <button
                    onClick={onToggleFilterPanel}
                    className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-colors cursor-pointer ${showFilters || activeFilterCount > 0 ? 'border-primary text-primary bg-primary/5' : 'border-border text-text-muted hover:text-text hover:bg-surface-hover'}`}
                >
                    <Filter className="h-4 w-4" />
                    Filters
                    {activeFilterCount > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 bg-primary text-primary-foreground rounded-full text-xs font-bold">{activeFilterCount}</span>
                    )}
                </button>

                {showFilters && (
                    <div className="absolute left-0 top-full mt-2 w-72 bg-surface border border-border-subtle rounded-xl shadow-xl z-50 p-4 max-h-96 overflow-y-auto">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Filters</span>
                            {activeFilterCount > 0 && (
                                <button onClick={onClearFilters} className="text-xs text-primary hover:underline cursor-pointer flex items-center gap-1">
                                    <X className="h-3 w-3" /> Clear all
                                </button>
                            )}
                        </div>

                        <div className="mb-3">
                            <p className="text-xs text-text-dim font-medium mb-1.5">Status</p>
                            <div className="flex flex-wrap gap-1.5">
                                {inventoryStatusFilterOptions.map((status) => (
                                    <FilterChip
                                        key={status}
                                        active={filters.status.includes(status)}
                                        label={resourceStatusLabel[status as keyof typeof resourceStatusLabel] || status}
                                        onClick={() => onToggleFilter('status', status)}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="mb-3">
                            <p className="text-xs text-text-dim font-medium mb-1.5">Acquisition Type</p>
                            <div className="flex flex-wrap gap-1.5">
                                {inventoryAcquisitionFilterOptions.map((acquisitionType) => (
                                    <FilterChip
                                        key={acquisitionType}
                                        active={filters.acquisition.includes(acquisitionType)}
                                        label={acquisitionType}
                                        onClick={() => onToggleFilter('acquisition', acquisitionType)}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="mb-3">
                            <p className="text-xs text-text-dim font-medium mb-1.5">Protection</p>
                            <div className="flex flex-wrap gap-1.5">
                                {inventoryProtectionFilterOptions.map((protection) => (
                                    <FilterChip
                                        key={protection}
                                        active={filters.protection.includes(protection)}
                                        label={protection}
                                        onClick={() => onToggleFilter('protection', protection)}
                                    />
                                ))}
                            </div>
                        </div>

                        <div>
                            <p className="text-xs text-text-dim font-medium mb-1.5">Cost Mode</p>
                            <div className="flex flex-wrap gap-1.5">
                                {inventoryCostModeFilterOptions.map((costMode) => (
                                    <FilterChip
                                        key={costMode}
                                        active={filters.costMode.includes(costMode)}
                                        label={costMode}
                                        onClick={() => onToggleFilter('costMode', costMode)}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="relative" ref={pickerRef}>
                <button
                    onClick={onToggleColumnPanel}
                    className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-colors cursor-pointer ${showColPicker ? 'border-primary text-primary bg-primary/5' : 'border-border text-text-muted hover:text-text hover:bg-surface-hover'}`}
                    title="Choose columns"
                >
                    <Settings2 className="h-4 w-4" />
                    Columns
                </button>

                {showColPicker && (
                    <div className="absolute right-0 top-full mt-2 w-64 bg-surface border border-border-subtle rounded-xl shadow-xl z-50 p-3 max-h-96 overflow-y-auto">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Visible Columns</span>
                            <button onClick={onResetColumns} className="text-xs text-primary hover:underline cursor-pointer">Reset</button>
                        </div>

                        {columnGroups.map((group) => (
                            <div key={group} className="mb-3">
                                <p className="text-xs text-text-dim font-medium mb-1.5">{group}</p>
                                {inventoryAllColumns.filter((column) => column.group === group).map((column) => (
                                    <label key={column.key} className="flex items-center gap-2 py-1 px-1 rounded hover:bg-surface-hover cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={visibleKeys.includes(column.key)}
                                            onChange={() => onToggleColumn(column.key)}
                                            className="rounded border-border text-primary focus:ring-primary accent-[var(--color-primary)] cursor-pointer"
                                        />
                                        <span className="text-sm">{column.label}</span>
                                    </label>
                                ))}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
