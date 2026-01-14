/**
 * App.js
 * Main application logic for Cable Inventory Manager
 * 
 * Structure:
 * - Core (init, DOM caching, events, theme)
 * - Navigation & Views
 * - Dashboard (ES6 module: modules/dashboard.js)
 * - Modal System
 * - Sales Order Form & Financials
 * - Inventory Management
 * - Sales Management
 * - Bulk Operations
 * - CRM (Customers & Suppliers)
 * - CSV Export (delegated to modules/csv.js)
 * 
 * External Dependencies:
 * - modules/financials.js: computeOrderFinancials()
 * - modules/validation.js: validateSalesForm()
 * - modules/csv.js: CsvExport.exportSalesToCSV(), CsvExport.exportInventoryToCSV()
 * - modules/dashboard.js: renderDashboard() [ES6 Module]
 */

// ES6 Module Imports
import { renderDashboard as renderDashboardModule } from './modules/dashboard.js';
import {
    renderInventory as renderInventoryModule,
    viewInventoryDetails as viewInventoryDetailsModule,
    openInventoryModal as openInventoryModalModule,
    attachInventoryFormListeners as attachInventoryFormListenersModule
} from './modules/inventory.js';
import {
    renderSales as renderSalesModule,
    viewSalesDetails as viewSalesDetailsModule,
    editSalesOrder as editSalesOrderModule
} from './modules/sales.js';
import {
    openAddSalesModal as openAddSalesModalModule,
    attachSalesFormListeners as attachSalesFormListenersModule,
    calculateSalesFinancials as calculateSalesFinancialsModule,
    handleSalesSubmit as handleSalesSubmitModule,
    openRenewModal as openRenewModalModule
} from './modules/salesForm.js';

// ============================================================================
// REGION: App Object Definition
// ============================================================================
//#region App Core

