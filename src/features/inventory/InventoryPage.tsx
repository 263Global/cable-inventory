import { Package, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { InventoryPageControls } from '@/features/inventory/components/InventoryPageControls'
import { InventoryPageTable } from '@/features/inventory/components/InventoryPageTable'
import { inventoryTypeTabs } from '@/features/inventory/inventory-page-config'
import { useInventoryPageController } from '@/features/inventory/useInventoryPageController'

export function InventoryPage() {
    const navigate = useNavigate()
    const {
        activeTab,
        data,
        search,
        showFilters,
        activeFilterCount,
        filters,
        showColPicker,
        visibleKeys,
        columnGroups,
        filterRef,
        pickerRef,
        activeColumns,
        filteredData,
        loading,
        deleteTarget,
        deleteMessage,
        deleting,
        setActiveTab,
        setSearch,
        setShowFilters,
        setShowColPicker,
        setDeleteTarget,
        toggleFilter,
        clearFilters,
        toggleKey,
        reset,
        requestDeleteResource,
        confirmDeleteResource,
    } = useInventoryPageController()

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <Package className="h-7 w-7 text-primary" />
                    <h1 className="text-2xl font-bold">Inventory</h1>
                    <span className="text-sm text-text-dim ml-2">{data.length} resources</span>
                </div>

                <button
                    onClick={() => navigate('/inventory/new')}
                    className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover text-primary-foreground rounded-lg text-sm font-medium transition-colors cursor-pointer"
                >
                    <Plus className="h-4 w-4" />
                    Add Resource
                </button>
            </div>

            <div className="flex gap-1 mb-6 border-b border-border-subtle">
                {inventoryTypeTabs.map((tab) => (
                    <button
                        key={tab.filter}
                        onClick={() => setActiveTab(tab.filter)}
                        className={`px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer border-b-2 ${activeTab === tab.filter
                            ? 'border-primary text-primary'
                            : 'border-transparent text-text-muted hover:text-text'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <InventoryPageControls
                search={search}
                onSearchChange={setSearch}
                showFilters={showFilters}
                activeFilterCount={activeFilterCount}
                filters={filters}
                showColPicker={showColPicker}
                visibleKeys={visibleKeys}
                columnGroups={columnGroups}
                filterRef={filterRef}
                pickerRef={pickerRef}
                onToggleFilterPanel={() => setShowFilters((state) => !state)}
                onToggleColumnPanel={() => setShowColPicker((state) => !state)}
                onToggleFilter={toggleFilter}
                onClearFilters={clearFilters}
                onToggleColumn={toggleKey}
                onResetColumns={reset}
            />

            <InventoryPageTable
                loading={loading}
                dataCount={data.length}
                filteredData={filteredData}
                activeColumns={activeColumns}
                search={search}
                onOpenDetail={(resourceId) => navigate(`/inventory/${resourceId}`)}
                onRequestDelete={requestDeleteResource}
            />

            <ConfirmDialog
                open={!!deleteTarget}
                title={`Delete ${deleteTarget?.resource_id ?? 'resource'}?`}
                message={deleteMessage}
                confirmLabel="Delete Resource"
                variant="danger"
                loading={deleting}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={confirmDeleteResource}
            />
        </div>
    )
}
