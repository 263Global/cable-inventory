/**
 * Bulk Operations Module
 * Handles batch selection and export for Sales and Inventory
 */

/**
 * Initializes bulk operations methods and binds them to the App object
 * @param {Object} App - The main application object
 */
function initBulkOpsModule(App) {

    // ============ Sales Bulk Operations ============

    App.enterSalesSelectionMode = function () {
        this._salesSelectionMode = true;
        this._selectedSales.clear();
        this.headerActions.innerHTML = '';
        this.renderSales();
    };

    App.exitSalesSelectionMode = function () {
        this._salesSelectionMode = false;
        this._selectedSales.clear();
        this.headerActions.innerHTML = '';
        this.renderSales();
    };

    App.updateSalesBulkToolbar = function () {
        const countEl = document.getElementById('sales-selection-count');
        if (countEl) {
            countEl.textContent = this._selectedSales.size;
        }
        // Enable/disable buttons based on selection
        const exportBtn = document.querySelector('#sales-bulk-toolbar .btn-secondary');
        if (exportBtn) exportBtn.disabled = this._selectedSales.size === 0;
    };

    App.exportSelectedSales = function () {
        if (this._selectedSales.size === 0) {
            alert('No items selected. Please select at least one order.');
            return;
        }

        const sales = window.Store.getSales().filter(s => this._selectedSales.has(s.salesOrderId));

        const headers = [
            'Order ID', 'Customer', 'Status', 'Sales Model', 'Sales Type',
            'Capacity', 'Unit', 'Monthly Revenue (Unified)', 'MRC Sales', 'NRC Sales', 'Salesperson',
            'Start Date', 'End Date', 'Term (Months)'
        ];

        const rows = sales.map(s => {
            const computed = computeOrderFinancials(s);
            return [
                s.salesOrderId,
                s.customerName || '',
                s.status || '',
                s.salesModel || '',
                s.salesType || '',
                s.capacity?.value || '',
                s.capacity?.unit || 'Gbps',
                computed.monthlyRevenue || 0,
                s.financials?.mrcSales || 0,
                s.financials?.nrcSales || 0,
                s.salesperson || '',
                s.dates?.start || '',
                s.dates?.end || '',
                s.dates?.term || ''
            ];
        });

        const csvContent = [headers, ...rows]
            .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            .join('\n');

        this.downloadCSV(csvContent, `sales_selected_${new Date().toISOString().slice(0, 10)}.csv`);
        alert(`Exported ${sales.length} selected orders.`);
    };

    App.clearSalesSelection = function () {
        this._selectedSales.clear();
        document.querySelectorAll('.sales-row-checkbox').forEach(cb => {
            cb.checked = false;
            cb.closest('tr')?.classList.remove('row-selected');
        });
        const selectAll = document.getElementById('sales-select-all');
        if (selectAll) selectAll.checked = false;
        this.updateSalesBulkToolbar();
    };

    // ============ Inventory Bulk Operations ============

    App.enterInventorySelectionMode = function () {
        this._inventorySelectionMode = true;
        this._selectedInventory.clear();
        this.headerActions.innerHTML = '';
        this.renderInventory();
    };

    App.exitInventorySelectionMode = function () {
        this._inventorySelectionMode = false;
        this._selectedInventory.clear();
        this.headerActions.innerHTML = '';
        this.renderInventory();
    };

    App.updateInventoryBulkToolbar = function () {
        const countEl = document.getElementById('inventory-selection-count');
        if (countEl) {
            countEl.textContent = this._selectedInventory.size;
        }
        // Enable/disable buttons based on selection
        const exportBtn = document.querySelector('#inventory-bulk-toolbar .btn-secondary');
        if (exportBtn) exportBtn.disabled = this._selectedInventory.size === 0;
    };

    App.exportSelectedInventory = function () {
        if (this._selectedInventory.size === 0) {
            alert('No items selected. Please select at least one resource.');
            return;
        }

        const inventory = window.Store.getInventory().filter(i => this._selectedInventory.has(i.resourceId));

        const headers = [
            'Resource ID', 'Cable System', 'Status', 'Acquisition Type', 'Ownership',
            'Capacity', 'Unit', 'MRC', 'OTC/NRC', 'A-End City', 'Z-End City',
            'Start Date', 'End Date'
        ];

        const rows = inventory.map(i => [
            i.resourceId,
            i.cableSystem || '',
            i.status || '',
            i.acquisition?.type || '',
            i.acquisition?.ownership || '',
            i.capacity?.value || '',
            i.capacity?.unit || 'Gbps',
            i.financials?.mrc || 0,
            (i.acquisition?.ownership === 'IRU' ? i.financials?.otc : i.financials?.nrc) || 0,
            i.location?.aEnd?.city || '',
            i.location?.zEnd?.city || '',
            i.dates?.start || '',
            i.dates?.end || ''
        ]);

        const csvContent = [headers, ...rows]
            .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            .join('\n');

        this.downloadCSV(csvContent, `inventory_selected_${new Date().toISOString().slice(0, 10)}.csv`);
        alert(`Exported ${inventory.length} selected resources.`);
    };

    App.clearInventorySelection = function () {
        this._selectedInventory.clear();
        document.querySelectorAll('.inventory-row-checkbox').forEach(cb => {
            cb.checked = false;
            cb.closest('tr')?.classList.remove('row-selected');
        });
        const selectAll = document.getElementById('inventory-select-all');
        if (selectAll) selectAll.checked = false;
        this.updateInventoryBulkToolbar();
    };
}

// Export initializer to global scope
window.initBulkOpsModule = initBulkOpsModule;