const App = {
    init() {
        // Initialize external modules
        if (window.initCustomersModule) window.initCustomersModule(this);
        if (window.initSuppliersModule) window.initSuppliersModule(this);
        if (window.initBulkOpsModule) window.initBulkOpsModule(this);
        this.cacheDOM();
        this.bindEvents();
        this.initTheme();
        this.renderView('dashboard');
        // Selection state
        this._selectedSales = new Set();
        this._selectedInventory = new Set();
        this._salesSelectionMode = false;
        this._inventorySelectionMode = false;
    },

    cacheDOM() {
        this.container = document.getElementById('content-container');
        this.pageTitle = document.getElementById('page-title');
        this.navItems = document.querySelectorAll('.nav-item[data-view]'); // Only select view items
        this.headerActions = document.getElementById('header-actions');
        this.modalContainer = document.getElementById('modal-container');
        this.themeToggle = document.getElementById('theme-toggle');
        this.themeLabel = document.getElementById('theme-label');
        this.themeIcon = this.themeToggle.querySelector('ion-icon');
    },

    bindEvents() {
        this.navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                // Update Active State
                this.navItems.forEach(n => n.classList.remove('active'));
                e.currentTarget.classList.add('active');

                // Switch View
                const view = e.currentTarget.dataset.view;
                this.renderView(view);
            });
        });

        this.themeToggle.addEventListener('click', () => this.toggleTheme());
    },

    initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeUI(savedTheme);
    },

    toggleTheme() {
        const currentHook = document.documentElement.getAttribute('data-theme');
        const newTheme = currentHook === 'dark' ? 'light' : 'dark';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        this.updateThemeUI(newTheme);
    },

    updateThemeUI(theme) {
        const isDark = theme === 'dark';
        const iconName = isDark ? 'moon-outline' : 'sunny-outline';
        const labelText = isDark ? 'Dark Mode' : 'Light Mode';

        // Update desktop sidebar theme toggle
        if (this.themeLabel) this.themeLabel.textContent = labelText;
        if (this.themeIcon) this.themeIcon.setAttribute('name', iconName);

        // Update mobile theme toggle in user menu
        const mobileThemeIcon = document.getElementById('mobile-theme-icon');
        const mobileThemeLabel = document.getElementById('mobile-theme-label');
        if (mobileThemeIcon) mobileThemeIcon.setAttribute('name', iconName);
        if (mobileThemeLabel) mobileThemeLabel.textContent = labelText;
    },

    async deleteInventoryItem(id) {
        if (confirm('Are you sure you want to delete this resource?')) {
            await window.Store.deleteInventory(id);
            this.renderInventoryView();
        }
    },

    async deleteSalesOrder(id) {
        if (confirm('Are you sure you want to delete this sales order?')) {
            await window.Store.deleteSalesOrder(id);
            this.renderView('sales');
        }
    },

    renderView(viewName) {
        this.container.innerHTML = ''; // Clear container
        this.headerActions.innerHTML = ''; // Clear actions

        // Manage FAB based on view
        this.updateFAB(viewName);

        switch (viewName) {
            case 'dashboard':
                this.pageTitle.textContent = 'Operational Dashboard';
                this.renderDashboard();
                break;
            case 'inventory':
                this.pageTitle.textContent = 'Inventory Resources';
                this.renderInventory();
                break;
            case 'sales':
                this.pageTitle.textContent = 'Sales & Revenue';
                this.renderSales();
                break;
            case 'customers':
                this.pageTitle.textContent = 'Customers';
                this.renderCustomers();
                break;
            case 'suppliers':
                this.pageTitle.textContent = 'Suppliers';
                this.renderSuppliers();
                break;
            default:
                this.pageTitle.textContent = 'Operational Dashboard';
                this.renderDashboard();
        }
    },

    // Floating Action Button management
    updateFAB(viewName) {
        let fab = document.getElementById('mobile-fab');

        // Remove existing FAB if present
        if (fab) {
            fab.remove();
        }

        // Views that should show FAB
        const fabViews = ['inventory', 'sales', 'customers', 'suppliers'];

        if (fabViews.includes(viewName)) {
            fab = document.createElement('button');
            fab.id = 'mobile-fab';
            fab.className = 'fab show';
            fab.innerHTML = '<ion-icon name="add-outline"></ion-icon>';

            switch (viewName) {
                case 'inventory':
                    fab.onclick = () => this.openInventoryModal();
                    fab.title = 'Add Resource';
                    break;
                case 'sales':
                    fab.onclick = () => this.openAddSalesModal();
                    fab.title = 'New Sale';
                    break;
                case 'customers':
                    fab.onclick = () => this.openCustomerModal();
                    fab.title = 'Add Customer';
                    break;
                case 'suppliers':
                    fab.onclick = () => this.openSupplierModal();
                    fab.title = 'Add Supplier';
                    break;
            }

            document.body.appendChild(fab);
        }
    },

    navigateToView(viewName, options = {}) {
        // Store pending filter for the view to pick up
        this._pendingFilter = options.filter || null;

        // Update nav item active state
        this.navItems.forEach(n => {
            n.classList.remove('active');
            if (n.dataset.view === viewName) {
                n.classList.add('active');
            }
        });

        // Render the view
        this.renderView(viewName);
    },

    //#endregion Core

    // ========================================================================
    // REGION: Dashboard
    // ========================================================================
    //#region Dashboard

    renderDashboard() {
        // Delegated to ES6 module: modules/dashboard.js
        renderDashboardModule(this);
    },
    //#endregion Dashboard

    // ========================================================================
    // REGION: Modal System
    // ========================================================================
    //#region Modal System

    /* ================= Modal System ================= */

    /* ================= Sales Form (Delegated to ES6 Module) ================= */

    openAddSalesModal(existingOrderId = null) {
        openAddSalesModalModule(this, existingOrderId);
    },

    attachSalesFormListeners() {
        attachSalesFormListenersModule(this);
    },

    calculateSalesFinancials() {
        calculateSalesFinancialsModule(this);
    },

    async handleSalesSubmit(form) {
        return await handleSalesSubmitModule(this, form);
    },


    openModal(title, content, onSave, isLarge = false) {
        this.modalContainer.innerHTML = `
            <div class="modal-backdrop" id="modal-backdrop">
                <div class="modal ${isLarge ? 'modal-lg' : ''}">
                    <div class="modal-header">
                        <h3>${title}</h3>
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            ${onSave ? `
                                <button type="button" class="btn btn-secondary" id="modal-cancel">Cancel</button>
                                <button type="button" class="btn btn-primary" id="modal-save">Save changes</button>
                            ` : `
                                <button type="button" class="btn btn-secondary" id="modal-cancel">Close</button>
                            `}
                            <button class="btn-icon" id="modal-close"><ion-icon name="close-outline"></ion-icon></button>
                        </div>
                    </div>
                    <div class="modal-body">
                        <form id="modal-form">
                            ${content}
                        </form>
                    </div>
                </div>
            </div>
        `;

        // Bind Events
        const closeBtn = document.getElementById('modal-close');
        const cancelBtn = document.getElementById('modal-cancel');
        const saveBtn = document.getElementById('modal-save');
        const backdrop = document.getElementById('modal-backdrop');
        const form = document.getElementById('modal-form');

        const close = () => {
            this.modalContainer.innerHTML = '';
        };

        closeBtn.addEventListener('click', close);
        cancelBtn.addEventListener('click', close);

        saveBtn.addEventListener('click', async () => {
            if (onSave && typeof onSave === 'function') {
                const result = await onSave(form);
                // Only close if onSave returns true or undefined (not explicitly false)
                if (result !== false) {
                    close();
                }
            }
        });

        backdrop.addEventListener('click', (e) => {
            if (e.target.id === 'modal-backdrop') {
                close();
            }
        });
    },

    closeModal() {
        this.modalContainer.innerHTML = '';
        this.renderView('inventory'); // Re-render to show updates
    },
    //#endregion Modal System


    // ========================================================================
    // REGION: Inventory Management (Delegated to ES6 Module)
    // ========================================================================
    //#region Inventory

    renderInventory(searchQuery = '', page = 1, statusFilter = '') {
        renderInventoryModule(this, searchQuery, page, statusFilter);
    },

    viewInventoryDetails(resourceId) {
        viewInventoryDetailsModule(this, resourceId);
    },

    openInventoryModal(resourceId = null) {
        openInventoryModalModule(this, resourceId);
    },

    attachInventoryFormListeners() {
        attachInventoryFormListenersModule(this);
    },
    //#endregion Inventory

    // ========================================================================
    // REGION: Sales Management (Delegated to ES6 Module)
    // ========================================================================
    //#region Sales

    renderSales(filters = {}) {
        renderSalesModule(this, filters);
    },

    viewSalesDetails(salesOrderId) {
        viewSalesDetailsModule(this, salesOrderId);
    },

    editSalesOrder(salesOrderId) {
        editSalesOrderModule(this, salesOrderId);
    },

    openRenewModal(salesOrderId) {
        openRenewModalModule(this, salesOrderId);
    },
    //#endregion Sales

    // ========================================================================
    // Bulk Operations - Loaded from external module:
    // - modules/bulkOps.js
    // Initialized in App.init() via window.initBulkOpsModule()
    // ========================================================================

    // ========================================================================
    // CRM Modules (Customers & Suppliers) - Loaded from external modules:
    // - modules/customers.js
    // - modules/suppliers.js
    // These are initialized in App.init() via window.initCustomersModule()
    // and window.initSuppliersModule()
    // ========================================================================

    // ========================================================================
    // REGION: CSV Export
    // ========================================================================
    //#region CSV Export

    // ============ CSV Export Functions ============

    exportSalesToCSV() {
        const sales = window.Store.getSales();
        if (sales.length === 0) {
            alert('No sales data to export.');
            return;
        }

        // CSV Headers
        const headers = [
            'Order ID', 'Customer', 'Status', 'Sales Model', 'Sales Type',
            'Salesperson', 'Capacity', 'Unit', 'Contract Start', 'Contract End', 'Term (Months)',
            'MRC Sales', 'NRC Sales', 'Monthly Cost', 'Monthly Margin', 'Margin %',
            'A-End City', 'A-End PoP', 'Z-End City', 'Z-End PoP', 'Notes'
        ];

        // Generate rows
        const rows = sales.map(s => {
            const computed = computeOrderFinancials(s);
            return [
                s.salesOrderId || '',
                s.customerName || '',
                s.status || '',
                s.salesModel || '',
                s.salesType || '',
                s.salesperson || '',
                s.capacity?.value || 0,
                s.capacity?.unit || 'Gbps',
                s.dates?.start || '',
                s.dates?.end || '',
                s.dates?.term || '',
                s.financials?.mrcSales || s.financials?.totalMrr || 0,
                s.financials?.nrcSales || 0,
                computed.monthlyProfit ? (s.financials?.mrcSales || 0) - computed.monthlyProfit : 0,
                computed.monthlyProfit || 0,
                computed.marginPercent?.toFixed(1) || 0,
                s.locationAEnd?.city || '',
                s.locationAEnd?.pop || '',
                s.locationZEnd?.city || '',
                s.locationZEnd?.pop || '',
                (s.notes || '').replace(/"/g, '""') // Escape quotes
            ].map(v => `"${v}"`).join(',');
        });

        // Combine and download
        const csv = [headers.join(','), ...rows].join('\n');
        this.downloadCSV(csv, `sales_export_${new Date().toISOString().split('T')[0]}.csv`);
    },

    exportInventoryToCSV() {
        const inventory = window.Store.getInventory();
        if (inventory.length === 0) {
            alert('No inventory data to export.');
            return;
        }

        // CSV Headers
        const headers = [
            'Resource ID', 'Status', 'Cable System', 'Segment Type', 'Protection',
            'Ownership', 'Supplier', 'Capacity', 'Unit',
            'A-End Country', 'A-End City', 'A-End PoP',
            'Z-End Country', 'Z-End City', 'Z-End PoP',
            'MRC', 'OTC', 'Annual O&M', 'Contract Start', 'Contract End', 'Term (Months)'
        ];

        // Generate rows
        const rows = inventory.map(i => [
            i.resourceId || '',
            i.status || '',
            i.cableSystem || '',
            i.segmentType || '',
            i.protection || '',
            i.acquisition?.ownership || '',
            i.acquisition?.supplier || '',
            i.capacity?.value || 0,
            i.capacity?.unit || 'Gbps',
            i.location?.aEnd?.country || '',
            i.location?.aEnd?.city || '',
            i.location?.aEnd?.pop || '',
            i.location?.zEnd?.country || '',
            i.location?.zEnd?.city || '',
            i.location?.zEnd?.pop || '',
            i.financials?.mrc || 0,
            i.financials?.otc || 0,
            i.financials?.annualOmCost || 0,
            i.dates?.start || '',
            i.dates?.end || '',
            i.financials?.term || ''
        ].map(v => `"${v}"`).join(','));

        // Combine and download
        const csv = [headers.join(','), ...rows].join('\n');
        this.downloadCSV(csv, `inventory_export_${new Date().toISOString().split('T')[0]}.csv`);
    },

    downloadCSV(csvContent, filename) {
        // Use Blob approach for better browser compatibility (including Safari)
        const BOM = '\uFEFF';
        const csvData = BOM + csvContent;

        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';

        document.body.appendChild(link);
        link.click();

        // Cleanup
        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 100);
    }
    //#endregion CSV Export
};

// CRITICAL: Make App globally accessible for onclick handlers
window.App = App;

// NOTE: App.init() is now called from index.html after authentication check
