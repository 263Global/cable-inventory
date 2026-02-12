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

// ES module lazy loaders (native code splitting, no build step)
const APP_VERSION = '1.15.0';
const moduleLoaders = {
    dashboard: () => import(`./modules/dashboard.js?v=${APP_VERSION}`),
    inventory: () => import(`./modules/inventory.js?v=${APP_VERSION}`),
    sales: () => import(`./modules/sales.js?v=${APP_VERSION}`),
    salesForm: () => import(`./modules/salesForm.js?v=${APP_VERSION}`),
    customers: () => import(`./modules/customers.js?v=${APP_VERSION}`),
    suppliers: () => import(`./modules/suppliers.js?v=${APP_VERSION}`)
};

const moduleCache = {};

const loadModule = (name) => {
    if (!moduleCache[name]) {
        moduleCache[name] = moduleLoaders[name]();
    }
    return moduleCache[name];
};

const { escapeHtml } = window.DomUtils;


// ============================================================================
// REGION: App Object Definition
// ============================================================================
//#region App Core

const setAppViewportHeight = () => {
    const viewport = window.visualViewport;
    const height = viewport ? viewport.height : window.innerHeight;
    document.documentElement.style.setProperty('--app-height', `${Math.round(height)}px`);
};

setAppViewportHeight();
window.addEventListener('resize', setAppViewportHeight);
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', setAppViewportHeight);
    window.visualViewport.addEventListener('scroll', setAppViewportHeight);
}

