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
            window.Store.deleteInventory(id);
            this.renderInventoryView();
        }
    },

    deleteSalesOrder(id) {
        if (confirm('Are you sure you want to delete this sales order?')) {
            window.Store.deleteSalesOrder(id);
            this.renderView('sales');
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

        // Salesperson Leaderboard (sorted by total MRR)
        const salesByPerson = {};
        sales.forEach(s => {
            const name = s.salesperson || 'Unassigned';
            if (!salesByPerson[name]) {
                salesByPerson[name] = { name, totalMrr: 0, orderCount: 0 };
            }
            salesByPerson[name].totalMrr += (s.financials?.mrcSales || s.financials?.totalMrr || 0);
            salesByPerson[name].orderCount += 1;
        });
        const leaderboard = Object.values(salesByPerson).sort((a, b) => b.totalMrr - a.totalMrr);

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
            <div class="grid-3 mb-4">
                <!-- Sales Leaderboard -->
                <div class="card" style="border-left: 4px solid var(--accent-primary);">
                    <div class="flex justify-between items-center mb-4">
                        <h3 style="color: var(--accent-primary)"><ion-icon name="trophy-outline"></ion-icon> Sales Leaderboard</h3>
                    </div>
                    ${leaderboard.length === 0 ? '<p style="color:var(--text-muted)">No sales data available.</p>' : `
                        <table style="font-size:0.85rem;">
                            <thead><tr><th>#</th><th>Salesperson</th><th>MRR</th><th>Orders</th></tr></thead>
                            <tbody>
                                ${leaderboard.slice(0, 5).map((p, idx) => `
                                    <tr>
                                        <td style="font-weight:600; color:${idx === 0 ? 'var(--accent-warning)' : 'var(--text-muted)'}">${idx + 1}</td>
                                        <td style="font-weight:${idx === 0 ? '600' : '400'}">${p.name}</td>
                                        <td class="font-mono" style="color:var(--accent-success)">$${p.totalMrr.toLocaleString()}</td>
                                        <td>${p.orderCount}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    `}
                </div>

                <div class="card">
                    <h3 class="mb-4">Recent Activity</h3>
                    <p style="color: var(--text-muted)">System initialized.</p>
                </div>
                <div class="card" style="background: linear-gradient(145deg, rgba(99,91,255,0.05), transparent);">
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
        const availableResources = window.Store.getAvailableResources();
        const allSales = window.Store.getSales();

        const resourceOptions = availableResources.map(r => {
            // Calculate available capacity
            const linkedSales = allSales.filter(s => s.inventoryLink === r.resourceId);
            let soldCapacity = 0;
            linkedSales.forEach(s => { soldCapacity += (s.capacity?.value || 0); });
            const availableCapacity = (r.capacity?.value || 0) - soldCapacity;

            return `<option value="${r.resourceId}">${r.resourceId} - ${r.cableSystem} (${availableCapacity} ${r.capacity?.unit || 'Gbps'} available)</option>`;
        }).join('');

        const modalContent = `
            <div class="grid-2 gap-2" style="align-items: start;">
                <!-- LEFT COLUMN: Sales Info -->
                <div class="section-card">
                    <h4 class="mb-4" style="color: var(--accent-primary); border-bottom: 1px solid var(--border-color); padding-bottom:0.5rem;">Sales Information</h4>
                    
                    <div class="grid-2">
                        <div class="form-group">
                            <label class="form-label">Order ID <small style="color:var(--text-muted)">(Auto if blank)</small></label>
                            <input type="text" class="form-control font-mono" name="orderId" placeholder="e.g., ORD-001">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Customer Name</label>
                            <input type="text" class="form-control" name="customerName" required>
                        </div>
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
                            <label class="form-label">Capacity Sold</label>
                            <input type="number" class="form-control" name="capacity.value" value="10" min="1" placeholder="e.g., 10">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Unit</label>
                            <select class="form-control" name="capacity.unit">
                                <option>Gbps</option>
                                <option>Wavelength</option>
                                <option>Fiber Pair</option>
                            </select>
                        </div>
                    </div>

                    <div class="grid-3">
                        <div class="form-group">
                            <label class="form-label">Contract Start</label>
                            <input type="date" class="form-control" name="dates.start" id="sales-start-date" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Term (Months)</label>
                            <input type="number" class="form-control" name="dates.term" id="sales-term" value="12" min="1" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Contract End <small style="color:var(--text-muted)">(Auto)</small></label>
                            <input type="date" class="form-control" name="dates.end" id="sales-end-date" readonly style="background: var(--bg-card-hover);">
                        </div>
                    </div>

                    <div class="grid-2">
                        <div class="form-group">
                            <label class="form-label">Sales Status</label>
                            <input type="text" class="form-control" id="sales-status-display" value="Pending" readonly style="background: var(--bg-card-hover); color: var(--text-secondary);">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Salesperson</label>
                            <select class="form-control" name="salesperson" required>
                                <option value="">Select...</option>
                                <option>Janna Dai</option>
                                <option>Miki Chen</option>
                                <option>Wayne Jiang</option>
                                <option>Kristen Gan</option>
                                <option>Becky Hai</option>
                                <option>Wolf Yuan</option>
                                <option>Yifeng Jiang</option>
                            </select>
                        </div>
                    </div>

                    <h5 class="mt-4 mb-2">Delivery Location</h5>
                    <div class="grid-2">
                        <div style="background:rgba(255,255,255,0.02); padding:0.75rem; border-radius:4px;">
                            <h6 style="color:var(--accent-primary); margin: 0 0 0.5rem 0; font-size:0.8rem;">A-End</h6>
                            <div class="grid-2">
                                <div class="form-group">
                                    <label class="form-label">City</label>
                                    <input type="text" class="form-control" name="location.aEnd.city" placeholder="e.g., Hong Kong">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">PoP</label>
                                    <input type="text" class="form-control" name="location.aEnd.pop" placeholder="e.g., Equinix HK1">
                                </div>
                            </div>
                        </div>
                        <div style="background:rgba(255,255,255,0.02); padding:0.75rem; border-radius:4px;">
                            <h6 style="color:var(--accent-secondary); margin: 0 0 0.5rem 0; font-size:0.8rem;">Z-End</h6>
                            <div class="grid-2">
                                <div class="form-group">
                                    <label class="form-label">City</label>
                                    <input type="text" class="form-control" name="location.zEnd.city" placeholder="e.g., Singapore">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">PoP</label>
                                    <input type="text" class="form-control" name="location.zEnd.pop" placeholder="e.g., Equinix SG1">
                                </div>
                            </div>
                        </div>
                    </div>

                    <h5 class="mt-4 mb-2">Sales Model & Type</h5>
                    <div class="grid-2">
                        <div class="form-group">
                            <label class="form-label">Sales Model</label>
                            <select class="form-control" name="salesModel" id="sales-model-select">
                                <option value="Lease">Lease (月租模式)</option>
                                <option value="IRU">IRU (买断模式)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Sales Type</label>
                            <select class="form-control calc-trigger" name="salesType" id="sales-type-select">
                                <option value="Resale">Resale (外部资源)</option>
                                <option value="Hybrid">Hybrid (混合资源)</option>
                                <option value="Inventory">Inventory (自有资源)</option>
                                <option value="Swapped Out">Swapped Out (置换出去)</option>
                            </select>
                        </div>
                    </div>

                    <h5 class="mt-4 mb-2">Revenue / Price</h5>
                    <!-- Lease Revenue Fields -->
                    <div id="lease-revenue-fields">
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
                    </div>
                    <!-- IRU Revenue Fields -->
                    <div id="iru-revenue-fields" style="display:none;">
                        <div class="grid-3" style="align-items: end;">
                            <div class="form-group">
                                <label class="form-label">OTC ($)</label>
                                <input type="number" class="form-control calc-trigger" name="financials.otc" id="sales-otc" value="0">
                            </div>
                            <div class="form-group">
                                <label class="form-label">O&M Rate (%)</label>
                                <input type="number" class="form-control calc-trigger" name="financials.omRate" id="sales-om-rate" value="3" step="0.1">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Annual O&M</label>
                                <input type="number" class="form-control" name="financials.annualOm" id="sales-annual-om" value="0" readonly style="background: var(--bg-card-hover);">
                            </div>
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

                    <!-- Add Cost Buttons (Sticky with Wrapper) -->
                    <div id="cost-buttons" class="mb-4" style="display: flex; flex-wrap: wrap; gap: 0.5rem; position: sticky; top: 0; background: var(--bg-card); padding: 0.75rem; margin: -0.5rem -0.5rem 0.5rem -0.5rem; z-index: 10; box-shadow: 0 4px 12px rgba(0,0,0,0.3); border-radius: 8px;">
                        <button type="button" class="btn btn-secondary cost-add-btn" data-cost-type="cable" id="add-cable-btn" style="font-size: 0.8rem;">
                            <ion-icon name="add-outline"></ion-icon> 3rd Party Cable
                        </button>
                        <button type="button" class="btn btn-secondary cost-add-btn" data-cost-type="backhaulA" id="add-backhaul-a-btn" style="font-size: 0.8rem;">
                            <ion-icon name="add-outline"></ion-icon> Backhaul A
                        </button>
                        <button type="button" class="btn btn-secondary cost-add-btn" data-cost-type="backhaulZ" id="add-backhaul-z-btn" style="font-size: 0.8rem;">
                            <ion-icon name="add-outline"></ion-icon> Backhaul Z
                        </button>
                        <button type="button" class="btn btn-secondary cost-add-btn" data-cost-type="xcA" id="add-xc-a-btn" style="font-size: 0.8rem;">
                            <ion-icon name="add-outline"></ion-icon> XC A
                        </button>
                        <button type="button" class="btn btn-secondary cost-add-btn" data-cost-type="xcZ" id="add-xc-z-btn" style="font-size: 0.8rem;">
                            <ion-icon name="add-outline"></ion-icon> XC Z
                        </button>
                        <button type="button" class="btn btn-secondary cost-add-btn cost-add-multi" data-cost-type="other" id="add-other-btn" style="font-size: 0.8rem;">
                            <ion-icon name="add-outline"></ion-icon> Other Costs
                        </button>
                    </div>

                    <!-- Dynamic Cost Cards Container -->
                    <div id="cost-cards-container">
                        <!-- Cost cards will be inserted here dynamically -->
                    </div>

                    <!-- Hidden inputs for form submission (will be populated by JS) -->
                    <!-- Cable Cost -->
                    <input type="hidden" name="costs.cable.supplier" value="">
                    <input type="hidden" name="costs.cable.orderNo" value="">
                    <input type="hidden" name="costs.cable.cableSystem" value="">
                    <input type="hidden" name="costs.cable.capacity" value="0">
                    <input type="hidden" name="costs.cable.capacityUnit" value="Gbps">
                    <input type="hidden" name="costs.cable.model" value="Lease">
                    <input type="hidden" name="costs.cable.protection" value="Unprotected">
                    <input type="hidden" name="costs.cable.protectionCableSystem" value="">
                    <input type="hidden" name="costs.cable.mrc" value="0">
                    <input type="hidden" name="costs.cable.nrc" value="0">
                    <input type="hidden" name="costs.cable.otc" value="0">
                    <input type="hidden" name="costs.cable.omRate" value="0">
                    <input type="hidden" name="costs.cable.annualOm" value="0">
                    <input type="hidden" name="costs.cable.startDate" value="">
                    <input type="hidden" name="costs.cable.termMonths" value="12">
                    <input type="hidden" name="costs.cable.endDate" value="">
                    <!-- Backhaul -->
                    <input type="hidden" name="costs.backhaul.aEnd.monthly" value="0">
                    <input type="hidden" name="costs.backhaul.aEnd.nrc" value="0">
                    <input type="hidden" name="costs.backhaul.zEnd.monthly" value="0">
                    <input type="hidden" name="costs.backhaul.zEnd.nrc" value="0">
                    <!-- Cross Connect -->
                    <input type="hidden" name="costs.crossConnect.aEnd.monthly" value="0">
                    <input type="hidden" name="costs.crossConnect.aEnd.nrc" value="0">
                    <input type="hidden" name="costs.crossConnect.zEnd.monthly" value="0">
                    <input type="hidden" name="costs.crossConnect.zEnd.nrc" value="0">
                    <!-- Other Costs -->
                    <input type="hidden" name="costs.otherCosts.description" value="">
                    <input type="hidden" name="costs.otherCosts.oneOff" value="0">
                    <input type="hidden" name="costs.otherCosts.monthly" value="0">
                </div>
            </div>
        `;

        this.openModal('New Sales Order', modalContent, (form) => this.handleSalesSubmit(form), true); // true for large modal

        // Attach Event Listeners for Dynamic Logic
        this.attachSalesFormListeners();
    },

    attachSalesFormListeners() {
        // ===== Cost Card Templates =====
        const costCardTemplates = {
            cable: `
                <div class="cost-card" data-cost-type="cable" style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem; margin-bottom: 1rem; position: relative;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                        <h5 style="color: var(--accent-primary); margin: 0; font-size: 0.9rem;">3rd Party Cable Cost</h5>
                        <button type="button" class="btn-icon cost-remove-btn" style="color: var(--accent-danger); padding: 0.25rem;" title="Remove">
                            <ion-icon name="close-outline"></ion-icon>
                        </button>
                    </div>
                    
                    <!-- Basic Info -->
                    <div class="grid-2">
                        <div class="form-group">
                            <label class="form-label">Supplier</label>
                            <input type="text" class="form-control cost-input" data-field="costs.cable.supplier">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Order No.</label>
                            <input type="text" class="form-control cost-input" data-field="costs.cable.orderNo">
                        </div>
                    </div>
                    <div class="grid-2">
                        <div class="form-group">
                            <label class="form-label">Cable System</label>
                            <input type="text" class="form-control cost-input" data-field="costs.cable.cableSystem">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Capacity</label>
                            <div style="display: flex; gap: 0.5rem;">
                                <input type="number" class="form-control cost-input" data-field="costs.cable.capacity" value="0" style="flex: 1;">
                                <select class="form-control cost-input" data-field="costs.cable.capacityUnit" style="width: 100px;">
                                    <option value="Gbps">Gbps</option>
                                    <option value="Wavelength">Wavelength</option>
                                    <option value="Fiber Pair">Fiber Pair</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div class="grid-2">
                        <div class="form-group">
                            <label class="form-label">Cost Model</label>
                            <select class="form-control cost-input cable-cost-model-select" data-field="costs.cable.model">
                                <option value="Lease">Lease</option>
                                <option value="IRU">IRU</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Protection</label>
                            <select class="form-control cost-input cable-protection-select" data-field="costs.cable.protection">
                                <option value="Unprotected">Unprotected</option>
                                <option value="Protected">Protected</option>
                            </select>
                        </div>
                    </div>
                    <div class="cable-protection-system-container form-group" style="display: none;">
                        <label class="form-label">Protection Cable System</label>
                        <input type="text" class="form-control cost-input" data-field="costs.cable.protectionCableSystem" placeholder="Protection cable system name">
                    </div>

                    <!-- Lease Cost Fields -->
                    <div class="cable-lease-fields" style="background: rgba(255,255,255,0.02); padding: 0.75rem; border-radius: 4px; margin-top: 0.5rem;">
                        <h6 style="color: var(--accent-success); margin: 0 0 0.5rem 0; font-size: 0.8rem;">Lease Costs</h6>
                        <div class="grid-2">
                            <div class="form-group">
                                <label class="form-label">MRC ($)</label>
                                <input type="number" class="form-control cost-input calc-trigger" data-field="costs.cable.mrc" value="0">
                            </div>
                            <div class="form-group">
                                <label class="form-label">NRC ($)</label>
                                <input type="number" class="form-control cost-input calc-trigger" data-field="costs.cable.nrc" value="0">
                            </div>
                        </div>
                    </div>

                    <!-- IRU Cost Fields -->
                    <div class="cable-iru-fields" style="display: none; background: rgba(255,255,255,0.02); padding: 0.75rem; border-radius: 4px; margin-top: 0.5rem;">
                        <h6 style="color: var(--accent-warning); margin: 0 0 0.5rem 0; font-size: 0.8rem;">IRU Costs</h6>
                        <div class="grid-3c">
                            <div class="form-group">
                                <label class="form-label">OTC ($)</label>
                                <input type="number" class="form-control cost-input calc-trigger cable-otc-input" data-field="costs.cable.otc" value="0">
                            </div>
                            <div class="form-group">
                                <label class="form-label">O&M Rate (%)</label>
                                <input type="number" class="form-control cost-input calc-trigger cable-om-rate-input" data-field="costs.cable.omRate" value="0" step="0.1">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Annual O&M ($)</label>
                                <input type="number" class="form-control cost-input cable-annual-om-display" data-field="costs.cable.annualOm" value="0" readonly style="background: var(--bg-card-hover);">
                            </div>
                        </div>
                    </div>

                    <!-- Contract Dates -->
                    <div style="background: rgba(255,255,255,0.02); padding: 0.75rem; border-radius: 4px; margin-top: 0.5rem;">
                        <h6 style="color: var(--text-muted); margin: 0 0 0.5rem 0; font-size: 0.8rem;">Contract Period</h6>
                        <div class="grid-3c">
                            <div class="form-group">
                                <label class="form-label">Start Date</label>
                                <input type="date" class="form-control cost-input cable-start-date" data-field="costs.cable.startDate">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Term (Months)</label>
                                <input type="number" class="form-control cost-input cable-term-months" data-field="costs.cable.termMonths" value="12">
                            </div>
                            <div class="form-group">
                                <label class="form-label">End Date</label>
                                <input type="date" class="form-control cost-input cable-end-date" data-field="costs.cable.endDate" readonly style="background: var(--bg-card-hover);">
                            </div>
                        </div>
                    </div>
                    <!-- Notes -->
                    <div class="form-group" style="margin-top: 0.5rem;">
                        <label class="form-label">Notes</label>
                        <input type="text" class="form-control cost-input" data-field="costs.cable.notes" placeholder="Additional notes...">
                    </div>
                </div>
            `,
            backhaulA: `
                <div class="cost-card" data-cost-type="backhaulA" style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem; margin-bottom: 1rem; position: relative;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                        <h5 style="color: var(--accent-warning); margin: 0; font-size: 0.9rem;">Backhaul A-End</h5>
                        <button type="button" class="btn-icon cost-remove-btn" style="color: var(--accent-danger); padding: 0.25rem;" title="Remove">
                            <ion-icon name="close-outline"></ion-icon>
                        </button>
                    </div>
                    <div class="grid-2">
                        <div class="form-group">
                            <label class="form-label">Supplier</label>
                            <input type="text" class="form-control cost-input" data-field="costs.backhaulA.supplier">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Order No.</label>
                            <input type="text" class="form-control cost-input" data-field="costs.backhaulA.orderNo">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Cost Model</label>
                        <select class="form-control cost-input bh-a-cost-model-select" data-field="costs.backhaulA.model">
                            <option value="Lease">Lease</option>
                            <option value="IRU">IRU</option>
                        </select>
                    </div>
                    <div class="bh-a-lease-fields" style="background: rgba(255,255,255,0.02); padding: 0.75rem; border-radius: 4px; margin-top: 0.5rem;">
                        <div class="grid-2">
                            <div class="form-group">
                                <label class="form-label">MRC ($)</label>
                                <input type="number" class="form-control cost-input calc-trigger" data-field="costs.backhaulA.mrc" value="0">
                            </div>
                            <div class="form-group">
                                <label class="form-label">NRC ($)</label>
                                <input type="number" class="form-control cost-input calc-trigger" data-field="costs.backhaulA.nrc" value="0">
                            </div>
                        </div>
                    </div>
                    <div class="bh-a-iru-fields" style="display: none; background: rgba(255,255,255,0.02); padding: 0.75rem; border-radius: 4px; margin-top: 0.5rem;">
                        <div class="grid-3c">
                            <div class="form-group">
                                <label class="form-label">OTC ($)</label>
                                <input type="number" class="form-control cost-input calc-trigger bh-a-otc" data-field="costs.backhaulA.otc" value="0">
                            </div>
                            <div class="form-group">
                                <label class="form-label">O&M Rate (%)</label>
                                <input type="number" class="form-control cost-input calc-trigger bh-a-om-rate" data-field="costs.backhaulA.omRate" value="0" step="0.1">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Annual O&M ($)</label>
                                <input type="number" class="form-control cost-input bh-a-annual-om" data-field="costs.backhaulA.annualOm" value="0" readonly style="background: var(--bg-card-hover);">
                            </div>
                        </div>
                    </div>
                    <div style="background: rgba(255,255,255,0.02); padding: 0.75rem; border-radius: 4px; margin-top: 0.5rem;">
                        <div class="grid-3c">
                            <div class="form-group">
                                <label class="form-label">Start Date</label>
                                <input type="date" class="form-control cost-input bh-a-start-date" data-field="costs.backhaulA.startDate">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Term (Months)</label>
                                <input type="number" class="form-control cost-input bh-a-term" data-field="costs.backhaulA.termMonths" value="12">
                            </div>
                            <div class="form-group">
                                <label class="form-label">End Date</label>
                                <input type="date" class="form-control cost-input bh-a-end-date" data-field="costs.backhaulA.endDate" readonly style="background: var(--bg-card-hover);">
                            </div>
                        </div>
                    </div>
                    <div class="form-group" style="margin-top: 0.5rem;">
                        <label class="form-label">Notes</label>
                        <input type="text" class="form-control cost-input" data-field="costs.backhaulA.notes" placeholder="Additional notes...">
                    </div>
                </div>
            `,
            backhaulZ: `
                <div class="cost-card" data-cost-type="backhaulZ" style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem; margin-bottom: 1rem; position: relative;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                        <h5 style="color: var(--accent-warning); margin: 0; font-size: 0.9rem;">Backhaul Z-End</h5>
                        <button type="button" class="btn-icon cost-remove-btn" style="color: var(--accent-danger); padding: 0.25rem;" title="Remove">
                            <ion-icon name="close-outline"></ion-icon>
                        </button>
                    </div>
                    <div class="grid-2">
                        <div class="form-group">
                            <label class="form-label">Supplier</label>
                            <input type="text" class="form-control cost-input" data-field="costs.backhaulZ.supplier">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Order No.</label>
                            <input type="text" class="form-control cost-input" data-field="costs.backhaulZ.orderNo">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Cost Model</label>
                        <select class="form-control cost-input bh-z-cost-model-select" data-field="costs.backhaulZ.model">
                            <option value="Lease">Lease</option>
                            <option value="IRU">IRU</option>
                        </select>
                    </div>
                    <div class="bh-z-lease-fields" style="background: rgba(255,255,255,0.02); padding: 0.75rem; border-radius: 4px; margin-top: 0.5rem;">
                        <div class="grid-2">
                            <div class="form-group">
                                <label class="form-label">MRC ($)</label>
                                <input type="number" class="form-control cost-input calc-trigger" data-field="costs.backhaulZ.mrc" value="0">
                            </div>
                            <div class="form-group">
                                <label class="form-label">NRC ($)</label>
                                <input type="number" class="form-control cost-input calc-trigger" data-field="costs.backhaulZ.nrc" value="0">
                            </div>
                        </div>
                    </div>
                    <div class="bh-z-iru-fields" style="display: none; background: rgba(255,255,255,0.02); padding: 0.75rem; border-radius: 4px; margin-top: 0.5rem;">
                        <div class="grid-3c">
                            <div class="form-group">
                                <label class="form-label">OTC ($)</label>
                                <input type="number" class="form-control cost-input calc-trigger bh-z-otc" data-field="costs.backhaulZ.otc" value="0">
                            </div>
                            <div class="form-group">
                                <label class="form-label">O&M Rate (%)</label>
                                <input type="number" class="form-control cost-input calc-trigger bh-z-om-rate" data-field="costs.backhaulZ.omRate" value="0" step="0.1">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Annual O&M ($)</label>
                                <input type="number" class="form-control cost-input bh-z-annual-om" data-field="costs.backhaulZ.annualOm" value="0" readonly style="background: var(--bg-card-hover);">
                            </div>
                        </div>
                    </div>
                    <div style="background: rgba(255,255,255,0.02); padding: 0.75rem; border-radius: 4px; margin-top: 0.5rem;">
                        <div class="grid-3c">
                            <div class="form-group">
                                <label class="form-label">Start Date</label>
                                <input type="date" class="form-control cost-input bh-z-start-date" data-field="costs.backhaulZ.startDate">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Term (Months)</label>
                                <input type="number" class="form-control cost-input bh-z-term" data-field="costs.backhaulZ.termMonths" value="12">
                            </div>
                            <div class="form-group">
                                <label class="form-label">End Date</label>
                                <input type="date" class="form-control cost-input bh-z-end-date" data-field="costs.backhaulZ.endDate" readonly style="background: var(--bg-card-hover);">
                            </div>
                        </div>
                    </div>
                    <div class="form-group" style="margin-top: 0.5rem;">
                        <label class="form-label">Notes</label>
                        <input type="text" class="form-control cost-input" data-field="costs.backhaulZ.notes" placeholder="Additional notes...">
                    </div>
                </div>
            `,
            xcA: `
                <div class="cost-card" data-cost-type="xcA" style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem; margin-bottom: 1rem; position: relative;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                        <h5 style="color: var(--accent-secondary); margin: 0; font-size: 0.9rem;">Cross Connect A-End</h5>
                        <button type="button" class="btn-icon cost-remove-btn" style="color: var(--accent-danger); padding: 0.25rem;" title="Remove">
                            <ion-icon name="close-outline"></ion-icon>
                        </button>
                    </div>
                    <div class="grid-2">
                        <div class="form-group">
                            <label class="form-label">Supplier</label>
                            <input type="text" class="form-control cost-input" data-field="costs.xcA.supplier">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Order No.</label>
                            <input type="text" class="form-control cost-input" data-field="costs.xcA.orderNo">
                        </div>
                    </div>
                    <div class="grid-2">
                        <div class="form-group">
                            <label class="form-label">Monthly Fee ($)</label>
                            <input type="number" class="form-control cost-input calc-trigger" data-field="costs.xcA.monthly" value="0">
                        </div>
                        <div class="form-group">
                            <label class="form-label">NRC ($)</label>
                            <input type="number" class="form-control cost-input calc-trigger" data-field="costs.xcA.nrc" value="0">
                        </div>
                    </div>
                    <div style="background: rgba(255,255,255,0.02); padding: 0.75rem; border-radius: 4px; margin-top: 0.5rem;">
                        <div class="grid-3c">
                            <div class="form-group">
                                <label class="form-label">Start Date</label>
                                <input type="date" class="form-control cost-input xc-a-start-date" data-field="costs.xcA.startDate">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Term (Months)</label>
                                <input type="number" class="form-control cost-input xc-a-term" data-field="costs.xcA.termMonths" value="12">
                            </div>
                            <div class="form-group">
                                <label class="form-label">End Date</label>
                                <input type="date" class="form-control cost-input xc-a-end-date" data-field="costs.xcA.endDate" readonly style="background: var(--bg-card-hover);">
                            </div>
                        </div>
                    </div>
                    <div class="form-group" style="margin-top: 0.5rem;">
                        <label class="form-label">Notes</label>
                        <input type="text" class="form-control cost-input" data-field="costs.xcA.notes" placeholder="Additional notes...">
                    </div>
                </div>
            `,
            xcZ: `
                <div class="cost-card" data-cost-type="xcZ" style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem; margin-bottom: 1rem; position: relative;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                        <h5 style="color: var(--accent-secondary); margin: 0; font-size: 0.9rem;">Cross Connect Z-End</h5>
                        <button type="button" class="btn-icon cost-remove-btn" style="color: var(--accent-danger); padding: 0.25rem;" title="Remove">
                            <ion-icon name="close-outline"></ion-icon>
                        </button>
                    </div>
                    <div class="grid-2">
                        <div class="form-group">
                            <label class="form-label">Supplier</label>
                            <input type="text" class="form-control cost-input" data-field="costs.xcZ.supplier">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Order No.</label>
                            <input type="text" class="form-control cost-input" data-field="costs.xcZ.orderNo">
                        </div>
                    </div>
                    <div class="grid-2">
                        <div class="form-group">
                            <label class="form-label">Monthly Fee ($)</label>
                            <input type="number" class="form-control cost-input calc-trigger" data-field="costs.xcZ.monthly" value="0">
                        </div>
                        <div class="form-group">
                            <label class="form-label">NRC ($)</label>
                            <input type="number" class="form-control cost-input calc-trigger" data-field="costs.xcZ.nrc" value="0">
                        </div>
                    </div>
                    <div style="background: rgba(255,255,255,0.02); padding: 0.75rem; border-radius: 4px; margin-top: 0.5rem;">
                        <div class="grid-3c">
                            <div class="form-group">
                                <label class="form-label">Start Date</label>
                                <input type="date" class="form-control cost-input xc-z-start-date" data-field="costs.xcZ.startDate">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Term (Months)</label>
                                <input type="number" class="form-control cost-input xc-z-term" data-field="costs.xcZ.termMonths" value="12">
                            </div>
                            <div class="form-group">
                                <label class="form-label">End Date</label>
                                <input type="date" class="form-control cost-input xc-z-end-date" data-field="costs.xcZ.endDate" readonly style="background: var(--bg-card-hover);">
                            </div>
                        </div>
                    </div>
                    <div class="form-group" style="margin-top: 0.5rem;">
                        <label class="form-label">Notes</label>
                        <input type="text" class="form-control cost-input" data-field="costs.xcZ.notes" placeholder="Additional notes...">
                    </div>
                </div>
            `,
            other: `
                <div class="cost-card cost-card-multi" data-cost-type="other" style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem; margin-bottom: 1rem; position: relative;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                        <h5 style="color: var(--text-muted); margin: 0; font-size: 0.9rem;">Other Costs</h5>
                        <button type="button" class="btn-icon cost-remove-btn" style="color: var(--accent-danger); padding: 0.25rem;" title="Remove">
                            <ion-icon name="close-outline"></ion-icon>
                        </button>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Description</label>
                        <input type="text" class="form-control cost-input" data-field-base="costs.other.description" placeholder="e.g., Smart Hands, Testing, etc.">
                    </div>
                    <div class="grid-2">
                        <div class="form-group">
                            <label class="form-label">Supplier</label>
                            <input type="text" class="form-control cost-input" data-field-base="costs.other.supplier">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Order No.</label>
                            <input type="text" class="form-control cost-input" data-field-base="costs.other.orderNo">
                        </div>
                    </div>
                    <div class="grid-2">
                        <div class="form-group">
                            <label class="form-label">One-off Fee ($)</label>
                            <input type="number" class="form-control cost-input calc-trigger" data-field-base="costs.other.oneOff" value="0">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Monthly Fee ($)</label>
                            <input type="number" class="form-control cost-input calc-trigger" data-field-base="costs.other.monthly" value="0">
                        </div>
                    </div>
                    <div style="background: rgba(255,255,255,0.02); padding: 0.75rem; border-radius: 4px; margin-top: 0.5rem;">
                        <div class="grid-3c">
                            <div class="form-group">
                                <label class="form-label">Start Date</label>
                                <input type="date" class="form-control cost-input other-start-date" data-field-base="costs.other.startDate">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Term (Months)</label>
                                <input type="number" class="form-control cost-input other-term" data-field-base="costs.other.termMonths" value="12">
                            </div>
                            <div class="form-group">
                                <label class="form-label">End Date</label>
                                <input type="date" class="form-control cost-input other-end-date" data-field-base="costs.other.endDate" readonly style="background: var(--bg-card-hover);">
                            </div>
                        </div>
                    </div>
                    <div class="form-group" style="margin-top: 0.5rem;">
                        <label class="form-label">Notes</label>
                        <input type="text" class="form-control cost-input" data-field-base="costs.other.notes" placeholder="Additional notes...">
                    </div>
                </div>
            `
        };

        const cardsContainer = document.getElementById('cost-cards-container');
        const addedCostTypes = new Set();

        // ===== Add Cost Card Function =====
        let otherCostCounter = 0; // Counter for unique Other Costs cards

        const addCostCard = (type, isMulti = false) => {
            // For non-multi types, prevent duplicates
            if (!isMulti && addedCostTypes.has(type)) return;

            const template = costCardTemplates[type];
            if (!template) return;

            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = template.trim();
            const card = tempDiv.firstChild;

            // For multi-add cards, assign unique ID
            if (isMulti) {
                const uniqueId = `${type}_${++otherCostCounter}`;
                card.dataset.uniqueId = uniqueId;
            } else {
                addedCostTypes.add(type);
            }

            cardsContainer.appendChild(card);

            // Update button state (only for non-multi types)
            if (!isMulti) {
                const btn = document.querySelector(`.cost-add-btn[data-cost-type="${type}"]`);
                if (btn) {
                    btn.disabled = true;
                    btn.style.opacity = '0.5';
                }
            }

            // Attach remove handler
            card.querySelector('.cost-remove-btn').addEventListener('click', () => {
                removeCostCard(type, card);
            });

            // Attach input sync handlers
            card.querySelectorAll('.cost-input').forEach(input => {
                input.addEventListener('input', () => {
                    syncCostInputs();
                    this.calculateSalesFinancials();
                });
                input.addEventListener('change', () => {
                    syncCostInputs();
                    this.calculateSalesFinancials();
                });
            });

            // Attach special handlers for cable card
            if (type === 'cable') {
                const modelSelect = card.querySelector('.cable-cost-model-select');
                const leaseFields = card.querySelector('.cable-lease-fields');
                const iruFields = card.querySelector('.cable-iru-fields');
                const protectionSelect = card.querySelector('.cable-protection-select');
                const protectionSystemContainer = card.querySelector('.cable-protection-system-container');
                const otcInput = card.querySelector('.cable-otc-input');
                const omRateInput = card.querySelector('.cable-om-rate-input');
                const annualOmDisplay = card.querySelector('.cable-annual-om-display');
                const startDateInput = card.querySelector('.cable-start-date');
                const termMonthsInput = card.querySelector('.cable-term-months');
                const endDateInput = card.querySelector('.cable-end-date');

                // Cost Model Toggle (Lease vs IRU)
                if (modelSelect && leaseFields && iruFields) {
                    modelSelect.addEventListener('change', (e) => {
                        const isIRU = e.target.value === 'IRU';
                        leaseFields.style.display = isIRU ? 'none' : 'block';
                        iruFields.style.display = isIRU ? 'block' : 'none';
                        syncCostInputs();
                        this.calculateSalesFinancials();
                    });
                }

                // Protection Toggle
                if (protectionSelect && protectionSystemContainer) {
                    protectionSelect.addEventListener('change', (e) => {
                        protectionSystemContainer.style.display = e.target.value === 'Protected' ? 'block' : 'none';
                        syncCostInputs();
                    });
                }

                // Annual O&M Auto-calculation
                const calculateAnnualOm = () => {
                    if (otcInput && omRateInput && annualOmDisplay) {
                        const otc = Number(otcInput.value) || 0;
                        const rate = Number(omRateInput.value) || 0;
                        annualOmDisplay.value = (otc * rate / 100).toFixed(2);
                        syncCostInputs();
                    }
                };
                if (otcInput) otcInput.addEventListener('input', calculateAnnualOm);
                if (omRateInput) omRateInput.addEventListener('input', calculateAnnualOm);

                // Contract End Date Auto-calculation
                const calculateEndDate = () => {
                    if (startDateInput && termMonthsInput && endDateInput && startDateInput.value) {
                        const start = new Date(startDateInput.value);
                        const months = parseInt(termMonthsInput.value) || 0;
                        const end = new Date(start);
                        end.setMonth(end.getMonth() + months);
                        endDateInput.value = end.toISOString().split('T')[0];
                        syncCostInputs();
                    }
                };
                if (startDateInput) startDateInput.addEventListener('change', calculateEndDate);
                if (termMonthsInput) termMonthsInput.addEventListener('input', calculateEndDate);
            }
            // Attach special handlers for Backhaul A card
            if (type === 'backhaulA') {
                const modelSelect = card.querySelector('.bh-a-cost-model-select');
                const leaseFields = card.querySelector('.bh-a-lease-fields');
                const iruFields = card.querySelector('.bh-a-iru-fields');
                const otcInput = card.querySelector('.bh-a-otc');
                const omRateInput = card.querySelector('.bh-a-om-rate');
                const annualOmDisplay = card.querySelector('.bh-a-annual-om');
                const startDateInput = card.querySelector('.bh-a-start-date');
                const termInput = card.querySelector('.bh-a-term');
                const endDateInput = card.querySelector('.bh-a-end-date');

                if (modelSelect && leaseFields && iruFields) {
                    modelSelect.addEventListener('change', (e) => {
                        const isIRU = e.target.value === 'IRU';
                        leaseFields.style.display = isIRU ? 'none' : 'block';
                        iruFields.style.display = isIRU ? 'block' : 'none';
                        syncCostInputs();
                        this.calculateSalesFinancials();
                    });
                }
                const calcAnnualOm = () => {
                    if (otcInput && omRateInput && annualOmDisplay) {
                        annualOmDisplay.value = ((Number(otcInput.value) || 0) * (Number(omRateInput.value) || 0) / 100).toFixed(2);
                        syncCostInputs();
                    }
                };
                if (otcInput) otcInput.addEventListener('input', calcAnnualOm);
                if (omRateInput) omRateInput.addEventListener('input', calcAnnualOm);
                const calcEndDate = () => {
                    if (startDateInput && termInput && endDateInput && startDateInput.value) {
                        const start = new Date(startDateInput.value);
                        start.setMonth(start.getMonth() + (parseInt(termInput.value) || 0));
                        endDateInput.value = start.toISOString().split('T')[0];
                        syncCostInputs();
                    }
                };
                if (startDateInput) startDateInput.addEventListener('change', calcEndDate);
                if (termInput) termInput.addEventListener('input', calcEndDate);
            }

            // Attach special handlers for Backhaul Z card
            if (type === 'backhaulZ') {
                const modelSelect = card.querySelector('.bh-z-cost-model-select');
                const leaseFields = card.querySelector('.bh-z-lease-fields');
                const iruFields = card.querySelector('.bh-z-iru-fields');
                const otcInput = card.querySelector('.bh-z-otc');
                const omRateInput = card.querySelector('.bh-z-om-rate');
                const annualOmDisplay = card.querySelector('.bh-z-annual-om');
                const startDateInput = card.querySelector('.bh-z-start-date');
                const termInput = card.querySelector('.bh-z-term');
                const endDateInput = card.querySelector('.bh-z-end-date');

                if (modelSelect && leaseFields && iruFields) {
                    modelSelect.addEventListener('change', (e) => {
                        const isIRU = e.target.value === 'IRU';
                        leaseFields.style.display = isIRU ? 'none' : 'block';
                        iruFields.style.display = isIRU ? 'block' : 'none';
                        syncCostInputs();
                        this.calculateSalesFinancials();
                    });
                }
                const calcAnnualOm = () => {
                    if (otcInput && omRateInput && annualOmDisplay) {
                        annualOmDisplay.value = ((Number(otcInput.value) || 0) * (Number(omRateInput.value) || 0) / 100).toFixed(2);
                        syncCostInputs();
                    }
                };
                if (otcInput) otcInput.addEventListener('input', calcAnnualOm);
                if (omRateInput) omRateInput.addEventListener('input', calcAnnualOm);
                const calcEndDate = () => {
                    if (startDateInput && termInput && endDateInput && startDateInput.value) {
                        const start = new Date(startDateInput.value);
                        start.setMonth(start.getMonth() + (parseInt(termInput.value) || 0));
                        endDateInput.value = start.toISOString().split('T')[0];
                        syncCostInputs();
                    }
                };
                if (startDateInput) startDateInput.addEventListener('change', calcEndDate);
                if (termInput) termInput.addEventListener('input', calcEndDate);
            }

            // Attach end date calculation for Cross Connect A
            if (type === 'xcA') {
                const startDateInput = card.querySelector('.xc-a-start-date');
                const termInput = card.querySelector('.xc-a-term');
                const endDateInput = card.querySelector('.xc-a-end-date');
                const calcEndDate = () => {
                    if (startDateInput && termInput && endDateInput && startDateInput.value) {
                        const start = new Date(startDateInput.value);
                        start.setMonth(start.getMonth() + (parseInt(termInput.value) || 0));
                        endDateInput.value = start.toISOString().split('T')[0];
                        syncCostInputs();
                    }
                };
                if (startDateInput) startDateInput.addEventListener('change', calcEndDate);
                if (termInput) termInput.addEventListener('input', calcEndDate);
            }

            // Attach end date calculation for Cross Connect Z
            if (type === 'xcZ') {
                const startDateInput = card.querySelector('.xc-z-start-date');
                const termInput = card.querySelector('.xc-z-term');
                const endDateInput = card.querySelector('.xc-z-end-date');
                const calcEndDate = () => {
                    if (startDateInput && termInput && endDateInput && startDateInput.value) {
                        const start = new Date(startDateInput.value);
                        start.setMonth(start.getMonth() + (parseInt(termInput.value) || 0));
                        endDateInput.value = start.toISOString().split('T')[0];
                        syncCostInputs();
                    }
                };
                if (startDateInput) startDateInput.addEventListener('change', calcEndDate);
                if (termInput) termInput.addEventListener('input', calcEndDate);
            }

            // Attach end date calculation for Other Costs
            if (type === 'other') {
                const startDateInput = card.querySelector('.other-start-date');
                const termInput = card.querySelector('.other-term');
                const endDateInput = card.querySelector('.other-end-date');
                const calcEndDate = () => {
                    if (startDateInput && termInput && endDateInput && startDateInput.value) {
                        const start = new Date(startDateInput.value);
                        start.setMonth(start.getMonth() + (parseInt(termInput.value) || 0));
                        endDateInput.value = start.toISOString().split('T')[0];
                        syncCostInputs();
                    }
                };
                if (startDateInput) startDateInput.addEventListener('change', calcEndDate);
                if (termInput) termInput.addEventListener('input', calcEndDate);
            }

            syncCostInputs();
            this.calculateSalesFinancials();
        };

        // ===== Remove Cost Card Function =====
        const removeCostCard = (type, card) => {
            const isMulti = card.classList.contains('cost-card-multi');
            card.remove();

            if (!isMulti) {
                addedCostTypes.delete(type);

                // Re-enable button (only for non-multi types)
                const btn = document.querySelector(`.cost-add-btn[data-cost-type="${type}"]`);
                if (btn) {
                    btn.disabled = false;
                    btn.style.opacity = '1';
                    btn.title = '';
                }

                // Reset hidden inputs for this type
                resetCostInputs(type);
            }

            this.calculateSalesFinancials();
        };

        // ===== Sync visible inputs to hidden form inputs =====
        const syncCostInputs = () => {
            cardsContainer.querySelectorAll('.cost-input').forEach(input => {
                const field = input.dataset.field;
                const hiddenInput = document.querySelector(`[name="${field}"]`);
                if (hiddenInput) {
                    hiddenInput.value = input.value;
                }
            });
        };

        // ===== Reset hidden inputs when card is removed =====
        const resetCostInputs = (type) => {
            const fieldMappings = {
                cable: [
                    'costs.cable.supplier', 'costs.cable.orderNo', 'costs.cable.cableSystem',
                    'costs.cable.capacity', 'costs.cable.capacityUnit', 'costs.cable.model',
                    'costs.cable.protection', 'costs.cable.protectionCableSystem',
                    'costs.cable.mrc', 'costs.cable.nrc', 'costs.cable.otc',
                    'costs.cable.omRate', 'costs.cable.annualOm',
                    'costs.cable.startDate', 'costs.cable.termMonths', 'costs.cable.endDate'
                ],
                backhaul: ['costs.backhaul.aEnd.monthly', 'costs.backhaul.aEnd.nrc', 'costs.backhaul.zEnd.monthly', 'costs.backhaul.zEnd.nrc'],
                crossConnect: ['costs.crossConnect.aEnd.monthly', 'costs.crossConnect.aEnd.nrc', 'costs.crossConnect.zEnd.monthly', 'costs.crossConnect.zEnd.nrc'],
                other: ['costs.otherCosts.description', 'costs.otherCosts.oneOff', 'costs.otherCosts.monthly']
            };

            const fields = fieldMappings[type] || [];
            fields.forEach(field => {
                const input = document.querySelector(`[name="${field}"]`);
                if (input) {
                    // Set appropriate default values
                    if (field.includes('model')) input.value = 'Lease';
                    else if (field.includes('protection') && !field.includes('System')) input.value = 'Unprotected';
                    else if (field.includes('capacityUnit')) input.value = 'Gbps';
                    else if (field.includes('termMonths')) input.value = '12';
                    else if (field.includes('description') || field.includes('supplier') || field.includes('orderNo') ||
                        field.includes('cableSystem') || field.includes('protectionCableSystem') ||
                        field.includes('Date')) input.value = '';
                    else input.value = '0';
                }
            });
        };

        // ===== Attach button click handlers =====
        document.querySelectorAll('.cost-add-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.costType;
                const isMulti = btn.classList.contains('cost-add-multi');
                addCostCard(type, isMulti);
            });
        });

        // ===== Sales Type Smart Hints =====
        const salesTypeSelect = document.getElementById('sales-type-select');
        const addCableBtn = document.getElementById('add-cable-btn');

        const updateSmartHints = () => {
            const type = salesTypeSelect?.value;
            const isInventoryOrSwap = (type === 'Inventory' || type === 'Swapped Out');

            if (addCableBtn) {
                if (isInventoryOrSwap) {
                    // Hide 3rd Party Cable button for Inventory/Swapped Out
                    addCableBtn.style.display = 'none';

                    // Remove cable card if exists
                    const cableCard = cardsContainer.querySelector('.cost-card[data-cost-type="cable"]');
                    if (cableCard) {
                        removeCostCard('cable', cableCard);
                    }
                } else {
                    // Show button
                    addCableBtn.style.display = '';

                    // Enable button (unless already added)
                    if (!addedCostTypes.has('cable')) {
                        addCableBtn.disabled = false;
                        addCableBtn.style.opacity = '1';
                        addCableBtn.title = '';
                    }

                    // Auto-add cable card for Resale/Hybrid
                    if ((type === 'Resale' || type === 'Hybrid') && !addedCostTypes.has('cable')) {
                        addCostCard('cable');
                    }
                }
            }
        };

        if (salesTypeSelect) {
            salesTypeSelect.addEventListener('change', updateSmartHints);
            // Initial check
            updateSmartHints();
        }

        // ===== Status Auto-calc =====
        const startDateInput = document.getElementById('sales-start-date');
        const termInput = document.getElementById('sales-term');
        const endDateInput = document.getElementById('sales-end-date');
        const statusDisplay = document.getElementById('sales-status-display');

        const calculateEndDate = () => {
            if (!startDateInput.value || !termInput.value) return;
            const start = new Date(startDateInput.value);
            const months = parseInt(termInput.value) || 0;
            const end = new Date(start);
            end.setMonth(end.getMonth() + months);
            endDateInput.value = end.toISOString().split('T')[0];
            updateStatus();
        };

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

        if (startDateInput && termInput && endDateInput) {
            startDateInput.addEventListener('change', calculateEndDate);
            termInput.addEventListener('input', calculateEndDate);
        }

        // ===== Sales Model Toggle (Lease vs IRU Revenue Fields) =====
        const salesModelSelect = document.getElementById('sales-model-select');
        const leaseRevenueFields = document.getElementById('lease-revenue-fields');
        const iruRevenueFields = document.getElementById('iru-revenue-fields');

        const updateRevenueFields = () => {
            const model = salesModelSelect?.value;
            if (leaseRevenueFields && iruRevenueFields) {
                leaseRevenueFields.style.display = model === 'Lease' ? 'block' : 'none';
                iruRevenueFields.style.display = model === 'IRU' ? 'block' : 'none';
            }
            this.calculateSalesFinancials();
        };

        if (salesModelSelect) {
            salesModelSelect.addEventListener('change', updateRevenueFields);
        }

        // ===== IRU Revenue: Auto-calculate Annual O&M Fee =====
        const salesOtc = document.getElementById('sales-otc');
        const salesOmRate = document.getElementById('sales-om-rate');
        const salesAnnualOm = document.getElementById('sales-annual-om');

        const calculateAnnualOm = () => {
            if (salesOtc && salesOmRate && salesAnnualOm) {
                const otc = Number(salesOtc.value) || 0;
                const rate = Number(salesOmRate.value) || 0;
                salesAnnualOm.value = (otc * rate / 100).toFixed(2);
            }
        };

        if (salesOtc && salesOmRate) {
            salesOtc.addEventListener('input', calculateAnnualOm);
            salesOmRate.addEventListener('input', calculateAnnualOm);
        }

        // Real-time Financial Calculation (for non-dynamic inputs)
        const calcTriggers = document.querySelectorAll('.calc-trigger');
        calcTriggers.forEach(input => {
            input.addEventListener('input', () => this.calculateSalesFinancials());
        });
    },

    calculateSalesFinancials() {
        // 1. Get Values
        const getValue = (name) => Number(document.querySelector(`[name="${name}"]`)?.value || 0);
        const getVal = (name) => document.querySelector(`[name="${name}"]`)?.value || '';

        // ===== 步骤 A: 计算月度总收入 =====
        const mrcSales = getValue('financials.mrcSales');
        const annualSales = getValue('financials.annualSales');
        const nrcSales = getValue('financials.nrcSales');

        // Total Monthly Revenue = MRC + (Annual / 12)
        const totalMonthlyRevenue = mrcSales + (annualSales / 12);

        // ===== 步骤 B: 计算直接月成本 =====

        // B1. 海缆有效月成本 (Real Cable Cost)
        const costModel = document.querySelector('[name="costs.cable.model"]')?.value || 'Lease';
        let cableMonthly = 0;
        let cableNrc = 0;

        if (costModel === 'Lease') {
            // Lease 模式: MRC 直接作为月成本， NRC 作为一次性成本
            cableMonthly = getValue('costs.cable.mrc');
            cableNrc = getValue('costs.cable.nrc');
        } else {
            // IRU 模式: 月成本 = Annual O&M / 12 (OTC不做月摊销，放在一次性利润里算)
            const annualOm = getValue('costs.cable.annualOm');
            cableMonthly = annualOm / 12;
            // IRU 的 OTC 会在 NRC Profit 里处理
        }

        // B2. 汇总所有链路成本
        const bhMonthly = getValue('costs.backhaul.aEnd.monthly') + getValue('costs.backhaul.zEnd.monthly');
        const xcMonthly = getValue('costs.crossConnect.aEnd.monthly') + getValue('costs.crossConnect.zEnd.monthly');
        const otherMonthly = getValue('costs.otherCosts.monthly');

        const totalDirectMrc = cableMonthly + bhMonthly + xcMonthly + otherMonthly;

        // ===== 步骤 C: 计算库存分摊成本 (Allocated Inventory Cost) =====
        const salesType = getVal('salesType');
        const inventoryLink = getVal('inventoryLink');
        const salesCapacity = getValue('capacity.value');
        let allocatedCost = 0;

        if (salesType === 'Inventory' && inventoryLink) {
            // 获取关联资源的 Unit Cost
            const linkedResource = window.Store.getInventory().find(r => r.resourceId === inventoryLink);
            if (linkedResource) {
                // Unit Cost = MRC / Total Capacity
                const resourceMrc = linkedResource.financials?.mrc || 0;
                const resourceCapacity = linkedResource.capacity?.value || 1;
                const unitCost = resourceMrc / resourceCapacity;
                allocatedCost = unitCost * salesCapacity;
            }
        }

        // ===== 步骤 D: 最终汇总 =====
        const totalMonthlyCost = totalDirectMrc + allocatedCost;
        const grossMargin = totalMonthlyRevenue - totalMonthlyCost;
        const marginPercent = totalMonthlyRevenue > 0 ? (grossMargin / totalMonthlyRevenue) * 100 : 0;

        // Costs - NRC (One-time costs)
        // For IRU: add OTC to NRC costs
        const cableOtc = costModel === 'IRU' ? getValue('costs.cable.otc') : 0;
        const bhNrc = getValue('costs.backhaul.aEnd.nrc') + getValue('costs.backhaul.zEnd.nrc');
        const xcNrc = getValue('costs.crossConnect.aEnd.nrc') + getValue('costs.crossConnect.zEnd.nrc');
        const otherOneOff = getValue('costs.otherCosts.oneOff');
        const totalNrcCost = cableNrc + cableOtc + bhNrc + xcNrc + otherOneOff;
        const nrcProfit = nrcSales - totalNrcCost;

        // 3. Update UI
        const fmt = (num) => '$' + num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        document.getElementById('disp-total-cost').textContent = fmt(totalMonthlyCost);
        document.getElementById('disp-gross-margin').textContent = fmt(grossMargin);
        document.getElementById('disp-gross-margin').style.color = grossMargin >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)';

        const marginEl = document.getElementById('disp-margin-percent');
        marginEl.textContent = marginPercent.toFixed(1) + '%';
        marginEl.style.color = marginPercent >= 20 ? 'var(--accent-success)' : (marginPercent > 0 ? 'var(--accent-warning)' : 'var(--accent-danger)');

        const nrcEl = document.getElementById('disp-nrc-profit');
        nrcEl.textContent = fmt(nrcProfit);
        nrcEl.style.color = nrcProfit >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)';
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
            resourceId: getVal('orderId') || null, // Use custom ID or auto-generate
            customerName: getVal('customerName'),
            inventoryLink: getVal('inventoryLink'),
            status: status,
            capacity: {
                value: getNum('capacity.value'),
                unit: getVal('capacity.unit')
            },
            salesperson: getVal('salesperson'),
            salesModel: getVal('salesModel'),
            salesType: getVal('salesType'),
            location: {
                aEnd: {
                    city: getVal('location.aEnd.city'),
                    pop: getVal('location.aEnd.pop')
                },
                zEnd: {
                    city: getVal('location.zEnd.city'),
                    pop: getVal('location.zEnd.pop')
                }
            },
            dates: {
                start: getVal('dates.start'),
                term: getNum('dates.term'),
                end: getVal('dates.end')
            },
            financials: {
                // Lease fields
                mrcSales: getNum('financials.mrcSales'),
                nrcSales: getNum('financials.nrcSales'),
                // IRU fields
                otc: getNum('financials.otc'),
                omRate: getNum('financials.omRate'),
                annualOm: getNum('financials.annualOm'),
                marginPercent: marginPercent // Storing for easy display
            },
            costs: {
                cable: {
                    supplier: getVal('costs.cable.supplier'),
                    orderNo: getVal('costs.cable.orderNo'),
                    cableSystem: getVal('costs.cable.cableSystem'),
                    capacity: getNum('costs.cable.capacity'),
                    capacityUnit: getVal('costs.cable.capacityUnit'),
                    model: getVal('costs.cable.model'),
                    protection: getVal('costs.cable.protection'),
                    protectionCableSystem: getVal('costs.cable.protectionCableSystem'),
                    // Lease fields
                    mrc: getNum('costs.cable.mrc'),
                    nrc: getNum('costs.cable.nrc'),
                    // IRU fields
                    otc: getNum('costs.cable.otc'),
                    omRate: getNum('costs.cable.omRate'),
                    annualOm: getNum('costs.cable.annualOm'),
                    // Contract dates
                    startDate: getVal('costs.cable.startDate'),
                    termMonths: getNum('costs.cable.termMonths'),
                    endDate: getVal('costs.cable.endDate')
                },
                backhaul: {
                    aEnd: { monthly: getNum('costs.backhaul.aEnd.monthly'), nrc: getNum('costs.backhaul.aEnd.nrc') },
                    zEnd: { monthly: getNum('costs.backhaul.zEnd.monthly'), nrc: getNum('costs.backhaul.zEnd.nrc') }
                },
                crossConnect: {
                    aEnd: { monthly: getNum('costs.crossConnect.aEnd.monthly'), nrc: getNum('costs.crossConnect.aEnd.nrc') },
                    zEnd: { monthly: getNum('costs.crossConnect.zEnd.monthly'), nrc: getNum('costs.crossConnect.zEnd.nrc') }
                },
                otherCosts: {
                    description: getVal('costs.otherCosts.description'),
                    oneOff: getNum('costs.otherCosts.oneOff'),
                    monthly: getNum('costs.otherCosts.monthly')
                }
            }
        };
        window.Store.addSalesOrder(newOrder);
        this.renderView('sales');
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
                        ${onSave ? `
                            <button type="button" class="btn btn-secondary" id="modal-cancel">Cancel</button>
                            <button type="button" class="btn btn-primary" id="modal-save">Save changes</button>
                        ` : `
                            <button type="button" class="btn btn-secondary" id="modal-cancel">Close</button>
                        `}
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
                            <th>Acquisition</th>
                            <th>Details</th>
                            <th>Cost Info</th>
                            <th>Location (A / Z)</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(item => {
            // Get all sales linked to this resource
            const allSales = window.Store.getSales();
            const linkedSales = allSales.filter(s => s.inventoryLink === item.resourceId);

            // Calculate total sold capacity
            let totalSoldCapacity = 0;
            linkedSales.forEach(sale => {
                totalSoldCapacity += (sale.capacity?.value || 0);
            });

            // Resource total capacity
            const totalCapacity = item.capacity?.value || 0;

            // Calculate usage percentage
            const usagePercent = totalCapacity > 0 ? Math.min(100, Math.round((totalSoldCapacity / totalCapacity) * 100)) : 0;

            // Auto-calculate status based on dates and usage
            const today = new Date();
            const startDate = item.dates?.start ? new Date(item.dates.start) : null;
            const endDate = item.dates?.end ? new Date(item.dates.end) : null;

            let calculatedStatus = item.status;
            if (endDate && today > endDate) {
                calculatedStatus = 'Expired';
            } else if (startDate && today < startDate) {
                calculatedStatus = 'Draft';
            } else if (totalCapacity > 0 && totalSoldCapacity >= totalCapacity) {
                calculatedStatus = 'Sold Out';
            } else {
                calculatedStatus = 'Available';
            }

            // Progress bar color based on usage
            const progressColor = usagePercent >= 100 ? 'var(--accent-danger)' :
                usagePercent >= 50 ? 'var(--accent-warning)' :
                    calculatedStatus === 'Expired' ? 'var(--text-muted)' :
                        calculatedStatus === 'Draft' ? 'var(--accent-warning)' : 'var(--accent-success)';

            // Status badge color
            const statusBadgeClass = calculatedStatus === 'Available' ? 'badge-success' :
                calculatedStatus === 'Sold Out' ? 'badge-danger' :
                    calculatedStatus === 'Expired' ? 'badge-danger' : 'badge-warning';

            return `
                            <tr style="${calculatedStatus === 'Expired' ? 'opacity: 0.6;' : ''}">
                                <td class="font-mono" style="color: var(--accent-secondary)">${item.resourceId}</td>
                                <td>
                                    <span class="badge ${statusBadgeClass}">${calculatedStatus}</span>
                                    <!-- Usage Progress Bar -->
                                    <div style="margin-top:0.5rem; width:100px;">
                                        <div style="background:var(--border-color); border-radius:4px; height:6px; overflow:hidden;">
                                            <div style="width:${usagePercent}%; height:100%; background:${progressColor}; transition:width 0.3s;"></div>
                                        </div>
                                        <div style="font-size:0.65rem; color:var(--text-muted); text-align:center; margin-top:2px;">
                                            ${totalSoldCapacity}/${totalCapacity} ${item.capacity?.unit || 'Gbps'}
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <div style="font-weight:500">${item.acquisition?.type || 'Purchased'}</div>
                                    <div style="font-size:0.75rem; color:var(--text-muted)">${item.acquisition?.ownership || ''}</div>
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
                                    ${item.acquisition?.ownership !== 'IRU' ? `<div class="font-mono">MRC: $${(item.financials?.mrc || 0).toLocaleString()}</div>` : ''}
                                    <div class="font-mono" style="font-size:0.8em; color:var(--text-muted)">${item.acquisition?.ownership === 'IRU' ? 'OTC' : 'NRC'}: $${(item.financials?.otc || 0).toLocaleString()}</div>
                                    <div style="font-size:0.75rem; color:var(--accent-danger); margin-top:0.2rem;">Expires: ${item.dates?.end || 'N/A'}</div>
                                </td>
                                <td style="font-size:0.85rem">
                                    <div><strong style="color:var(--accent-primary)">A:</strong> ${item.location?.aEnd?.pop || '-'} (${item.location?.aEnd?.city || ''})</div>
                                    <div><strong style="color:var(--accent-secondary)">Z:</strong> ${item.location?.zEnd?.pop || '-'} (${item.location?.zEnd?.city || ''})</div>
                                </td>
                                <td>
                                    <div class="flex gap-4">
                                        <button class="btn btn-secondary" style="padding:0.4rem" onclick="App.viewInventoryDetails('${item.resourceId}')" title="View">
                                            <ion-icon name="eye-outline"></ion-icon>
                                        </button>
                                        <button class="btn btn-primary" style="padding:0.4rem" onclick="App.openInventoryModal('${item.resourceId}')" title="Edit">
                                            <ion-icon name="create-outline"></ion-icon>
                                        </button>
                                        <button class="btn btn-danger" style="padding:0.4rem" onclick="window.Store.deleteInventory('${item.resourceId}'); App.renderView('inventory');" title="Delete">
                                            <ion-icon name="trash-outline"></ion-icon>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                            `;
        }).join('')}
                    </tbody>
                </table>
            </div>
    `;
        this.container.innerHTML = html;
    },

    viewInventoryDetails(resourceId) {
        const item = window.Store.getInventory().find(i => i.resourceId === resourceId);
        if (!item) return;

        // Get linked sales orders
        const allSales = window.Store.getSales();
        const linkedSales = allSales.filter(s => s.inventoryLink === resourceId);

        // Calculate usage
        let totalSoldCapacity = 0;
        linkedSales.forEach(sale => {
            totalSoldCapacity += (sale.capacity?.value || 0);
        });
        const totalCapacity = item.capacity?.value || 0;
        const usagePercent = totalCapacity > 0 ? Math.round((totalSoldCapacity / totalCapacity) * 100) : 0;

        // Dynamic status calculation (same logic as renderInventory)
        const today = new Date();
        const startDate = item.dates?.start ? new Date(item.dates.start) : null;
        const endDate = item.dates?.end ? new Date(item.dates.end) : null;

        let calculatedStatus = item.status;
        if (endDate && today > endDate) {
            calculatedStatus = 'Expired';
        } else if (startDate && today < startDate) {
            calculatedStatus = 'Draft';
        } else if (totalCapacity > 0 && totalSoldCapacity >= totalCapacity) {
            calculatedStatus = 'Sold Out';
        } else {
            calculatedStatus = 'Available';
        }

        // Status badge color
        const statusBadgeClass = calculatedStatus === 'Available' ? 'badge-success' :
            calculatedStatus === 'Sold Out' ? 'badge-danger' :
                calculatedStatus === 'Expired' ? 'badge-danger' : 'badge-warning';

        const linkedSalesHtml = linkedSales.length === 0
            ? '<div style="color:var(--text-muted)">No sales orders linked</div>'
            : linkedSales.map(s => `<div class="font-mono" style="margin-bottom:0.3rem;">${s.salesOrderId} - ${s.customerName} (${s.capacity?.value || 0} ${s.capacity?.unit || 'Gbps'})</div>`).join('');

        const sectionStyle = 'background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem 1.25rem; margin-bottom: 1rem; box-shadow: 0 2px 8px rgba(0,0,0,0.08);';
        const tdStyle = 'padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;';

        // Check if ownership is IRU to show O&M fields
        const isIRU = item.acquisition?.ownership === 'IRU';
        const omRate = item.financials?.omRate || 0;
        const otc = item.financials?.otc || 0;
        const annualOmCost = (otc * omRate / 100);

        const detailsHtml = `
            <div class="grid-2" style="gap:1.5rem; align-items: start;">
                <div>
                    <div style="${sectionStyle}">
                        <h4 style="color: var(--accent-primary); margin-bottom: 0.75rem; font-size: 0.9rem;">Resource Information</h4>
                        <table style="width:100%;">
                            <tr><td style="${tdStyle}">Resource ID</td><td class="font-mono">${item.resourceId}</td></tr>
                            <tr><td style="${tdStyle}">Status</td><td><span class="badge ${statusBadgeClass}">${calculatedStatus}</span></td></tr>
                            <tr><td style="${tdStyle}">Cable System</td><td style="font-weight:600">${item.cableSystem}</td></tr>
                            <tr><td style="${tdStyle}">Segment Type</td><td>${item.segmentType || '-'}</td></tr>
                            <tr><td style="${tdStyle}">Route Description</td><td>${item.routeDescription || '-'}</td></tr>
                            <tr><td style="${tdStyle}">Handoff Type</td><td>${item.handoffType || '-'}</td></tr>
                            <tr><td style="${tdStyle}">Protection</td><td>${item.protection || '-'}</td></tr>
                            <tr><td style="${tdStyle}">Protection Cable</td><td>${item.protectionCableSystem || '-'}</td></tr>
                        </table>
                    </div>

                    <div style="${sectionStyle}">
                        <h4 style="color: var(--accent-success); margin-bottom: 0.75rem; font-size: 0.9rem;">Capacity & Usage</h4>
                        <table style="width:100%;">
                            <tr><td style="${tdStyle}">Total Capacity</td><td class="font-mono" style="color:var(--accent-primary)">${item.capacity?.value || 0} ${item.capacity?.unit || 'Gbps'}</td></tr>
                            <tr><td style="${tdStyle}">Sold Capacity</td><td class="font-mono">${totalSoldCapacity} ${item.capacity?.unit || 'Gbps'}</td></tr>
                            <tr><td style="${tdStyle}">Usage</td><td class="font-mono">${usagePercent}%</td></tr>
                        </table>
                    </div>
                </div>
                <div>
                    <div style="${sectionStyle}">
                        <h4 style="color: var(--accent-secondary); margin-bottom: 0.75rem; font-size: 0.9rem;">Acquisition</h4>
                        <table style="width:100%;">
                            <tr><td style="${tdStyle}">Type</td><td>${item.acquisition?.type || 'Purchased'}</td></tr>
                            <tr><td style="${tdStyle}">Ownership</td><td>${item.acquisition?.ownership || '-'}</td></tr>
                            <tr><td style="${tdStyle}">Supplier</td><td>${item.acquisition?.supplier || '-'}</td></tr>
                            <tr><td style="${tdStyle}">Contract Ref</td><td class="font-mono">${item.acquisition?.contractRef || '-'}</td></tr>
                        </table>
                    </div>

                    <div style="${sectionStyle}">
                        <h4 style="color: var(--accent-warning); margin-bottom: 0.75rem; font-size: 0.9rem;">Location</h4>
                        <table style="width:100%;">
                            <tr><td style="${tdStyle}">A-End</td><td>${item.location?.aEnd?.city || '-'} - ${item.location?.aEnd?.pop || '-'}</td></tr>
                            <tr><td style="${tdStyle}">A-End Device/Port</td><td class="font-mono">${item.location?.aEnd?.device || '-'} / ${item.location?.aEnd?.port || '-'}</td></tr>
                            <tr><td style="${tdStyle}">Z-End</td><td>${item.location?.zEnd?.city || '-'} - ${item.location?.zEnd?.pop || '-'}</td></tr>
                            <tr><td style="${tdStyle}">Z-End Device/Port</td><td class="font-mono">${item.location?.zEnd?.device || '-'} / ${item.location?.zEnd?.port || '-'}</td></tr>
                        </table>
                    </div>

                    <div style="${sectionStyle}">
                        <h4 style="color: var(--accent-danger); margin-bottom: 0.75rem; font-size: 0.9rem;">Financials & Dates</h4>
                        <table style="width:100%;">
                            ${!isIRU ? `<tr><td style="${tdStyle}">MRC</td><td class="font-mono">$${(item.financials?.mrc || 0).toLocaleString()}</td></tr>` : ''}
                            <tr><td style="${tdStyle}">OTC</td><td class="font-mono">$${(item.financials?.otc || 0).toLocaleString()}</td></tr>
                            ${isIRU ? `
                            <tr><td style="${tdStyle}">O&M Rate</td><td class="font-mono">${omRate}%</td></tr>
                            <tr><td style="${tdStyle}">Annual O&M Cost</td><td class="font-mono" style="color:var(--accent-warning)">$${annualOmCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>
                            ` : ''}
                            <tr><td style="${tdStyle}">Term</td><td>${item.financials?.term || '-'} months</td></tr>
                            <tr><td style="${tdStyle}">Start Date</td><td>${item.dates?.start || '-'}</td></tr>
                            <tr><td style="${tdStyle}">End Date</td><td>${item.dates?.end || '-'}</td></tr>
                        </table>
                    </div>

                    <div style="${sectionStyle}">
                        <h4 style="color: var(--accent-primary); margin-bottom: 0.75rem; font-size: 0.9rem;">Linked Sales Orders</h4>
                        ${linkedSalesHtml}
                    </div>
                </div>
            </div>
        `;

        this.openModal(`Resource: ${item.resourceId}`, detailsHtml, null, true);
    },

    openInventoryModal(resourceId = null) {
        const item = resourceId ? window.Store.getInventory().find(i => i.resourceId === resourceId) : {};
        const isEdit = !!resourceId;

        // Calculate correct status based on capacity usage
        let calculatedStatus = item.status || 'Available';
        if (isEdit && item.resourceId) {
            const allSales = window.Store.getSales(); // Assuming getSales() returns all sales orders
            const linkedSales = allSales.filter(s => s.inventoryLink === item.resourceId);
            let totalSoldCapacity = 0;
            linkedSales.forEach(s => {
                totalSoldCapacity += (s.capacity?.value || 0);
            });
            const totalCapacity = item.capacity?.value || 0;

            if (totalCapacity > 0 && totalSoldCapacity >= totalCapacity) {
                calculatedStatus = 'Sold Out';
            } else if (totalSoldCapacity > 0) {
                calculatedStatus = 'In Use';
            } else {
                calculatedStatus = 'Available';
            }
        }

        const formHTML = `
                ${item.usage?.currentUser ? `
                <!-- Usage Information -->
                <div class="mb-4 p-3" style="background: rgba(189, 39, 30, 0.1); border: 1px solid var(--accent-danger); border-radius: 8px;">
                    <h4 class="mb-2" style="color: var(--accent-danger); font-size: 0.9rem;"><ion-icon name="link-outline"></ion-icon> Linked Sales</h4>
                    <div style="display: flex; gap: 2rem; flex-wrap: wrap;">
                        <div>
                            <span style="color: var(--text-muted); font-size: 0.85rem;">Customer:</span>
                            <div style="font-weight: 600; font-size: 1.1rem;">${item.usage.currentUser}</div>
                        </div>
                        <div>
                            <span style="color: var(--text-muted); font-size: 0.85rem;">Sales Order:</span>
                            <div class="font-mono" style="color: var(--accent-secondary);">${item.usage.orderLink || 'N/A'}</div>
                        </div>
                    </div>
                </div>
                ` : ''}
                
                <!-- Core Identity -->
                <h4 class="mb-4" style="border-bottom:1px solid var(--border-color); padding-bottom:0.5rem; margin-top:0;">Identity</h4>
                <div class="grid-2">
                    <div class="form-group">
                        <label class="form-label">Resource ID</label>
                        <input type="text" class="form-control" name="resourceId" value="${item.resourceId || ''}" ${isEdit ? 'readonly' : ''} placeholder="Auto-generated if empty">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Status <small style="color:var(--text-muted)">(Auto-calculated)</small></label>
                        <select class="form-control" name="status" style="background-color: var(--bg-card-hover);">
                            <option ${calculatedStatus === 'Draft' ? 'selected' : ''}>Draft</option>
                            <option ${calculatedStatus === 'Available' ? 'selected' : ''}>Available</option>
                            <option ${calculatedStatus === 'In Use' ? 'selected' : ''}>In Use</option>
                            <option ${calculatedStatus === 'Sold Out' ? 'selected' : ''}>Sold Out</option>
                            <option ${calculatedStatus === 'Expired' ? 'selected' : ''}>Expired</option>
                        </select>
                    </div>
                </div>

                <!--Acquisition -->
                <h4 class="mb-4 mt-4" style="border-bottom:1px solid var(--border-color); padding-bottom:0.5rem;">Acquisition</h4>
                <div class="grid-3">
                    <div class="form-group">
                        <label class="form-label">Acquisition Type</label>
                        <select class="form-control" name="acquisition.type">
                            <option ${item.acquisition?.type === 'Purchased' ? 'selected' : ''}>Purchased</option>
                            <option ${item.acquisition?.type === 'Swapped In' ? 'selected' : ''}>Swapped In</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Ownership</label>
                        <select class="form-control" name="acquisition.ownership">
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
                <div class="grid-3" id="financials-grid">
                    <div class="form-group" id="mrc-container" style="display: ${item.acquisition?.ownership === 'IRU' ? 'none' : 'block'}">
                        <label class="form-label">MRC Cost ($)</label>
                        <input type="number" class="form-control" name="financials.mrc" value="${item.financials?.mrc || 0}">
                    </div>
                    <div class="form-group">
                        <label class="form-label" id="otc-label">${item.acquisition?.ownership === 'IRU' ? 'OTC ($)' : 'NRC ($)'}</label>
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

        this.openModal(isEdit ? 'Edit Resource' : 'Add Resource', formHTML, (form) => {
            // Save Logic - use the form passed from openModal
            // Construct Object manually because of nested naming "location.aEnd.country"
            const handoffTypeValue = form.querySelector('[name="handoffType"]').value;
            const handoffTypeCustomValue = form.querySelector('[name="handoffTypeCustom"]')?.value || '';
            const finalHandoffType = handoffTypeValue === 'Other' ? handoffTypeCustomValue : handoffTypeValue;

            const newItem = {
                resourceId: form.querySelector('[name="resourceId"]').value,
                status: form.querySelector('[name="status"]').value,
                acquisition: {
                    type: form.querySelector('[name="acquisition.type"]').value,
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

            // Refresh the inventory view to show updated data
            this.renderView('inventory');
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

        // Ownership Field Toggle (O&M Rate Section + MRC/OTC label)
        const ownershipSelect = document.querySelector('[name="acquisition.ownership"]');
        const omRateContainer = document.getElementById('om-rate-container');
        const mrcContainer = document.getElementById('mrc-container');
        const otcLabel = document.getElementById('otc-label');
        if (ownershipSelect && omRateContainer) {
            ownershipSelect.addEventListener('change', (e) => {
                const isIRU = e.target.value === 'IRU';
                const showOm = ['IRU', 'Owned'].includes(e.target.value);
                omRateContainer.style.display = showOm ? 'block' : 'none';
                // Toggle MRC visibility and OTC label for IRU
                if (mrcContainer) {
                    mrcContainer.style.display = isIRU ? 'none' : 'block';
                }
                if (otcLabel) {
                    otcLabel.textContent = isIRU ? 'OTC ($)' : 'NRC ($)';
                }
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
        addBtn.onclick = () => this.openAddSalesModal();
        this.headerActions.appendChild(addBtn);

        const html = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Order ID</th>
                            <th>Customer</th>
                            <th>Salesperson</th>
                            <th>Capacity</th>
                            <th>Status</th>
                            <th>Inventory Link</th>
                            <th>Revenue (MRR)</th>
                            <th>Direct Margin</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.length === 0 ? '<tr><td colspan="9" style="text-align:center; color:var(--text-muted); padding:2rem;">No sales orders yet. Click "New Sale" to add one.</td></tr>' : ''}
                        ${data.map(item => {
            const mrr = item.financials?.totalMrr || item.financials?.mrcSales || 0;
            // Calculate Sales Specific Margin (MRR - CableCostMRC - XCs - Backhauls)
            const costProps = ['cableCost', 'backhaulA', 'backhaulZ', 'crossConnectA', 'crossConnectZ'];
            let totalDirectCost = 0;
            if (item.costs) {
                costProps.forEach(k => {
                    totalDirectCost += (item.costs[k]?.mrc || 0);
                });
            }
            const margin = mrr - totalDirectCost;
            const statusClass = item.status === 'Active' ? 'badge-success' : (item.status === 'Pending' ? 'badge-warning' : 'badge-danger');

            return `
                            <tr>
                                <td class="font-mono" style="color: var(--accent-secondary)">${item.salesOrderId}</td>
                                <td style="font-weight:600">${item.customerName}</td>
                                <td>${item.salesperson || '-'}</td>
                                <td class="font-mono" style="color: var(--accent-primary)">${item.capacity?.value || '-'} ${item.capacity?.unit || ''}</td>
                                <td><span class="badge ${statusClass}">${item.status}</span></td>
                                <td class="font-mono">${item.inventoryLink || '-'}</td>
                                <td class="font-mono" style="color: var(--accent-success)">$${mrr.toLocaleString()}</td>
                                <td class="font-mono" style="color: ${margin >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)'}">$${margin.toLocaleString()}</td>
                                <td>
                                    <div class="flex gap-4">
                                        <button class="btn btn-secondary" style="padding:0.4rem" onclick="App.viewSalesDetails('${item.salesOrderId}')" title="View">
                                            <ion-icon name="eye-outline"></ion-icon>
                                        </button>
                                        <button class="btn btn-primary" style="padding:0.4rem" onclick="App.editSalesOrder('${item.salesOrderId}')" title="Edit">
                                            <ion-icon name="create-outline"></ion-icon>
                                        </button>
                                        <button class="btn btn-danger" style="padding:0.4rem" onclick="window.Store.deleteSalesOrder('${item.salesOrderId}'); App.renderView('sales');" title="Delete">
                                            <ion-icon name="trash-outline"></ion-icon>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                            `;
        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
        this.container.innerHTML = html;
    },

    viewSalesDetails(salesOrderId) {
        const order = window.Store.getSales().find(s => s.salesOrderId === salesOrderId);
        if (!order) return;

        const mrr = order.financials?.totalMrr || order.financials?.mrcSales || 0;
        const nrc = order.financials?.nrcSales || 0;
        const statusClass = order.status === 'Active' ? 'badge-success' : (order.status === 'Pending' ? 'badge-warning' : 'badge-danger');

        // Calculate costs and margin
        const cableCostMrc = order.costs?.cableCost?.mrc || order.costs?.cable?.mrc || 0;
        const backhaulAMrc = order.costs?.backhaulA?.mrc || order.costs?.backhaul?.aEnd?.monthly || 0;
        const backhaulZMrc = order.costs?.backhaulZ?.mrc || order.costs?.backhaul?.zEnd?.monthly || 0;
        const xcAMrc = order.costs?.crossConnectA?.mrc || order.costs?.crossConnect?.aEnd?.monthly || 0;
        const xcZMrc = order.costs?.crossConnectZ?.mrc || order.costs?.crossConnect?.zEnd?.monthly || 0;

        const totalCostsMrc = cableCostMrc + backhaulAMrc + backhaulZMrc + xcAMrc + xcZMrc;
        const grossMargin = mrr - totalCostsMrc;
        const marginPercent = mrr > 0 ? ((grossMargin / mrr) * 100).toFixed(1) : 0;
        const marginColor = grossMargin >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)';

        const sectionStyle = 'background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem 1.25rem; margin-bottom: 1rem; box-shadow: 0 2px 8px rgba(0,0,0,0.08);';

        const detailsHtml = `
            <div class="grid-2" style="gap:1.5rem; align-items: start;">
                <div>
                    <div style="${sectionStyle}">
                        <h4 style="color: var(--accent-primary); margin-bottom: 0.75rem; font-size: 0.9rem;">Order Information</h4>
                        <table style="width:100%;">
                            <tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">Order ID</td><td class="font-mono">${order.salesOrderId}</td></tr>
                            <tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">Customer</td><td style="font-weight:600">${order.customerName}</td></tr>
                            <tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">Salesperson</td><td>${order.salesperson || '-'}</td></tr>
                            <tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">Sales Model</td><td>${order.salesModel || 'Lease'}</td></tr>
                            <tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">Sales Type</td><td>${order.salesType || 'Resale'}</td></tr>
                            <tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">Capacity</td><td class="font-mono" style="color:var(--accent-primary)">${order.capacity?.value || '-'} ${order.capacity?.unit || ''}</td></tr>
                            <tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">Status</td><td><span class="badge ${statusClass}">${order.status}</span></td></tr>
                            <tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">Linked Resource</td><td class="font-mono">${order.inventoryLink || '-'}</td></tr>
                            <tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">Term</td><td>${order.dates?.term || '-'} months</td></tr>
                            <tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">Start Date</td><td>${order.dates?.start || '-'}</td></tr>
                            <tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">End Date</td><td>${order.dates?.end || '-'}</td></tr>
                        </table>
                    </div>
                </div>
                <div>
                    <div style="${sectionStyle}">
                        <h4 style="color: var(--accent-success); margin-bottom: 0.75rem; font-size: 0.9rem;">Revenue</h4>
                        <table style="width:100%;">
                            <tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">Monthly Revenue (MRR)</td><td class="font-mono" style="color:var(--accent-success)">$${mrr.toLocaleString()}</td></tr>
                            <tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">One-time Revenue (NRC)</td><td class="font-mono">$${nrc.toLocaleString()}</td></tr>
                        </table>
                    </div>
                    
                    <div style="${sectionStyle}">
                        <h4 style="color: var(--accent-danger); margin-bottom: 0.75rem; font-size: 0.9rem;">Cost Breakdown (MRC)</h4>
                        <table style="width:100%;">
                            <tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">Cable Cost</td><td class="font-mono">$${cableCostMrc.toLocaleString()}</td></tr>
                            <tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">Backhaul A-End</td><td class="font-mono">$${backhaulAMrc.toLocaleString()}</td></tr>
                            <tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">Backhaul Z-End</td><td class="font-mono">$${backhaulZMrc.toLocaleString()}</td></tr>
                            <tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">Cross Connect A</td><td class="font-mono">$${xcAMrc.toLocaleString()}</td></tr>
                            <tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">Cross Connect Z</td><td class="font-mono">$${xcZMrc.toLocaleString()}</td></tr>
                            <tr style="border-top: 1px solid var(--border-color)"><td style="padding:0.5rem 0; font-weight:600; font-size:0.85rem;">Total Costs (MRC)</td><td class="font-mono" style="color:var(--accent-danger)">$${totalCostsMrc.toLocaleString()}</td></tr>
                        </table>
                    </div>

                    <div style="${sectionStyle}">
                        <h4 style="color: var(--accent-secondary); margin-bottom: 0.75rem; font-size: 0.9rem;">Profitability</h4>
                        <table style="width:100%;">
                            <tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">Gross Margin (MRC)</td><td class="font-mono" style="color:${marginColor}; font-weight:600">$${grossMargin.toLocaleString()}</td></tr>
                            <tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">Margin %</td><td class="font-mono" style="color:${marginColor}; font-weight:600">${marginPercent}%</td></tr>
                        </table>
                    </div>
                </div>
            </div>
        `;

        this.openModal(`Sales Order: ${order.salesOrderId}`, detailsHtml, null, true);
    },

    editSalesOrder(salesOrderId) {
        const order = window.Store.getSales().find(s => s.salesOrderId === salesOrderId);
        if (!order) return;

        const salespersonOptions = ['Janna Dai', 'Miki Chen', 'Wayne Jiang', 'Kristen Gan', 'Becky Hai', 'Wolf Yuan', 'Yifeng Jiang']
            .map(name => `<option ${order.salesperson === name ? 'selected' : ''}>${name}</option>`).join('');

        const editHtml = `
            <div class="grid-2" style="gap:1.5rem;">
                <div class="form-group">
                    <label class="form-label">Customer Name</label>
                    <input type="text" class="form-control" name="customerName" value="${order.customerName}">
                </div>
                <div class="form-group">
                    <label class="form-label">Salesperson</label>
                    <select class="form-control" name="salesperson">
                        <option value="">Select...</option>
                        ${salespersonOptions}
                    </select>
                </div>
            </div>
            <div class="grid-2" style="gap:1.5rem;">
                <div class="form-group">
                    <label class="form-label">Capacity Value</label>
                    <input type="number" class="form-control" name="capacity.value" value="${order.capacity?.value || 0}">
                </div>
                <div class="form-group">
                    <label class="form-label">Capacity Unit</label>
                    <select class="form-control" name="capacity.unit">
                        <option ${order.capacity?.unit === 'Gbps' ? 'selected' : ''}>Gbps</option>
                        <option ${order.capacity?.unit === 'Wavelength' ? 'selected' : ''}>Wavelength</option>
                        <option ${order.capacity?.unit === 'Fiber Pair' ? 'selected' : ''}>Fiber Pair</option>
                    </select>
                </div>
            </div>
            <div class="grid-2" style="gap:1.5rem;">
                <div class="form-group">
                    <label class="form-label">MRC Sales ($)</label>
                    <input type="number" class="form-control" name="financials.mrcSales" value="${order.financials?.mrcSales || 0}">
                </div>
                <div class="form-group">
                    <label class="form-label">NRC Sales ($)</label>
                    <input type="number" class="form-control" name="financials.nrcSales" value="${order.financials?.nrcSales || 0}">
                </div>
            </div>
            <div class="grid-2" style="gap:1.5rem;">
                <div class="form-group">
                    <label class="form-label">Start Date</label>
                    <input type="date" class="form-control" name="dates.start" value="${order.dates?.start || ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">End Date</label>
                    <input type="date" class="form-control" name="dates.end" value="${order.dates?.end || ''}">
                </div>
            </div>
        `;

        this.openModal(`Edit: ${order.salesOrderId}`, editHtml, (form) => {
            // Update order data
            order.customerName = form.querySelector('[name="customerName"]').value;
            order.salesperson = form.querySelector('[name="salesperson"]').value;
            order.capacity = {
                value: Number(form.querySelector('[name="capacity.value"]').value),
                unit: form.querySelector('[name="capacity.unit"]').value
            };
            order.financials.mrcSales = Number(form.querySelector('[name="financials.mrcSales"]').value);
            order.financials.nrcSales = Number(form.querySelector('[name="financials.nrcSales"]').value);
            order.dates.start = form.querySelector('[name="dates.start"]').value;
            order.dates.end = form.querySelector('[name="dates.end"]').value;

            // Recalculate status
            const today = new Date();
            const start = new Date(order.dates.start);
            const end = new Date(order.dates.end);
            if (today < start) order.status = 'Pending';
            else if (today > end) order.status = 'Expired';
            else order.status = 'Active';

            window.Store.save();
            this.renderView('sales');
            return true;
        }, true);
    }
};

// CRITICAL: Make App globally accessible for onclick handlers
window.App = App;

// Start
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
