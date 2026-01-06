/**
 * App.js
 * Main application logic
 */

const App = {
    init() {
        this.cacheDOM();
        this.bindEvents();
        this.initTheme();
        this.renderView('dashboard');
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
        if (theme === 'dark') {
            this.themeLabel.textContent = 'Dark Mode';
            this.themeIcon.setAttribute('name', 'moon-outline');
        } else {
            this.themeLabel.textContent = 'Light Mode';
            this.themeIcon.setAttribute('name', 'sunny-outline');
        }
    },

    deleteInventoryItem(id) {
        if (confirm('Are you sure you want to delete this resource?')) {
            Store.deleteInventoryItem(id);
            this.renderInventoryView();
        }
    },

    deleteSalesOrder(id) {
        if (confirm('Are you sure you want to delete this sales order?')) {
            Store.deleteSalesOrder(id);
            this.renderSalesView();
        }
    },

    renderView(viewName) {
        this.container.innerHTML = ''; // Clear container
        this.headerActions.innerHTML = ''; // Clear actions

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
            default:
                this.pageTitle.textContent = 'Operational Dashboard';
                this.renderDashboard();
        }
    },

    /* ================= Views ================= */

    renderDashboard() {
        const inventory = window.Store.getInventory();
        const sales = window.Store.getSalesOrders();

        // Calculate Stats
        const totalCapacity = inventory.reduce((acc, item) => acc + (item.capacity?.value || 0), 0);
        const totalMrr = sales.reduce((acc, item) => acc + (item.financials?.totalMrr || 0), 0);
        const activeOrders = sales.filter(s => s.status === 'Active').length;
        const totalOpex = inventory.reduce((acc, item) => acc + (item.financials?.mrc || 0), 0);

        const profit = totalMrr - totalOpex;

        // Expiry Logic (90 Days)
        const getDaysDiff = (dateStr) => {
            if (!dateStr) return 9999;
            const end = new Date(dateStr);
            const now = new Date();
            const diffTime = end - now;
            return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        };

        const expiringSales = sales.filter(s => {
            const days = getDaysDiff(s.dates?.end);
            return s.status === 'Active' && days >= 0 && days <= 90;
        });

        const expiringInventory = inventory.filter(i => {
            const days = getDaysDiff(i.dates?.end);
            // Alert for Active leases/IRUs expiring, exclude already expired or permanent stuff if needed
            // Assuming 'Available' items can also have lease expiry if we leased them from supplier
            return days >= 0 && days <= 90;
        });

        const html = `
            <!-- Top Stats -->
            <div class="grid-4 mb-4">
                <div class="card metric-card">
                    <span class="metric-label">Total Capacity (Gbps)</span>
                    <span class="metric-value" style="color: var(--accent-primary)">${totalCapacity.toLocaleString()}</span>
                </div>
                <div class="card metric-card">
                    <span class="metric-label">Monthly Revenue (MRR)</span>
                    <span class="metric-value" style="color: var(--accent-success)">$${totalMrr.toLocaleString()}</span>
                </div>
                <div class="card metric-card">
                    <span class="metric-label">Active Orders</span>
                    <span class="metric-value">${activeOrders}</span>
                </div>
                <div class="card metric-card">
                    <span class="metric-label">Est. Monthly Profit</span>
                    <span class="metric-value" style="color: ${profit >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)'}">
                        $${profit.toLocaleString()}
                    </span>
                </div>
            </div>

            <!-- Alerts Row -->
            <div class="grid-2 mb-4">
                <!-- Sales Alerts -->
                <div class="card" style="border-left: 4px solid var(--accent-warning);">
                    <div class="flex justify-between items-center mb-4">
                        <h3 style="color: var(--accent-warning)"><ion-icon name="alert-circle-outline"></ion-icon> Expiring Sales (90 Days)</h3>
                        <span class="badge badge-warning">${expiringSales.length} Pending</span>
                    </div>
                    ${expiringSales.length === 0 ? '<p style="color:var(--text-muted)">No sales contracts expiring soon.</p>' : `
                        <table style="font-size:0.85rem">
                            <thead><tr><th>Order</th><th>Customer</th><th>Expires In</th></tr></thead>
                            <tbody>
                                ${expiringSales.map(s => {
            const days = getDaysDiff(s.dates?.end);
            return `<tr>
                                        <td class="font-mono">${s.salesOrderId}</td>
                                        <td>${s.customerName}</td>
                                        <td style="color:var(--accent-warning)">${days} Days</td>
                                    </tr>`;
        }).join('')}
                            </tbody>
                        </table>
                    `}
                </div>

                <!-- Inventory Alerts -->
                <div class="card" style="border-left: 4px solid var(--accent-danger);">
                    <div class="flex justify-between items-center mb-4">
                        <h3 style="color: var(--accent-danger)"><ion-icon name="timer-outline"></ion-icon> Expiring Resources (90 Days)</h3>
                        <span class="badge badge-danger">${expiringInventory.length} Pending</span>
                    </div>
                    ${expiringInventory.length === 0 ? '<p style="color:var(--text-muted)">No inventory agreements expiring soon.</p>' : `
                         <table style="font-size:0.85rem">
                            <thead><tr><th>Resource</th><th>System</th><th>Expires In</th></tr></thead>
                            <tbody>
                                ${expiringInventory.map(i => {
            const days = getDaysDiff(i.dates?.end);
            return `<tr>
                                        <td class="font-mono">${i.resourceId}</td>
                                        <td>${i.cableSystem}</td>
                                        <td style="color:var(--accent-danger)">${days} Days</td>
                                    </tr>`;
        }).join('')}
                            </tbody>
                        </table>
                    `}
                </div>
            </div>

            <!-- Bottom Actions -->
            <div class="grid-2" style="grid-template-columns: 2fr 1fr; height: 300px;">
                <div class="card">
                    <h3 class="mb-4">Recent Activity</h3>
                    <p style="color: var(--text-muted)">System initialized.</p>
                </div>
                <div class="card" style="background: linear-gradient(145deg, rgba(0,240,255,0.05), transparent);">
                    <h3 class="mb-4">Quick Actions</h3>
                    <button class="btn btn-secondary" onclick="App.renderView('inventory')">View Inventory</button>
                    <br><br>
                    <button class="btn btn-secondary" onclick="App.renderView('sales')">View Sales</button>
                </div>
            </div>
        `;
        this.container.innerHTML = html;
    },

    /* ================= Modal System ================= */

    openAddSalesModal() {
        // Get Available Resources
        const availableResources = Store.getAvailableResources();
        const resourceOptions = availableResources.map(r =>
            `<option value="${r.resourceId}">${r.resourceId} - ${r.cableSystem} (${r.capacity.value}${r.capacity.unit})</option>`
        ).join('');

        const modalContent = `
            <div class="grid-2 gap-2" style="align-items: start;">
                <!-- LEFT COLUMN: Sales Info -->
                <div class="section-card">
                    <h4 class="mb-4" style="color: var(--accent-primary); border-bottom: 1px solid var(--border-color); padding-bottom:0.5rem;">Sales Information</h4>
                    
                    <div class="form-group">
                        <label class="form-label">Customer Name</label>
                        <input type="text" class="form-control" name="customerName" required>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Linked Resource (Available)</label>
                        <select class="form-control" name="inventoryLink" required>
                            <option value="">Select Resource...</option>
                            ${resourceOptions}
                        </select>
                        ${availableResources.length === 0 ? '<small style="color:red">No available resources found.</small>' : ''}
                    </div>

                    <div class="grid-2">
                        <div class="form-group">
                            <label class="form-label">Contract Start</label>
                            <input type="date" class="form-control" name="dates.start" id="sales-start-date" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Contract End</label>
                            <input type="date" class="form-control" name="dates.end" id="sales-end-date" required>
                        </div>
                    </div>

                    <div class="form-group">
                         <label class="form-label">Sales Status</label>
                         <input type="text" class="form-control" id="sales-status-display" value="Pending" readonly style="background: var(--bg-card-hover); color: var(--text-secondary);">
                    </div>

                    <h5 class="mt-4 mb-2">Revenue / Price</h5>
                    <div class="grid-2">
                        <div class="form-group">
                            <label class="form-label">MRC Sales ($)</label>
                            <input type="number" class="form-control calc-trigger" name="financials.mrcSales" value="0">
                        </div>
                        <div class="form-group">
                            <label class="form-label">NRC Sales ($)</label>
                            <input type="number" class="form-control calc-trigger" name="financials.nrcSales" value="0">
                        </div>
                    </div>

                    <!-- Profitability Summary Widget -->
                    <div class="mt-4 p-3" style="background: rgba(0,0,0,0.2); border-radius: 8px; border: 1px solid var(--border-color);">
                        <h5 class="mb-3">Profitability Analysis</h5>
                        <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;">
                            <span>Total Monthly Cost:</span>
                            <span class="font-mono text-warning" id="disp-total-cost">$0.00</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;">
                            <span>Gross Margin ($):</span>
                            <span class="font-mono text-success" id="disp-gross-margin">$0.00</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:1.1em;">
                            <span>Margin (%):</span>
                            <span class="font-mono" id="disp-margin-percent">0.0%</span>
                        </div>
                         <div style="display:flex; justify-content:space-between; margin-top:0.5rem; font-size:0.9em; opacity:0.8;">
                            <span>NRC Profit:</span>
                            <span class="font-mono" id="disp-nrc-profit">$0.00</span>
                        </div>
                    </div>
                </div>

                <!-- RIGHT COLUMN: Cost Structure -->
                <div class="section-card">
                    <h4 class="mb-4" style="color: var(--accent-secondary); border-bottom: 1px solid var(--border-color); padding-bottom:0.5rem;">Cost Structure</h4>

                    <!-- Group 1: Cable Cost -->
                    <h5 class="mb-2 text-xs uppercase" style="opacity:0.7">1. Cable Cost</h5>
                    <div class="form-group">
                        <label class="form-label">Supplier</label>
                        <input type="text" class="form-control" name="costs.cable.supplier">
                    </div>
                    <div class="grid-2">
                        <div class="form-group">
                            <label class="form-label">Cost Model</label>
                            <select class="form-control calc-trigger" name="costs.cable.model" id="cost-model-select">
                                <option value="Monthly Lease">Monthly Lease</option>
                                <option value="IRU">IRU</option>
                            </select>
                        </div>
                        <div class="form-group">
                             <label class="form-label">Base Amount ($)</label>
                             <input type="number" class="form-control calc-trigger" name="costs.cable.baseAmount" value="0" placeholder="Monthly Rent or IRU Fee">
                        </div>
                    </div>
                    
                    <!-- IRU Specific Fields -->
                    <div id="iru-fields" class="grid-2" style="display:none; background: rgba(255,255,255,0.05); padding: 0.5rem; border-radius: 4px; margin-bottom: 1rem;">
                        <div class="form-group">
                            <label class="form-label">Amortization (Months)</label>
                            <input type="number" class="form-control calc-trigger" name="costs.cable.amortizationMonths" value="180">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Annual O&M ($)</label>
                            <input type="number" class="form-control calc-trigger" name="costs.cable.annualOm" value="0">
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Cable NRC ($)</label>
                        <input type="number" class="form-control calc-trigger" name="costs.cable.nrc" value="0">
                    </div>

                    <!-- Group 2: Backhaul -->
                    <h5 class="mb-2 mt-4 text-xs uppercase" style="opacity:0.7">2. Backhaul</h5>
                    <div class="grid-2">
                         <div class="form-group">
                            <label class="form-label">A-End Monthly ($)</label>
                            <input type="number" class="form-control calc-trigger" name="costs.backhaul.aEnd.monthly" value="0">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Z-End Monthly ($)</label>
                            <input type="number" class="form-control calc-trigger" name="costs.backhaul.zEnd.monthly" value="0">
                        </div>
                    </div>
                    <div class="grid-2">
                         <div class="form-group">
                            <label class="form-label">A-End NRC ($)</label>
                            <input type="number" class="form-control calc-trigger" name="costs.backhaul.aEnd.nrc" value="0">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Z-End NRC ($)</label>
                            <input type="number" class="form-control calc-trigger" name="costs.backhaul.zEnd.nrc" value="0">
                        </div>
                    </div>

                    <!-- Group 3: Cross Connect -->
                    <h5 class="mb-2 mt-4 text-xs uppercase" style="opacity:0.7">3. Cross Connect</h5>
                     <div class="grid-2">
                         <div class="form-group">
                            <label class="form-label">A-End Monthly ($)</label>
                            <input type="number" class="form-control calc-trigger" name="costs.crossConnect.aEnd.monthly" value="0">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Z-End Monthly ($)</label>
                            <input type="number" class="form-control calc-trigger" name="costs.crossConnect.zEnd.monthly" value="0">
                        </div>
                    </div>

                    <!-- Group 4: Smart Hands -->
                    <h5 class="mb-2 mt-4 text-xs uppercase" style="opacity:0.7">4. Smart Hands</h5>
                    <div class="form-group">
                        <label class="form-label">One-off Fee ($)</label>
                        <input type="number" class="form-control calc-trigger" name="costs.smartHands" value="0">
                    </div>
                </div>
            </div>
        `;

        this.openModal('New Sales Order', modalContent, (form) => this.handleSalesSubmit(form), true); // true for large modal

        // Attach Event Listeners for Dynamic Logic
        this.attachSalesFormListeners();
    },

    attachSalesFormListeners() {
        // Toggle IRU Fields
        const modelSelect = document.getElementById('cost-model-select');
        const iruFields = document.getElementById('iru-fields');
        if (modelSelect && iruFields) {
            modelSelect.addEventListener('change', (e) => {
                iruFields.style.display = e.target.value === 'IRU' ? 'grid' : 'none';
                this.calculateSalesFinancials(); // Recalculate
            });
        }

        // Status Auto-calc
        const startDateInput = document.getElementById('sales-start-date');
        const endDateInput = document.getElementById('sales-end-date');
        const statusDisplay = document.getElementById('sales-status-display');

        const updateStatus = () => {
            if (!startDateInput.value || !endDateInput.value) return;
            const today = new Date();
            const start = new Date(startDateInput.value);
            const end = new Date(endDateInput.value);

            let status = 'Active';
            if (today < start) status = 'Pending';
            if (today > end) status = 'Expired';

            statusDisplay.value = status;
        };

        if (startDateInput && endDateInput) {
            startDateInput.addEventListener('change', updateStatus);
            endDateInput.addEventListener('change', updateStatus);
        }

        // Real-time Financial Calculation
        const calcTriggers = document.querySelectorAll('.calc-trigger');
        calcTriggers.forEach(input => {
            input.addEventListener('input', () => this.calculateSalesFinancials());
        });
    },

    calculateSalesFinancials() {
        // 1. Get Values
        const getValue = (name) => Number(document.querySelector(`[name="${name}"]`)?.value || 0);

        // Revenue
        const mrcSales = getValue('financials.mrcSales');
        const nrcSales = getValue('financials.nrcSales');

        // Costs - Cable
        const costModel = document.querySelector('[name="costs.cable.model"]').value;
        const cableBase = getValue('costs.cable.baseAmount');
        let cableRealCost = 0;

        if (costModel === 'Monthly Lease') {
            cableRealCost = cableBase;
        } else {
            // IRU Logic: (Base / Months) + (O&M / 12)
            const amortMonths = getValue('costs.cable.amortizationMonths') || 1;
            const annualOm = getValue('costs.cable.annualOm');
            cableRealCost = (cableBase / amortMonths) + (annualOm / 12);
        }

        // Costs - Other Monthly
        const bhMonthly = getValue('costs.backhaul.aEnd.monthly') + getValue('costs.backhaul.zEnd.monthly');
        const xcMonthly = getValue('costs.crossConnect.aEnd.monthly') + getValue('costs.crossConnect.zEnd.monthly');

        const totalMonthlyCost = cableRealCost + bhMonthly + xcMonthly;

        // Costs - NCR
        const cableNrc = getValue('costs.cable.nrc');
        const bhNrc = getValue('costs.backhaul.aEnd.nrc') + getValue('costs.backhaul.zEnd.nrc');
        const xcNrc = getValue('costs.crossConnect.aEnd.nrc') + getValue('costs.crossConnect.zEnd.nrc');
        const smartHands = getValue('costs.smartHands');

        const totalNrcCost = cableNrc + bhNrc + xcNrc + smartHands;

        // 2. Margins
        const grossMargin = mrcSales - totalMonthlyCost;
        const marginPercent = mrcSales > 0 ? (grossMargin / mrcSales) * 100 : 0;
        const nrcProfit = nrcSales - totalNrcCost;

        // 3. Update UI
        const fmt = (num) => '$' + num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        document.getElementById('disp-total-cost').textContent = fmt(totalMonthlyCost);
        document.getElementById('disp-gross-margin').textContent = fmt(grossMargin);

        const marginEl = document.getElementById('disp-margin-percent');
        marginEl.textContent = marginPercent.toFixed(1) + '%';
        marginEl.style.color = marginPercent >= 20 ? 'var(--success)' : (marginPercent > 0 ? 'var(--warning)' : 'var(--danger)');

        const nrcEl = document.getElementById('disp-nrc-profit');
        nrcEl.textContent = fmt(nrcProfit);
        nrcEl.style.color = nrcProfit >= 0 ? 'var(--text-secondary)' : 'var(--danger)';
    },

    handleSalesSubmit(form) {
        // Collect Data
        const formData = new FormData(form);
        const getVal = (name) => form.querySelector(`[name="${name}"]`)?.value;
        const getNum = (name) => Number(getVal(name) || 0);

        // Calculate Status to ensure it's accurate at save time
        let status = 'Active';
        const today = new Date();
        const start = new Date(getVal('dates.start'));
        const end = new Date(getVal('dates.end'));

        if (today < start) status = 'Pending';
        if (today > end) status = 'Expired';

        // Re-run calc to get final calculated values (stored in UI specific trigger function, so logic duplicated or simplified here)
        // We will store raw inputs and compute on view, but for financials summary, let's trust the logic is consistent.

        // Use logic from calculateSalesFinancials to get stored computed values if needed, 
        // OR simply rely on raw data and re-computing on display. 
        // For 'marginPercent', we should probably store it for easier sorting/filtering later.

        // Let's implement a quick helper for the margin percent to save it
        const mrcSales = getNum('financials.mrcSales');
        // ... (re-implementing full calc here is redundant, let's create a helper func or just calc margin simply)
        // For simplicity in this step, let's grab the raw inputs. The Store logic is what matters.

        const marginText = document.getElementById('disp-margin-percent').textContent;
        const marginPercent = parseFloat(marginText); // quick grab from UI which just ran calc

        const newOrder = {
            resourceId: null, // Generated by store
            customerName: getVal('customerName'),
            inventoryLink: getVal('inventoryLink'),
            status: status,
            dates: {
                start: getVal('dates.start'),
                end: getVal('dates.end')
            },
            financials: {
                mrcSales: mrcSales,
                nrcSales: getNum('financials.nrcSales'),
                marginPercent: marginPercent // Storing for easy display
            },
            costs: {
                cable: {
                    supplier: getVal('costs.cable.supplier'),
                    model: getVal('costs.cable.model'),
                    baseAmount: getNum('costs.cable.baseAmount'),
                    amortizationMonths: getNum('costs.cable.amortizationMonths'),
                    annualOm: getNum('costs.cable.annualOm'),
                    nrc: getNum('costs.cable.nrc')
                },
                backhaul: {
                    aEnd: { monthly: getNum('costs.backhaul.aEnd.monthly'), nrc: getNum('costs.backhaul.aEnd.nrc') },
                    zEnd: { monthly: getNum('costs.backhaul.zEnd.monthly'), nrc: getNum('costs.backhaul.zEnd.nrc') }
                },
                crossConnect: {
                    aEnd: { monthly: getNum('costs.crossConnect.aEnd.monthly'), nrc: getNum('costs.crossConnect.aEnd.nrc') },
                    zEnd: { monthly: getNum('costs.crossConnect.zEnd.monthly'), nrc: getNum('costs.crossConnect.zEnd.nrc') }
                },
                smartHands: getNum('costs.smartHands')
            }
        };
        Store.addSalesOrder(newOrder);
        this.renderSalesView();
    },

    openModal(title, content, onSave, isLarge = false) {
        this.modalContainer.innerHTML = `
            <div class="modal-backdrop" id="modal-backdrop">
                <div class="modal ${isLarge ? 'modal-lg' : ''}">
                    <div class="modal-header">
                        <h3>${title}</h3>
                        <button class="btn-icon" id="modal-close"><ion-icon name="close-outline"></ion-icon></button>
                    </div>
                    <div class="modal-body">
                        <form id="modal-form">
                            ${content}
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" id="modal-cancel">Cancel</button>
                        <button type="button" class="btn btn-primary" id="modal-save">Save changes</button>
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

        saveBtn.addEventListener('click', () => {
            if (onSave && typeof onSave === 'function') {
                onSave(form);
                close();
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

    /* ================= Inventory Logic ================= */

    renderInventory() {
        const data = window.Store.getInventory();

        // Add "Add Item" button
        const addBtn = document.createElement('button');
        addBtn.className = 'btn btn-primary';
        addBtn.innerHTML = '<ion-icon name="add-outline"></ion-icon> Add Resource';
        addBtn.onclick = () => this.openInventoryModal();
        this.headerActions.appendChild(addBtn);

        const html = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Resource ID</th>
                            <th>Status</th>
                            <th>Details</th>
                            <th>Cost Info</th>
                            <th>Location (A / Z)</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(item => `
                            <tr>
                                <td class="font-mono" style="color: var(--accent-secondary)">${item.resourceId}</td>
                                <td>
                                    <span class="badge ${item.status === 'Available' ? 'badge-success' : 'badge-warning'}">${item.status}</span>
                                    <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.2rem;">${item.acquisition?.ownership || ''}</div>
                                </td>
                                <td>
                                    <div style="font-weight:600">${item.cableSystem}</div>
                                    <div style="font-size:0.8em; color:var(--text-muted)">
                                        ${item.fiberPair || '-'} | ${item.capacity?.value || 0} ${item.capacity?.unit || 'Gbps'}
                                    </div>
                                    <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.2rem;">
                                        ${item.segmentType || ''} (${item.protection || ''})
                                    </div>
                                </td>
                                <td>
                                    <div class="font-mono">MRC: $${(item.financials?.mrc || 0).toLocaleString()}</div>
                                    <div class="font-mono" style="font-size:0.8em; color:var(--text-muted)">NRC: $${(item.financials?.otc || 0).toLocaleString()}</div>
                                    <div style="font-size:0.75rem; color:var(--accent-danger); margin-top:0.2rem;">Expires: ${item.dates?.end || 'N/A'}</div>
                                </td>
                                <td style="font-size:0.85rem">
                                    <div><strong style="color:var(--accent-primary)">A:</strong> ${item.location?.aEnd?.pop || '-'} (${item.location?.aEnd?.city || ''})</div>
                                    <div><strong style="color:var(--accent-secondary)">Z:</strong> ${item.location?.zEnd?.pop || '-'} (${item.location?.zEnd?.city || ''})</div>
                                </td>
                                <td>
                                    <div class="flex gap-4">
                                        <button class="btn btn-secondary" style="padding:0.4rem" onclick="App.openInventoryModal('${item.resourceId}')">
                                            <ion-icon name="create-outline"></ion-icon>
                                        </button>
                                        <button class="btn btn-danger" style="padding:0.4rem" onclick="if(confirm('Delete ${item.resourceId}?')) { window.Store.deleteInventory('${item.resourceId}'); App.renderView('inventory'); }">
                                            <ion-icon name="trash-outline"></ion-icon>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
    `;
        this.container.innerHTML = html;
    },

    openInventoryModal(resourceId = null) {
        const item = resourceId ? window.Store.getInventory().find(i => i.resourceId === resourceId) : {};
        const isEdit = !!resourceId;

        const formHTML = `
                <!-- Core Identity -->
                <h4 class="mb-4" style="border-bottom:1px solid var(--border-color); padding-bottom:0.5rem; margin-top:0;">Identity</h4>
                <div class="grid-2">
                    <div class="form-group">
                        <label class="form-label">Resource ID</label>
                        <input type="text" class="form-control" name="resourceId" value="${item.resourceId || ''}" ${isEdit ? 'readonly' : ''} placeholder="Auto-generated if empty">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Status</label>
                        <select class="form-control" name="status">
                            <option ${item.status === 'Available' ? 'selected' : ''}>Available</option>
                            <option ${item.status === 'In Use' ? 'selected' : ''}>In Use</option>
                            <option ${item.status === 'Maintenance' ? 'selected' : ''}>Maintenance</option>
                            <option ${item.status === 'Decommissioned' ? 'selected' : ''}>Decommissioned</option>
                        </select>
                    </div>
                </div>

                <!--Acquisition -->
                <h4 class="mb-4 mt-4" style="border-bottom:1px solid var(--border-color); padding-bottom:0.5rem;">Acquisition</h4>
                <div class="grid-3">
                    <div class="form-group">
                        <label class="form-label">Ownership</label>
                        <select class="form-control" name="acquisition.ownership">
                            <option ${item.acquisition?.ownership === 'Owned' ? 'selected' : ''}>Owned</option>
                            <option ${item.acquisition?.ownership === 'Leased' ? 'selected' : ''}>Leased</option>
                            <option ${item.acquisition?.ownership === 'IRU' ? 'selected' : ''}>IRU</option>
                        </select>
                    </div>
                     <div class="form-group">
                        <label class="form-label">Supplier</label>
                        <input type="text" class="form-control" name="acquisition.supplier" value="${item.acquisition?.supplier || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Contract Ref</label>
                        <input type="text" class="form-control" name="acquisition.contractRef" value="${item.acquisition?.contractRef || ''}">
                    </div>
                </div>

                <!-- Technical Specs -->
                <h4 class="mb-4 mt-4" style="border-bottom:1px solid var(--border-color); padding-bottom:0.5rem;">Technical Specs</h4>
                <div class="grid-2">
                    <div class="form-group">
                        <label class="form-label">Cable System</label>
                        <input type="text" class="form-control" name="cableSystem" value="${item.cableSystem || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Segment Type</label>
                        <select class="form-control" name="segmentType">
                            <option ${item.segmentType === 'Capacity' ? 'selected' : ''}>Capacity</option>
                            <option ${item.segmentType === 'Fiber Pair' ? 'selected' : ''}>Fiber Pair</option>
                            <option ${item.segmentType === 'Spectrum' ? 'selected' : ''}>Spectrum</option>
                            <option ${item.segmentType === 'Backhaul' ? 'selected' : ''}>Backhaul</option>
                        </select>
                    </div>
                </div>
                <div class="grid-2">
                    <div class="form-group">
                        <label class="form-label">Handoff Type</label>
                        <select class="form-control" name="handoffType" id="handoff-type-select">
                            <option ${item.handoffType === 'OTU-4' ? 'selected' : ''}>OTU-4</option>
                            <option ${item.handoffType === '100GE' ? 'selected' : ''}>100GE</option>
                            <option ${item.handoffType === '400GE' ? 'selected' : ''}>400GE</option>
                            <option ${item.handoffType === 'Other' || (item.handoffType && !['OTU-4', '100GE', '400GE'].includes(item.handoffType)) ? 'selected' : ''}>Other</option>
                        </select>
                    </div>
                    <div class="form-group" id="handoff-type-custom-container" style="display: ${item.handoffType && !['OTU-4', '100GE', '400GE'].includes(item.handoffType) ? 'block' : 'none'}">
                        <label class="form-label">Custom Handoff Type</label>
                        <input type="text" class="form-control" name="handoffTypeCustom" id="handoff-type-custom" value="${item.handoffType && !['OTU-4', '100GE', '400GE'].includes(item.handoffType) ? item.handoffType : ''}" placeholder="Enter custom handoff type">
                    </div>
                </div>
                <div class="grid-1">
                    <div class="form-group">
                        <label class="form-label">Route Description</label>
                        <textarea class="form-control" name="routeDescription" rows="3" placeholder="Describe the cable routing path...">${item.routeDescription || ''}</textarea>
                    </div>
                </div>
                <div class="grid-3">
                     <div class="form-group">
                        <label class="form-label">Capacity Value</label>
                        <input type="number" class="form-control" name="capacity.value" value="${item.capacity?.value || 0}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Unit</label>
                        <select class="form-control" name="capacity.unit">
                            <option ${item.capacity?.unit === 'Gbps' ? 'selected' : ''}>Gbps</option>
                            <option ${item.capacity?.unit === 'Tbps' ? 'selected' : ''}>Tbps</option>
                            <option ${item.capacity?.unit === 'Fiber Pair' ? 'selected' : ''}>Fiber Pair</option>
                            <option ${item.capacity?.unit === 'Half Fiber Pair' ? 'selected' : ''}>Half Fiber Pair</option>
                            <option ${item.capacity?.unit === 'GHz' ? 'selected' : ''}>GHz</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Protection</label>
                        <select class="form-control" name="protection" id="protection-select">
                            <option ${item.protection === 'Unprotected' || !item.protection ? 'selected' : ''}>Unprotected</option>
                            <option ${item.protection === 'Protected' ? 'selected' : ''}>Protected</option>
                        </select>
                    </div>
                </div>
                <div class="grid-1" id="protection-cable-container" style="display: ${item.protection === 'Protected' ? 'block' : 'none'}">
                    <div class="form-group">
                        <label class="form-label">Protection Cable System</label>
                        <input type="text" class="form-control" name="protectionCableSystem" value="${item.protectionCableSystem || ''}" placeholder="Specify the cable system used for protection">
                    </div>
                </div>

                 <!--Locations -->
                <h4 class="mb-4 mt-4" style="border-bottom:1px solid var(--border-color); padding-bottom:0.5rem;">Location</h4>
                <div class="grid-2">
                    <div style="background:rgba(255,255,255,0.02); padding:1rem; border-radius:4px;">
                        <h5 class="mb-2" style="color:var(--accent-primary)">A-End</h5>
                        <div class="form-group"><label class="form-label">Country</label><input type="text" class="form-control" name="location.aEnd.country" value="${item.location?.aEnd?.country || ''}"></div>
                        <div class="form-group"><label class="form-label">City</label><input type="text" class="form-control" name="location.aEnd.city" value="${item.location?.aEnd?.city || ''}"></div>
                        <div class="form-group"><label class="form-label">PoP Site</label><input type="text" class="form-control" name="location.aEnd.pop" value="${item.location?.aEnd?.pop || ''}"></div>
                        <div class="form-group"><label class="form-label">Device</label><input type="text" class="form-control" name="location.aEnd.device" value="${item.location?.aEnd?.device || ''}" placeholder="e.g., Router-01, Switch-HK"></div>
                        <div class="form-group"><label class="form-label">Port</label><input type="text" class="form-control" name="location.aEnd.port" value="${item.location?.aEnd?.port || ''}" placeholder="e.g., Eth1/1/1"></div>
                    </div>
                    <div style="background:rgba(255,255,255,0.02); padding:1rem; border-radius:4px;">
                        <h5 class="mb-2" style="color:var(--accent-secondary)">Z-End</h5>
                        <div class="form-group"><label class="form-label">Country</label><input type="text" class="form-control" name="location.zEnd.country" value="${item.location?.zEnd?.country || ''}"></div>
                        <div class="form-group"><label class="form-label">City</label><input type="text" class="form-control" name="location.zEnd.city" value="${item.location?.zEnd?.city || ''}"></div>
                        <div class="form-group"><label class="form-label">PoP Site</label><input type="text" class="form-control" name="location.zEnd.pop" value="${item.location?.zEnd?.pop || ''}"></div>
                        <div class="form-group"><label class="form-label">Device</label><input type="text" class="form-control" name="location.zEnd.device" value="${item.location?.zEnd?.device || ''}" placeholder="e.g., Router-02, Switch-SG"></div>
                        <div class="form-group"><label class="form-label">Port</label><input type="text" class="form-control" name="location.zEnd.port" value="${item.location?.zEnd?.port || ''}" placeholder="e.g., Eth1/1/2"></div>
                    </div>
                </div>

                <!--Financials -->
                <h4 class="mb-4 mt-4" style="border-bottom:1px solid var(--border-color); padding-bottom:0.5rem;">Financials & Terms</h4>
                <div class="grid-3">
                    <div class="form-group">
                        <label class="form-label">MRC Cost ($)</label>
                        <input type="number" class="form-control" name="financials.mrc" value="${item.financials?.mrc || 0}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">NRC/OTC ($)</label>
                        <input type="number" class="form-control" name="financials.otc" value="${item.financials?.otc || 0}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Term (Months)</label>
                        <input type="number" class="form-control" id="term-input" name="financials.term" value="${item.financials?.term || 12}">
                    </div>
                </div>
                <div class="grid-1" id="om-rate-container" style="display: ${['IRU', 'Owned'].includes(item.acquisition?.ownership) ? 'block' : 'none'}">
                    <div class="grid-2">
                        <div class="form-group">
                            <label class="form-label">O&M Rate (%)</label>
                            <input type="number" class="form-control" id="om-rate-input" name="financials.omRate" value="${item.financials?.omRate || 0}" placeholder="e.g., 2.5 for 2.5%" step="0.1" min="0" max="100">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Annual O&M Cost ($)</label>
                            <input type="number" class="form-control" id="annual-om-cost" name="financials.annualOmCost" value="${item.financials?.annualOmCost || 0}" readonly style="background-color: var(--bg-card-hover); cursor: not-allowed;">
                        </div>
                    </div>
                </div>
                <div class="grid-2 mt-4">
                    <div class="form-group">
                        <label class="form-label">Start Date</label>
                        <input type="date" class="form-control" id="start-date-input" name="dates.start" value="${item.dates?.start || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">End Date (Auto-calculated)</label>
                        <input type="date" class="form-control" id="end-date-input" name="dates.end" value="${item.dates?.end || ''}" readonly style="background-color: var(--bg-card-hover); cursor: not-allowed;">
                    </div>
                </div>
    `;

        this.openModal(isEdit ? 'Edit Resource' : 'Add Resource', formHTML, () => {
            // Save Logic
            const form = document.getElementById('inv-form');
            const formData = new FormData(form);

            // Construct Object manually because of nested naming "location.aEnd.country"
            const handoffTypeValue = form.querySelector('[name="handoffType"]').value;
            const handoffTypeCustomValue = form.querySelector('[name="handoffTypeCustom"]')?.value || '';
            const finalHandoffType = handoffTypeValue === 'Other' ? handoffTypeCustomValue : handoffTypeValue;

            const newItem = {
                resourceId: form.querySelector('[name="resourceId"]').value,
                status: form.querySelector('[name="status"]').value,
                acquisition: {
                    ownership: form.querySelector('[name="acquisition.ownership"]').value,
                    supplier: form.querySelector('[name="acquisition.supplier"]').value,
                    contractRef: form.querySelector('[name="acquisition.contractRef"]').value,
                },
                cableSystem: form.querySelector('[name="cableSystem"]').value,
                segmentType: form.querySelector('[name="segmentType"]').value,
                handoffType: finalHandoffType,
                routeDescription: form.querySelector('[name="routeDescription"]').value,
                protection: form.querySelector('[name="protection"]').value,
                protectionCableSystem: form.querySelector('[name="protectionCableSystem"]')?.value || '',
                capacity: {
                    value: Number(form.querySelector('[name="capacity.value"]').value),
                    unit: form.querySelector('[name="capacity.unit"]').value
                },
                location: {
                    aEnd: {
                        country: form.querySelector('[name="location.aEnd.country"]').value,
                        city: form.querySelector('[name="location.aEnd.city"]').value,
                        pop: form.querySelector('[name="location.aEnd.pop"]').value,
                        port: form.querySelector('[name="location.aEnd.port"]').value,
                        device: form.querySelector('[name="location.aEnd.device"]').value
                    },
                    zEnd: {
                        country: form.querySelector('[name="location.zEnd.country"]').value,
                        city: form.querySelector('[name="location.zEnd.city"]').value,
                        pop: form.querySelector('[name="location.zEnd.pop"]').value,
                        port: form.querySelector('[name="location.zEnd.port"]').value,
                        device: form.querySelector('[name="location.zEnd.device"]').value
                    }
                },
                financials: {
                    mrc: Number(form.querySelector('[name="financials.mrc"]').value),
                    otc: Number(form.querySelector('[name="financials.otc"]').value),
                    term: Number(form.querySelector('[name="financials.term"]').value),
                    omRate: Number(form.querySelector('[name="financials.omRate"]')?.value || 0),
                    annualOmCost: Number(form.querySelector('[name="financials.annualOmCost"]')?.value || 0)
                },
                dates: {
                    start: form.querySelector('[name="dates.start"]').value,
                    end: form.querySelector('[name="dates.end"]').value
                }
            };

            if (isEdit) {
                window.Store.updateInventory(newItem.resourceId, newItem);
            } else {
                window.Store.addInventory(newItem);
            }
            return true;
        }, true);

        // Attach Form Event Listeners after modal is rendered
        this.attachInventoryFormListeners();
    },

    attachInventoryFormListeners() {
        // Protection Field Toggle
        const protectionSelect = document.querySelector('[name="protection"]');
        const protectionContainer = document.getElementById('protection-cable-container');
        if (protectionSelect && protectionContainer) {
            protectionSelect.addEventListener('change', (e) => {
                protectionContainer.style.display = e.target.value === 'Protected' ? 'block' : 'none';
            });
        }

        // Ownership Field Toggle (O&M Rate Section)
        const ownershipSelect = document.querySelector('[name="acquisition.ownership"]');
        const omRateContainer = document.getElementById('om-rate-container');
        if (ownershipSelect && omRateContainer) {
            ownershipSelect.addEventListener('change', (e) => {
                const showOm = ['IRU', 'Owned'].includes(e.target.value);
                omRateContainer.style.display = showOm ? 'block' : 'none';
            });
        }

        // Handoff Type Toggle
        const handoffSelect = document.getElementById('handoff-type-select');
        const handoffCustomContainer = document.getElementById('handoff-type-custom-container');
        if (handoffSelect && handoffCustomContainer) {
            handoffSelect.addEventListener('change', (e) => {
                handoffCustomContainer.style.display = e.target.value === 'Other' ? 'block' : 'none';
            });
        }

        // Auto-calculate End Date from Start Date + Term
        const startDateInput = document.getElementById('start-date-input');
        const termInput = document.getElementById('term-input');
        const endDateInput = document.getElementById('end-date-input');

        const calculateEndDate = () => {
            if (!startDateInput || !termInput || !endDateInput) return;
            const startVal = startDateInput.value;
            const termVal = parseInt(termInput.value, 10);

            if (startVal && termVal > 0) {
                const startDate = new Date(startVal);
                startDate.setMonth(startDate.getMonth() + termVal);
                // Format as YYYY-MM-DD
                const year = startDate.getFullYear();
                const month = String(startDate.getMonth() + 1).padStart(2, '0');
                const day = String(startDate.getDate()).padStart(2, '0');
                endDateInput.value = `${year}-${month}-${day}`;
            }
        };

        if (startDateInput && termInput) {
            startDateInput.addEventListener('change', calculateEndDate);
            termInput.addEventListener('input', calculateEndDate);
        }

        // O&M Rate Auto-calculate Annual O&M Cost
        const otcInput = document.querySelector('[name="financials.otc"]');
        const omRateInput = document.getElementById('om-rate-input');
        const annualOmCostInput = document.getElementById('annual-om-cost');

        const calculateOmCost = () => {
            if (!otcInput || !omRateInput || !annualOmCostInput) return;
            const otcVal = parseFloat(otcInput.value) || 0;
            const omRateVal = parseFloat(omRateInput.value) || 0;
            const annualCost = (otcVal * omRateVal / 100);
            annualOmCostInput.value = annualCost.toFixed(2);
        };

        if (otcInput && omRateInput) {
            otcInput.addEventListener('input', calculateOmCost);
            omRateInput.addEventListener('input', calculateOmCost);
        }
    },

    renderSales() {
        const data = window.Store.getSales();

        // Add "Add Sale" button
        const addBtn = document.createElement('button');
        addBtn.className = 'btn btn-primary';
        addBtn.innerHTML = '<ion-icon name="add-outline"></ion-icon> New Sale';
        addBtn.onclick = () => alert('Add Modal coming soon...');
        this.headerActions.appendChild(addBtn);

        const html = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Order ID</th>
                            <th>Customer</th>
                            <th>Status</th>
                            <th>Inventory Link</th>
                            <th>Revenue (MRR)</th>
                            <th>Direct Margin</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(item => {
            const mrr = item.financials?.totalMrr || 0;
            // Calculate Sales Specific Margin (MRR - CableCostMRC - XCs - Backhauls)
            // Simplified for display
            const costProps = ['cableCost', 'backhaulA', 'backhaulZ', 'crossConnectA', 'crossConnectZ'];
            let totalDirectCost = 0;
            if (item.costs) {
                costProps.forEach(k => {
                    totalDirectCost += (item.costs[k]?.mrc || 0);
                });
            }
            const margin = mrr - totalDirectCost;

            return `
                            <tr>
                                <td class="font-mono" style="color: var(--accent-secondary)">${item.salesOrderId}</td>
                                <td style="font-weight:600">${item.customerName}</td>
                                <td><span class="badge badge-success">${item.status}</span></td>
                                <td class="font-mono">${item.inventoryLink}</td>
                                <td class="font-mono" style="color: var(--accent-success)">$${mrr.toLocaleString()}</td>
                                <td class="font-mono">$${margin.toLocaleString()}</td>
                                <td>
                                    <button class="btn btn-secondary" style="padding:0.4rem"><ion-icon name="create-outline"></ion-icon></button>
                                </td>
                            </tr>
                            `;
        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
        this.container.innerHTML = html;
    }
};

// CRITICAL: Make App globally accessible for onclick handlers
window.App = App;

// Start
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