const App = {
    init() {
        // Initialize external modules
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
            this.renderView('inventory');
        }
    },

    async deleteSalesOrder(id) {
        if (confirm('Are you sure you want to delete this sales order?')) {
            await window.Store.deleteSalesOrder(id);
            this.renderView('sales');
        }
    },

    // Aliases for the new button onclick handlers
    async deleteInventoryWithConfirm(id) {
        await this.deleteInventoryItem(id);
    },

    async deleteSalesOrderWithConfirm(id) {
        await this.deleteSalesOrder(id);
    },

    async renderView(viewName) {
        try {
            this.container.innerHTML = ''; // Clear container
            this.headerActions.innerHTML = ''; // Clear actions

            // Manage FAB based on view
            this.updateFAB(viewName);
            if (viewName !== 'sales' && this._salesDocumentClickHandler) {
                document.removeEventListener('click', this._salesDocumentClickHandler);
                this._salesDocumentClickHandler = null;
            }

            switch (viewName) {
                case 'dashboard':
                    this.pageTitle.textContent = 'Operational Dashboard';
                    await this.renderDashboard();
                    break;
                case 'inventory':
                    this.pageTitle.textContent = 'Inventory Resources';
                    await this.renderInventory();
                    break;
                case 'sales':
                    this.pageTitle.textContent = 'Sales & Revenue';
                    await this.renderSales();
                    break;
                case 'customers':
                    this.pageTitle.textContent = 'Customers';
                    if (!this._customersModuleInitialized) {
                        const mod = await loadModule('customers');
                        const initCustomers = mod.initCustomersModule || mod.default || window.initCustomersModule;
                        if (typeof initCustomers !== 'function') {
                            throw new Error('Customers module not available');
                        }
                        initCustomers(this);
                        this._customersModuleInitialized = true;
                    }
                    if (typeof this.renderCustomers !== 'function') {
                        throw new Error('Customers module not available');
                    }
                    await this.renderCustomers();
                    break;
                case 'suppliers':
                    this.pageTitle.textContent = 'Suppliers';
                    if (!this._suppliersModuleInitialized) {
                        const mod = await loadModule('suppliers');
                        const initSuppliers = mod.initSuppliersModule || mod.default || window.initSuppliersModule;
                        if (typeof initSuppliers !== 'function') {
                            throw new Error('Suppliers module not available');
                        }
                        initSuppliers(this);
                        this._suppliersModuleInitialized = true;
                    }
                    if (typeof this.renderSuppliers !== 'function') {
                        throw new Error('Suppliers module not available');
                    }
                    await this.renderSuppliers();
                    break;
                default:
                    this.pageTitle.textContent = 'Operational Dashboard';
                    await this.renderDashboard();
            }
        } catch (err) {
            this.handleError(err, { viewName });
        }
    },

    handleError(error, context = {}) {
        const err = error instanceof Error ? error : new Error(String(error || 'Unknown error'));
        console.error('App error:', { err, context });
        this.renderErrorView(err, context);
    },

    renderErrorView(error, context = {}) {
        if (!this.container) return;

        this.updateFAB('');
        this.headerActions.innerHTML = '';
        this.pageTitle.textContent = 'Something went wrong';

        const card = document.createElement('div');
        card.className = 'section-card';
        card.style.cssText = 'max-width: 760px; margin: 2rem auto; border: 1px solid var(--accent-danger);';

        const title = document.createElement('h3');
        title.textContent = 'We hit an unexpected error';
        title.style.marginBottom = '0.5rem';

        const message = document.createElement('p');
        message.textContent = error?.message || 'Please try again.';
        message.style.color = 'var(--text-secondary)';

        const actions = document.createElement('div');
        actions.style.cssText = 'display: flex; gap: 0.75rem; margin-top: 1rem; flex-wrap: wrap;';

        const reloadBtn = document.createElement('button');
        reloadBtn.className = 'btn btn-secondary';
        reloadBtn.type = 'button';
        reloadBtn.textContent = 'Reload page';
        reloadBtn.addEventListener('click', () => window.location.reload());

        const dashboardBtn = document.createElement('button');
        dashboardBtn.className = 'btn btn-primary';
        dashboardBtn.type = 'button';
        dashboardBtn.textContent = 'Go to dashboard';
        dashboardBtn.addEventListener('click', () => this.renderView('dashboard'));

        actions.appendChild(reloadBtn);
        actions.appendChild(dashboardBtn);

        const details = document.createElement('details');
        details.style.marginTop = '1rem';

        const summary = document.createElement('summary');
        summary.textContent = 'Error details';
        summary.style.cursor = 'pointer';

        const pre = document.createElement('pre');
        pre.textContent = [error?.stack || error?.message, context?.viewName ? `View: ${context.viewName}` : null]
            .filter(Boolean)
            .join('\n');
        pre.style.cssText = 'white-space: pre-wrap; font-size: 0.75rem; margin-top: 0.5rem; color: var(--text-muted);';

        details.appendChild(summary);
        details.appendChild(pre);

        card.appendChild(title);
        card.appendChild(message);
        card.appendChild(actions);
        card.appendChild(details);

        this.container.innerHTML = '';
        this.container.appendChild(card);
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

    async renderDashboard() {
        const mod = await loadModule('dashboard');
        mod.renderDashboard(this);
    },
    //#endregion Dashboard

    // ========================================================================
    // REGION: Modal System
    // ========================================================================
    //#region Modal System

    /* ================= Modal System ================= */

    /* ================= Sales Form (Delegated to ES6 Module) ================= */

    async openAddSalesModal(existingOrderId = null) {
        const mod = await loadModule('salesForm');
        mod.openAddSalesModal(this, existingOrderId);
    },

    async attachSalesFormListeners() {
        const mod = await loadModule('salesForm');
        mod.attachSalesFormListeners(this);
    },

    async calculateSalesFinancials() {
        const mod = await loadModule('salesForm');
        mod.calculateSalesFinancials(this);
    },

    async handleSalesSubmit(form) {
        const mod = await loadModule('salesForm');
        return await mod.handleSalesSubmit(this, form);
    },


    openModal(title, content, onSave, isLarge = false) {
        const safeTitle = escapeHtml(title);
        this.modalContainer.innerHTML = `
            <div class="modal-backdrop" id="modal-backdrop">
                <div class="modal ${isLarge ? 'modal-lg' : ''}">
                    <div class="modal-header">
                        <h3>${safeTitle}</h3>
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
            this.modalContainer.querySelectorAll('.searchable-dropdown, .simple-dropdown').forEach((dropdown) => {
                if (typeof dropdown._cleanupDropdown === 'function') {
                    dropdown._cleanupDropdown();
                }
            });
            if (this._costTypeMenuOutsideClickHandler) {
                document.removeEventListener('click', this._costTypeMenuOutsideClickHandler);
                this._costTypeMenuOutsideClickHandler = null;
            }
            this.modalContainer.innerHTML = '';
        };

        closeBtn.addEventListener('click', close);
        cancelBtn.addEventListener('click', close);

        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                if (onSave && typeof onSave === 'function') {
                    // Prevent double submission
                    const originalText = saveBtn.innerHTML;
                    saveBtn.disabled = true;
                    saveBtn.innerHTML = '<ion-icon name="sync-outline" class="spin-icon"></ion-icon> Saving...';
                    try {
                        const result = await onSave(form);
                        // Only close if onSave returns true or undefined (not explicitly false)
                        if (result !== false) {
                            close();
                        } else {
                            saveBtn.disabled = false;
                            saveBtn.innerHTML = originalText;
                        }
                    } catch (err) {
                        saveBtn.disabled = false;
                        saveBtn.innerHTML = originalText;
                        this.handleError(err, { source: 'modal-save' });
                    }
                }
            });
        }

        backdrop.addEventListener('click', (e) => {
            if (e.target.id === 'modal-backdrop') {
                close();
            }
        });
    },

    closeModal() {
        this.modalContainer.querySelectorAll('.searchable-dropdown, .simple-dropdown').forEach((dropdown) => {
            if (typeof dropdown._cleanupDropdown === 'function') {
                dropdown._cleanupDropdown();
            }
        });
        if (this._costTypeMenuOutsideClickHandler) {
            document.removeEventListener('click', this._costTypeMenuOutsideClickHandler);
            this._costTypeMenuOutsideClickHandler = null;
        }
        this.modalContainer.innerHTML = '';
    },
    //#endregion Modal System


    // ========================================================================
    // REGION: Inventory Management (Delegated to ES6 Module)
    // ========================================================================
    //#region Inventory

    async renderInventory(searchQuery = '', page = 1, statusFilter = '') {
        const mod = await loadModule('inventory');
        mod.renderInventory(this, searchQuery, page, statusFilter);
    },

    async viewInventoryDetails(resourceId) {
        const mod = await loadModule('inventory');
        mod.viewInventoryDetails(this, resourceId);
    },

    async openInventoryModal(resourceId = null) {
        const mod = await loadModule('inventory');
        mod.openInventoryModal(this, resourceId);
    },

    async attachInventoryFormListeners() {
        const mod = await loadModule('inventory');
        mod.attachInventoryFormListeners(this);
    },

    async openInventoryTerminateModal(resourceId) {
        const mod = await loadModule('inventory');
        mod.openTerminateModal(this, resourceId);
    },

    async openInventoryRenewModal(resourceId) {
        const mod = await loadModule('inventory');
        mod.openRenewModal(this, resourceId);
    },
    //#endregion Inventory

    // ========================================================================
    // REGION: Sales Management (Delegated to ES6 Module)
    // ========================================================================
    //#region Sales

    async renderSales(filters = {}) {
        const mod = await loadModule('sales');
        mod.renderSales(this, filters);
    },

    async viewSalesDetails(salesOrderId) {
        const mod = await loadModule('sales');
        mod.viewSalesDetails(this, salesOrderId);
    },

    async editSalesOrder(salesOrderId) {
        const mod = await loadModule('sales');
        mod.editSalesOrder(this, salesOrderId);
    },

    async openRenewModal(salesOrderId) {
        const mod = await loadModule('salesForm');
        mod.openRenewModal(this, salesOrderId);
    },

    async openTerminateModal(salesOrderId) {
        const mod = await loadModule('sales');
        mod.openTerminateModal(this, salesOrderId);
    },
    //#endregion Sales

    // ========================================================================
    // Bulk Operations - Loaded from external module:
    // - modules/bulkOps.js
    // Initialized in App.init() via window.initBulkOpsModule()
    // ========================================================================

    // ========================================================================
    // CRM Modules (Customers & Suppliers) - Loaded on demand:
    // - modules/customers.js
    // - modules/suppliers.js
    // ========================================================================

    // ========================================================================
    // REGION: CSV Export
    // ========================================================================
    //#region CSV Export

    // ============ CSV Export Functions ============

    exportSalesToCSV() {
        if (window.CsvExport?.exportSalesToCSV) {
            window.CsvExport.exportSalesToCSV();
            return;
        }
        alert('CSV export module unavailable.');
    },

    exportInventoryToCSV() {
        if (window.CsvExport?.exportInventoryToCSV) {
            window.CsvExport.exportInventoryToCSV();
            return;
        }
        alert('CSV export module unavailable.');
    },

    downloadCSV(csvContent, filename) {
        if (window.CsvExport?.downloadCSV) {
            window.CsvExport.downloadCSV(csvContent, filename);
            return;
        }
        alert('CSV export module unavailable.');
    }
    //#endregion CSV Export
};

// CRITICAL: Make App globally accessible for onclick handlers
window.App = App;

// NOTE: App.init() is now called from index.html after authentication check
