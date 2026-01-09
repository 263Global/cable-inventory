/**
 * App.js
 * Main application logic
 */

/**
 * Unified profit calculation engine
 * Computes financial metrics for a sales order based on Mixed Recognition Model
 * @param {object} order - Sales order object
 * @returns {object} Financial metrics
 */
function computeOrderFinancials(order) {
    const salesModel = order.salesModel || 'Lease';
    const salesType = order.salesType || 'Resale';
    const salesTerm = order.dates?.term || 12;
    const salesCapacity = order.capacity?.value || 1;

    // Get linked inventory for Inventory/Hybrid types
    const inventoryLink = order.inventoryLink;
    const linkedResource = inventoryLink ? window.Store?.getInventory()?.find(r => r.resourceId === inventoryLink) : null;
    const inventoryCapacity = linkedResource?.capacity?.value || 1;
    const capacityRatio = salesCapacity / inventoryCapacity;

    // Calculate Inventory Monthly Cost (if applicable)
    let inventoryMonthlyCost = 0;
    if (linkedResource && (salesType === 'Inventory' || salesType === 'Hybrid')) {
        const invOwnership = linkedResource.acquisition?.ownership || 'Leased';
        if (invOwnership === 'IRU') {
            const invOtc = linkedResource.financials?.otc || 0;
            const invTerm = linkedResource.financials?.term || 1;
            const invAnnualOm = linkedResource.financials?.annualOmCost || 0;
            inventoryMonthlyCost = ((invOtc / invTerm) + (invAnnualOm / 12)) * capacityRatio;
        } else {
            inventoryMonthlyCost = (linkedResource.financials?.mrc || 0) * capacityRatio;
        }
    }

    // Get Operating Costs (Backhaul, XC, Other)
    const costs = order.costs || {};
    const backhaulMRC = (costs.backhaul?.aEnd?.monthly || 0) + (costs.backhaul?.zEnd?.monthly || 0);
    const xcMRC = (costs.crossConnect?.aEnd?.monthly || 0) + (costs.crossConnect?.zEnd?.monthly || 0);
    const otherMonthly = costs.otherCosts?.monthly || 0;
    const operatingCosts = backhaulMRC + xcMRC + otherMonthly;

    // Initialize results
    let monthlyRevenue = 0;
    let monthlyProfit = 0;
    let firstMonthProfit = 0;
    let firstMonthMargin = 0;
    let recurringMonthlyProfit = 0;
    let recurringMargin = 0;
    let isIruResale = false;

    if (salesModel === 'Lease') {
        // ========== LEASE MODEL ==========
        const mrcSales = order.financials?.mrcSales || 0;
        monthlyRevenue = mrcSales;

        // Get Cable MRC (for Resale and Hybrid)
        let cableMRC = 0;
        if (salesType === 'Resale' || salesType === 'Hybrid') {
            const cableModel = costs.cable?.model || 'Lease';
            if (cableModel === 'Lease') {
                cableMRC = costs.cable?.mrc || 0;
            } else {
                cableMRC = (costs.cable?.annualOm || 0) / 12;
            }
        }

        switch (salesType) {
            case 'Resale':
                monthlyProfit = mrcSales - cableMRC - operatingCosts;
                break;
            case 'Inventory':
                monthlyProfit = mrcSales - inventoryMonthlyCost - operatingCosts;
                break;
            case 'Hybrid':
                monthlyProfit = mrcSales - inventoryMonthlyCost - cableMRC - operatingCosts;
                break;
            default:
                monthlyProfit = mrcSales - operatingCosts;
        }

    } else if (salesModel === 'IRU') {
        // ========== IRU MODEL ==========
        const otcRevenue = order.financials?.otc || 0;
        const annualOmRevenue = order.financials?.annualOm || 0;
        const monthlyOmRevenue = annualOmRevenue / 12;

        // Get Cable costs (for Resale and Hybrid)
        const cableOtc = costs.cable?.otc || 0;
        const cableAnnualOm = costs.cable?.annualOm || 0;
        const cableTerm = costs.cable?.termMonths || salesTerm;
        const cableMonthlyOtc = cableOtc / cableTerm;
        const cableMonthlyOm = cableAnnualOm / 12;

        switch (salesType) {
            case 'Resale':
                // IRU Resale: OTC profit captured in first month
                isIruResale = true;
                const otcProfit = otcRevenue - cableOtc;
                const monthlyOmProfit = monthlyOmRevenue - cableMonthlyOm;

                // First month: OTC profit + monthly O&M profit - operating costs
                firstMonthProfit = otcProfit + monthlyOmProfit - operatingCosts;
                // First month margin: based on total first month value (OTC + O&M)
                const firstMonthRevenue = otcRevenue + monthlyOmRevenue;
                firstMonthMargin = firstMonthRevenue > 0 ? (firstMonthProfit / firstMonthRevenue) * 100 : 0;

                // Recurring months: just O&M profit - operating costs
                recurringMonthlyProfit = monthlyOmProfit - operatingCosts;
                recurringMargin = monthlyOmRevenue > 0 ? (recurringMonthlyProfit / monthlyOmRevenue) * 100 : 0;

                // For general display, use recurring values
                monthlyRevenue = monthlyOmRevenue;
                monthlyProfit = recurringMonthlyProfit;
                break;

            case 'Inventory':
                // IRU Inventory: OTC revenue amortized monthly
                const monthlyOtcRevenue = otcRevenue / salesTerm;
                monthlyRevenue = monthlyOtcRevenue + monthlyOmRevenue;
                monthlyProfit = monthlyRevenue - inventoryMonthlyCost - operatingCosts;
                break;

            case 'Hybrid':
                // IRU Hybrid: OTC revenue amortized, both inventory and cable costs
                const monthlyOtcRev = otcRevenue / salesTerm;
                monthlyRevenue = monthlyOtcRev + monthlyOmRevenue;
                monthlyProfit = monthlyRevenue - inventoryMonthlyCost - cableMonthlyOtc - cableMonthlyOm - operatingCosts;
                break;

            case 'Swapped Out':
                // Swapped Out: No profit
                monthlyRevenue = 0;
                monthlyProfit = 0;
                break;

            default:
                monthlyProfit = 0;
        }
    }

    // Calculate general margin
    const marginPercent = monthlyRevenue > 0 ? (monthlyProfit / monthlyRevenue) * 100 : 0;

    return {
        monthlyRevenue,
        monthlyProfit,
        marginPercent,
        isIruResale,
        firstMonthProfit,
        firstMonthMargin,
        recurringMonthlyProfit,
        recurringMargin
    };
}

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
        const totalSoldCapacity = sales.reduce((acc, item) => acc + (item.capacity?.value || 0), 0);
        const capacityUsagePercent = totalCapacity > 0 ? Math.round((totalSoldCapacity / totalCapacity) * 100) : 0;
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

        // Salesperson Leaderboard (sorted by total MRR) - Exclude Procurement Team
        const salesByPerson = {};
        sales.forEach(s => {
            const name = s.salesperson || 'Unassigned';
            // Skip Procurement Team from leaderboard
            if (name === 'Procurement Team') return;
            if (!salesByPerson[name]) {
                salesByPerson[name] = { name, totalMrr: 0, orderCount: 0 };
            }
            salesByPerson[name].totalMrr += (s.financials?.mrcSales || s.financials?.totalMrr || 0);
            salesByPerson[name].orderCount += 1;
        });
        const leaderboard = Object.values(salesByPerson).sort((a, b) => b.totalMrr - a.totalMrr);

        // Sales Type Distribution (for pie chart) - Exclude Swapped Out
        const salesTypeCount = { Resale: 0, Inventory: 0, Hybrid: 0 };
        sales.forEach(s => {
            const type = s.salesType;
            if (type && salesTypeCount.hasOwnProperty(type)) {
                salesTypeCount[type]++;
            }
        });
        const totalSalesCount = salesTypeCount.Resale + salesTypeCount.Inventory + salesTypeCount.Hybrid;

        const html = `
            <!-- Top Stats -->
            <div class="grid-4 mb-6 dashboard-grid-metrics">
                <div class="card metric-card capacity-card">
                    <div class="capacity-left">
                        <span class="metric-label"><ion-icon name="cube-outline" class="metric-icon"></ion-icon> Capacity</span>
                        <span class="metric-value" style="color: var(--accent-primary)">
                            <span class="capacity-sold">${totalSoldCapacity.toLocaleString()}</span><span class="capacity-total" style="font-size:0.65em; color:var(--text-muted)">/${totalCapacity.toLocaleString()}</span>
                        </span>
                    </div>
                    <div class="capacity-right">
                        <div class="capacity-bar-wrapper">
                            <div style="width:100%; height:6px; background:var(--border-color); border-radius:3px; overflow:hidden;">
                                <div style="width:${capacityUsagePercent}%; height:100%; background:${capacityUsagePercent >= 80 ? 'var(--accent-danger)' : capacityUsagePercent >= 50 ? 'var(--accent-warning)' : 'var(--accent-success)'}; transition:width 0.3s;"></div>
                            </div>
                            <span style="font-size:0.7rem; color:var(--text-muted)">${capacityUsagePercent}%</span>
                        </div>
                    </div>
                </div>
                <div class="card metric-card simple-metric">
                    <span class="metric-label"><ion-icon name="cash-outline" class="metric-icon"></ion-icon> MRR</span>
                    <span class="metric-value" style="color: var(--accent-success)">$${totalMrr.toLocaleString()}</span>
                </div>
                <div class="card metric-card simple-metric">
                    <span class="metric-label"><ion-icon name="receipt-outline" class="metric-icon"></ion-icon> Orders</span>
                    <span class="metric-value">${activeOrders}</span>
                </div>
                <div class="card metric-card simple-metric">
                    <span class="metric-label"><ion-icon name="trending-up-outline" class="metric-icon"></ion-icon> Profit</span>
                    <span class="metric-value" style="color: ${profit >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)'}">
                        $${profit.toLocaleString()}
                    </span>
                </div>
            </div>

            <!-- Alerts Row -->
            <div class="grid-2 mb-6 alert-grid">
                <!-- Sales Alerts -->
                <div class="card alert-card" style="border-left: 4px solid var(--accent-warning);">
                    <div class="alert-header">
                        <h3 style="color: var(--accent-warning)"><ion-icon name="alert-circle-outline"></ion-icon> <span class="alert-title-full">Expiring Sales (90 Days)</span><span class="alert-title-short">Sales Expiry</span></h3>
                        <span class="badge badge-warning">${expiringSales.length}</span>
                    </div>
                    <div class="alert-content">
                    ${expiringSales.length === 0 ? '<p style="color:var(--text-muted)">No contracts expiring soon.</p>' : `
                        <div class="alert-list">
                            ${expiringSales.slice(0, 5).map(s => {
            const days = getDaysDiff(s.dates?.end);
            return `<div class="alert-item">
                                <span class="alert-item-id">${s.salesOrderId}</span>
                                <span class="alert-item-name">${s.customerName}</span>
                                <span class="alert-item-days" style="color:var(--accent-warning)">${days}d</span>
                            </div>`;
        }).join('')}
                        </div>
                        ${expiringSales.length > 5 ? `<div class="alert-more">+${expiringSales.length - 5} more</div>` : ''}
                    `}
                    </div>
                </div>

                <!-- Inventory Alerts -->
                <div class="card alert-card" style="border-left: 4px solid var(--accent-danger);">
                    <div class="alert-header">
                        <h3 style="color: var(--accent-danger)"><ion-icon name="timer-outline"></ion-icon> <span class="alert-title-full">Expiring Resources (90 Days)</span><span class="alert-title-short">Resource Expiry</span></h3>
                        <span class="badge badge-danger">${expiringInventory.length}</span>
                    </div>
                    <div class="alert-content">
                    ${expiringInventory.length === 0 ? '<p style="color:var(--text-muted)">No resources expiring soon.</p>' : `
                        <div class="alert-list">
                            ${expiringInventory.slice(0, 5).map(i => {
            const days = getDaysDiff(i.dates?.end);
            return `<div class="alert-item">
                                <span class="alert-item-id">${i.resourceId}</span>
                                <span class="alert-item-name">${i.cableSystem}</span>
                                <span class="alert-item-days" style="color:var(--accent-danger)">${days}d</span>
                            </div>`;
        }).join('')}
                        </div>
                        ${expiringInventory.length > 5 ? `<div class="alert-more">+${expiringInventory.length - 5} more</div>` : ''}
                    `}
                    </div>
                </div>
            </div>

            <!-- Bottom Actions -->
            <div class="grid-3 mb-4 dashboard-grid-bottom dashboard-secondary mobile-hidden">
                <!-- Sales Leaderboard -->
                <div class="card leaderboard-card" style="border-left: 4px solid var(--accent-primary);">
                    <div class="flex justify-between items-center mb-4">
                        <h3 style="color: var(--accent-primary)"><ion-icon name="trophy-outline"></ion-icon> Sales Leaderboard</h3>
                    </div>
                    ${leaderboard.length === 0 ? '<p style="color:var(--text-muted)">No sales data available.</p>' : `
                        <div class="leaderboard-list">
                            ${(() => {
                    const maxMrr = leaderboard.length > 0 ? leaderboard[0].totalMrr : 1;
                    return leaderboard.slice(0, 5).map((p, idx) => {
                        const medals = ['🥇', '🥈', '🥉'];
                        const medal = idx < 3 ? medals[idx] : `<span style="color:var(--text-muted); width:20px; display:inline-block; text-align:center;">${idx + 1}</span>`;
                        const barWidth = maxMrr > 0 ? Math.round((p.totalMrr / maxMrr) * 100) : 0;
                        const isTop3 = idx < 3;
                        return `
                                        <div class="leaderboard-item ${isTop3 ? 'top-' + (idx + 1) : ''}">
                                            <div class="leaderboard-rank">${medal}</div>
                                            <div class="leaderboard-info">
                                                <div class="leaderboard-name">${p.name}</div>
                                                <div class="leaderboard-bar" style="background: var(--border-color); height: 4px; border-radius: 2px; margin-top: 4px;">
                                                    <div style="width: ${barWidth}%; height: 100%; background: ${idx === 0 ? 'var(--accent-warning)' : idx === 1 ? '#c0c0c0' : idx === 2 ? '#cd7f32' : 'var(--accent-primary)'}; border-radius: 2px; transition: width 0.3s;"></div>
                                                </div>
                                            </div>
                                            <div class="leaderboard-stats">
                                                <span class="font-mono" style="color:var(--accent-success); font-weight: 600;">$${p.totalMrr.toLocaleString()}</span>
                                                <span style="font-size: 0.7rem; color: var(--text-muted);">${p.orderCount} orders</span>
                                            </div>
                                        </div>
                                    `;
                    }).join('');
                })()}
                        </div>
                    `}
                </div>

                <div class="card">
                    <h3 class="mb-4"><ion-icon name="pie-chart-outline"></ion-icon> Sales by Type</h3>
                    ${totalSalesCount === 0 ? '<p style="color:var(--text-muted)">No sales data available.</p>' : `
                        <div style="display: flex; align-items: center; gap: 2rem;">
                            <div style="position: relative; width: 150px; height: 150px;">
                                <svg viewBox="0 0 36 36" style="width: 100%; height: 100%; transform: rotate(-90deg);">
                                    ${(() => {
                    const colors = { Resale: '#635bff', Inventory: '#00d4aa', Hybrid: '#ffb347' };
                    const types = ['Resale', 'Inventory', 'Hybrid'];
                    let offset = 0;
                    return types.map(type => {
                        const pct = totalSalesCount > 0 ? (salesTypeCount[type] / totalSalesCount) * 100 : 0;
                        const circle = pct > 0 ? `<circle cx="18" cy="18" r="15.91549430918954" fill="transparent" stroke="${colors[type]}" stroke-width="4" stroke-dasharray="${pct} ${100 - pct}" stroke-dashoffset="${-offset}" />` : '';
                        offset += pct;
                        return circle;
                    }).join('');
                })()}
                                </svg>
                            </div>
                            <div style="font-size: 0.85rem;">
                                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                                    <span style="width: 12px; height: 12px; background: #635bff; border-radius: 2px;"></span>
                                    <span>Resale: ${salesTypeCount.Resale} (${totalSalesCount > 0 ? Math.round(salesTypeCount.Resale / totalSalesCount * 100) : 0}%)</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                                    <span style="width: 12px; height: 12px; background: #00d4aa; border-radius: 2px;"></span>
                                    <span>Inventory: ${salesTypeCount.Inventory} (${totalSalesCount > 0 ? Math.round(salesTypeCount.Inventory / totalSalesCount * 100) : 0}%)</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    <span style="width: 12px; height: 12px; background: #ffb347; border-radius: 2px;"></span>
                                    <span>Hybrid: ${salesTypeCount.Hybrid} (${totalSalesCount > 0 ? Math.round(salesTypeCount.Hybrid / totalSalesCount * 100) : 0}%)</span>
                                </div>
                            </div>
                        </div>
                    `}
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
                                    <option>Procurement Team</option>
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
                                <span id="margin-percent-label">Margin (%):</span>
                                <span class="font-mono" id="disp-margin-percent">0.0%</span>
                            </div>
                            <!-- Recurring Margin Row (for IRU Resale only) -->
                            <div id="recurring-margin-row" style="display:none; justify-content:space-between; font-weight:bold; font-size:1.1em; margin-top:0.5rem;">
                                <span>续月利润率:</span>
                                <span class="font-mono" id="disp-recurring-margin">0.0%</span>
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
        // ===== Helper Functions =====
        const getValue = (name) => Number(document.querySelector(`[name="${name}"]`)?.value || 0);
        const getVal = (name) => document.querySelector(`[name="${name}"]`)?.value || '';
        const fmt = (num) => '$' + num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        // ===== Get Core Parameters =====
        const salesModel = getVal('salesModel');   // 'Lease' or 'IRU'
        const salesType = getVal('salesType');     // 'Resale', 'Inventory', 'Hybrid', 'Swapped Out'
        const salesTerm = getValue('dates.term') || 12;  // Sales contract term in months
        const salesCapacity = getValue('capacity.value') || 1;

        // ===== Get Linked Inventory (for Inventory/Hybrid types) =====
        const inventoryLink = getVal('inventoryLink');
        const linkedResource = inventoryLink ? window.Store.getInventory().find(r => r.resourceId === inventoryLink) : null;
        const inventoryCapacity = linkedResource?.capacity?.value || 1;
        const capacityRatio = salesCapacity / inventoryCapacity; // Capacity allocation ratio

        // ===== Calculate Inventory Monthly Cost (if applicable) =====
        let inventoryMonthlyCost = 0;
        if (linkedResource && (salesType === 'Inventory' || salesType === 'Hybrid')) {
            const invOwnership = linkedResource.acquisition?.ownership || 'Leased';
            if (invOwnership === 'IRU') {
                // IRU Inventory: (OTC / Term + Annual O&M / 12) × capacity ratio
                const invOtc = linkedResource.financials?.otc || 0;
                const invTerm = linkedResource.financials?.term || 1;
                const invAnnualOm = linkedResource.financials?.annualOmCost || 0;
                inventoryMonthlyCost = ((invOtc / invTerm) + (invAnnualOm / 12)) * capacityRatio;
            } else {
                // Leased Inventory: MRC × capacity ratio
                inventoryMonthlyCost = (linkedResource.financials?.mrc || 0) * capacityRatio;
            }
        }

        // ===== Get Operating Costs (Backhaul, XC, Other) =====
        const backhaulMRC = getValue('costs.backhaul.aEnd.monthly') + getValue('costs.backhaul.zEnd.monthly');
        const xcMRC = getValue('costs.crossConnect.aEnd.monthly') + getValue('costs.crossConnect.zEnd.monthly');
        const otherMonthly = getValue('costs.otherCosts.monthly');
        const operatingCosts = backhaulMRC + xcMRC + otherMonthly;

        // ===== Calculate based on Sales Model =====
        let monthlyRevenue = 0;
        let monthlyProfit = 0;
        let firstMonthProfit = 0;  // For IRU Resale (OTC profit in first month)
        let ongoingMonthlyProfit = 0;  // For IRU Resale (subsequent months)
        let isIruResale = false;

        if (salesModel === 'Lease') {
            // ========== LEASE MODEL ==========
            const mrcSales = getValue('financials.mrcSales');
            const nrcSales = getValue('financials.nrcSales');
            monthlyRevenue = mrcSales;

            // Get Cable MRC (only for Resale and Hybrid)
            let cableMRC = 0;
            if (salesType === 'Resale' || salesType === 'Hybrid') {
                const cableModel = getVal('costs.cable.model') || 'Lease';
                if (cableModel === 'Lease') {
                    cableMRC = getValue('costs.cable.mrc');
                } else {
                    // IRU cable: O&M / 12 as monthly cost
                    cableMRC = getValue('costs.cable.annualOm') / 12;
                }
            }

            switch (salesType) {
                case 'Resale':
                    monthlyProfit = mrcSales - cableMRC - operatingCosts;
                    break;
                case 'Inventory':
                    monthlyProfit = mrcSales - inventoryMonthlyCost - operatingCosts;
                    break;
                case 'Hybrid':
                    monthlyProfit = mrcSales - inventoryMonthlyCost - cableMRC - operatingCosts;
                    break;
                default:
                    monthlyProfit = mrcSales - operatingCosts;
            }

        } else if (salesModel === 'IRU') {
            // ========== IRU MODEL ==========
            const otcRevenue = getValue('financials.otc');
            const annualOmRevenue = getValue('financials.annualOm');
            const monthlyOmRevenue = annualOmRevenue / 12;

            // Get Cable costs (for Resale and Hybrid)
            const cableOtc = getValue('costs.cable.otc');
            const cableAnnualOm = getValue('costs.cable.annualOm');
            const cableTerm = getValue('costs.cable.termMonths') || salesTerm;
            const cableMonthlyOtc = cableOtc / cableTerm;
            const cableMonthlyOm = cableAnnualOm / 12;

            switch (salesType) {
                case 'Resale':
                    // IRU Resale: OTC profit one-time in first month
                    isIruResale = true;
                    const otcProfit = otcRevenue - cableOtc;
                    const monthlyOmProfit = monthlyOmRevenue - cableMonthlyOm;

                    firstMonthProfit = otcProfit + monthlyOmProfit - operatingCosts;
                    ongoingMonthlyProfit = monthlyOmProfit - operatingCosts;
                    monthlyRevenue = monthlyOmRevenue;  // Ongoing revenue
                    monthlyProfit = ongoingMonthlyProfit;  // Display ongoing profit
                    break;

                case 'Inventory':
                    // IRU Inventory: OTC revenue amortized monthly
                    const monthlyOtcRevenue = otcRevenue / salesTerm;
                    monthlyRevenue = monthlyOtcRevenue + monthlyOmRevenue;
                    monthlyProfit = monthlyRevenue - inventoryMonthlyCost - operatingCosts;
                    break;

                case 'Hybrid':
                    // IRU Hybrid: OTC revenue amortized monthly, both inventory and cable costs
                    const monthlyOtcRev = otcRevenue / salesTerm;
                    monthlyRevenue = monthlyOtcRev + monthlyOmRevenue;
                    monthlyProfit = monthlyRevenue - inventoryMonthlyCost - cableMonthlyOtc - cableMonthlyOm - operatingCosts;
                    break;

                case 'Swapped Out':
                    // Swapped Out: No profit calculation
                    monthlyRevenue = 0;
                    monthlyProfit = 0;
                    break;

                default:
                    monthlyProfit = 0;
            }
        }

        // ===== Calculate Overall Margin =====
        // For IRU Resale: first month margin is based on OTC + O&M
        // For others: based on monthly revenue
        const firstMonthMargin = isIruResale && (monthlyRevenue + (getValue('financials.otc') || 0)) > 0
            ? (firstMonthProfit / (getValue('financials.otc') + monthlyRevenue)) * 100
            : 0;
        const recurringMargin = monthlyRevenue > 0 ? (ongoingMonthlyProfit / monthlyRevenue) * 100 : 0;
        const marginPercent = monthlyRevenue > 0 ? (monthlyProfit / monthlyRevenue) * 100 : 0;
        const totalMonthlyCost = monthlyRevenue - monthlyProfit;

        // ===== Update UI =====
        document.getElementById('disp-total-cost').textContent = fmt(totalMonthlyCost);

        const marginEl = document.getElementById('disp-gross-margin');
        marginEl.textContent = fmt(monthlyProfit);
        marginEl.style.color = monthlyProfit >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)';

        const percentEl = document.getElementById('disp-margin-percent');
        const marginLabel = document.getElementById('margin-percent-label');
        const recurringRow = document.getElementById('recurring-margin-row');
        const recurringEl = document.getElementById('disp-recurring-margin');

        if (isIruResale) {
            // Show dual margins for IRU Resale
            marginLabel.textContent = '首月利润率:';
            percentEl.textContent = firstMonthMargin.toFixed(1) + '%';
            percentEl.style.color = firstMonthMargin >= 20 ? 'var(--accent-success)' : (firstMonthMargin > 0 ? 'var(--accent-warning)' : 'var(--accent-danger)');

            // Show recurring margin row
            recurringRow.style.display = 'flex';
            recurringEl.textContent = recurringMargin.toFixed(1) + '%';
            recurringEl.style.color = recurringMargin >= 20 ? 'var(--accent-success)' : (recurringMargin > 0 ? 'var(--accent-warning)' : 'var(--accent-danger)');
        } else {
            // Standard single margin display
            marginLabel.textContent = 'Margin (%):';
            percentEl.textContent = marginPercent.toFixed(1) + '%';
            percentEl.style.color = marginPercent >= 20 ? 'var(--accent-success)' : (marginPercent > 0 ? 'var(--accent-warning)' : 'var(--accent-danger)');

            // Hide recurring margin row
            recurringRow.style.display = 'none';
        }

        // NRC Profit display - for IRU Resale show first month profit, otherwise show regular NRC
        const nrcEl = document.getElementById('disp-nrc-profit');
        if (isIruResale) {
            nrcEl.textContent = fmt(firstMonthProfit) + ' (1st Mo)';
            nrcEl.style.color = firstMonthProfit >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)';
        } else {
            const nrcSales = getValue('financials.nrcSales');
            const cableNrc = getValue('costs.cable.nrc');
            const bhNrc = getValue('costs.backhaul.aEnd.nrc') + getValue('costs.backhaul.zEnd.nrc');
            const xcNrc = getValue('costs.crossConnect.aEnd.nrc') + getValue('costs.crossConnect.zEnd.nrc');
            const otherOneOff = getValue('costs.otherCosts.oneOff');
            const nrcProfit = nrcSales - cableNrc - bhNrc - xcNrc - otherOneOff;
            nrcEl.textContent = fmt(nrcProfit);
            nrcEl.style.color = nrcProfit >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)';
        }
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

        const newOrder = {
            resourceId: getVal('orderId') || null,
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
                annualOm: getNum('financials.annualOm')
                // Computed fields will be added below
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

        // Calculate and store financial metrics using unified engine
        const computed = computeOrderFinancials(newOrder);
        newOrder.financials.marginPercent = computed.marginPercent;
        newOrder.financials.monthlyProfit = computed.monthlyProfit;

        // Store IRU Resale specific metrics
        if (computed.isIruResale) {
            newOrder.financials.firstMonthProfit = computed.firstMonthProfit;
            newOrder.financials.firstMonthMargin = computed.firstMonthMargin;
            newOrder.financials.recurringMargin = computed.recurringMargin;
        }

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

    renderInventory(searchQuery = '', page = 1) {
        const ITEMS_PER_PAGE = 20;
        let data = window.Store.getInventory();

        // Apply search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            data = data.filter(item =>
                item.resourceId.toLowerCase().includes(query) ||
                (item.cableSystem && item.cableSystem.toLowerCase().includes(query))
            );
        }

        // Pagination
        const totalItems = data.length;
        const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
        const currentPage = Math.min(Math.max(1, page), totalPages || 1);
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);
        const paginatedData = data.slice(startIndex, endIndex);

        // Add "Add Item" button
        const addBtn = document.createElement('button');
        addBtn.className = 'btn btn-primary';
        addBtn.innerHTML = '<ion-icon name="add-outline"></ion-icon> Add Resource';
        addBtn.onclick = () => this.openInventoryModal();
        this.headerActions.appendChild(addBtn);

        const html = `
            <div class="filter-bar mb-4">
                <div class="search-box">
                    <ion-icon name="search-outline"></ion-icon>
                    <input type="text" id="inventory-search" class="form-control" placeholder="Search Resource ID or Cable..." value="${searchQuery}">
                </div>
                <div class="page-info" style="margin-left: auto; color: var(--text-muted); font-size: 0.85rem;">
                    Showing ${totalItems > 0 ? startIndex + 1 : 0}-${endIndex} of ${totalItems}
                </div>
            </div>
            <style>
                .inventory-table tbody tr:hover {background: rgba(99, 91, 255, 0.08); }
                .filter-bar { display: flex; gap: 1rem; flex-wrap: wrap; align-items: center; }
                .search-box { position: relative; flex: 1; min-width: 200px; max-width: 300px; }
                .search-box ion-icon { position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: var(--text-muted); }
                .search-box input { padding-left: 2.25rem; }
            </style>
            <div class="table-container">
                <table class="inventory-table">
                    <thead>
                                                                                                                                        <tr>
                                                                                                                                            <th>Resource ID</th>
                                                                                                                                            <th>Status</th>
                                                                                                                                            <th class="col-acquisition">Acquisition</th>
                                                                                                                                            <th>Details</th>
                                                                                                                                            <th class="col-cost-info">Cost Info</th>
                                                                                                                                            <th class="col-location">Location (A / Z)</th>
                                                                                                                                            <th>Actions</th>
                                                                                                                                        </tr>
                    </thead>
                    <tbody>
                        ${paginatedData.map(item => {
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
                                    ${linkedSales.length > 0 ? `<div style="font-size:0.65rem; color:var(--accent-primary); margin-top:4px;">📋 ${linkedSales.length} order${linkedSales.length > 1 ? 's' : ''}</div>` : ''}
                                </td>
                                <td class="col-acquisition">
                                    <div style="font-weight:500">${item.acquisition?.type || 'Purchased'}</div>
                                    <div style="font-size:0.75rem; color:var(--text-muted)">${item.acquisition?.ownership || ''}</div>
                                </td>
                                <td>
                                    <div style="font-weight:600">${item.cableSystem}</div>
                                    ${item.protection === 'Protected' && item.protectionCableSystem ? `<div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.1rem;">${item.protectionCableSystem}</div>` : ''}
                                    <div style="font-size:0.8em; color:var(--text-muted)">
                                        ${item.capacity?.value || 0} ${item.capacity?.unit || 'Gbps'}
                                    </div>
                                    <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.2rem;">
                                        ${item.segmentType || ''} (${item.protection || ''})
                                    </div>
                                    <div class="mobile-capacity-info" style="font-size:0.75rem; color:var(--accent-warning); margin-top:0.35rem; font-weight:500;">
                                        📊 已售 ${totalSoldCapacity}/${totalCapacity} ${item.capacity?.unit || 'Gbps'}
                                    </div>
                                </td>
                                <td class="col-cost-info">
                                    ${item.acquisition?.ownership !== 'IRU' ? `<div class="font-mono">MRC: $${(item.financials?.mrc || 0).toLocaleString()}</div>` : ''}
                                    <div class="font-mono" style="font-size:0.8em; color:var(--text-muted)">${item.acquisition?.ownership === 'IRU' ? 'OTC' : 'NRC'}: $${(item.financials?.otc || 0).toLocaleString()}</div>
                                    <div style="font-size:0.75rem; color:var(--accent-danger); margin-top:0.2rem;">Expires: ${item.dates?.end || 'N/A'}</div>
                                </td>
                                <td class="col-location" style="font-size:0.85rem">
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
            ${totalPages > 1 ? `
            <div class="pagination-controls" style="display: flex; justify-content: center; align-items: center; gap: 0.5rem; margin-top: 1rem;">
                <button class="btn btn-secondary pagination-btn" data-page="${currentPage - 1}" ${currentPage <= 1 ? 'disabled' : ''} style="padding: 0.4rem 0.8rem;">
                    <ion-icon name="chevron-back-outline"></ion-icon>
                </button>
                <span style="color: var(--text-muted); font-size: 0.85rem;">Page ${currentPage} of ${totalPages}</span>
                <button class="btn btn-secondary pagination-btn" data-page="${currentPage + 1}" ${currentPage >= totalPages ? 'disabled' : ''} style="padding: 0.4rem 0.8rem;">
                    <ion-icon name="chevron-forward-outline"></ion-icon>
                </button>
            </div>
            ` : ''}
            `;
        this.container.innerHTML = html;

        // Add search event listener
        const searchInput = document.getElementById('inventory-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.headerActions.innerHTML = '';
                this.renderInventory(e.target.value, 1); // Reset to page 1 on search
            });
            // Focus cursor at the end of search input if there's a value
            if (searchQuery) {
                searchInput.focus();
                searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
            }
        }

        // Add pagination event listeners
        document.querySelectorAll('.pagination-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetPage = parseInt(e.currentTarget.dataset.page);
                this.headerActions.innerHTML = '';
                this.renderInventory(searchQuery, targetPage);
            });
        });
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

    renderSales(filters = {}) {
        let data = window.Store.getSales();

        // Get unique salespersons for dropdown
        const salespersons = [...new Set(data.map(s => s.salesperson).filter(Boolean))].sort();

        // Apply filters
        const searchQuery = filters.search || '';
        const salespersonValue = filters.salesperson || '';
        const statusValue = filters.status || '';

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            data = data.filter(item =>
                item.salesOrderId.toLowerCase().includes(query) ||
                (item.customerName && item.customerName.toLowerCase().includes(query))
            );
        }

        if (salespersonValue) {
            data = data.filter(item => item.salesperson === salespersonValue);
        }

        if (statusValue) {
            data = data.filter(item => item.status === statusValue);
        }

        // Pagination
        const ITEMS_PER_PAGE = 20;
        const currentPageNum = filters.page || 1;
        const totalItems = data.length;
        const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
        const currentPage = Math.min(Math.max(1, currentPageNum), totalPages || 1);
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);
        const paginatedData = data.slice(startIndex, endIndex);

        // Add "Add Sale" button
        const addBtn = document.createElement('button');
        addBtn.className = 'btn btn-primary';
        addBtn.innerHTML = '<ion-icon name="add-outline"></ion-icon> New Sale';
        addBtn.onclick = () => this.openAddSalesModal();
        this.headerActions.appendChild(addBtn);

        const html = `
            <div class="filter-bar mb-4">
                <div class="search-box">
                    <ion-icon name="search-outline"></ion-icon>
                    <input type="text" id="sales-search" class="form-control" placeholder="Search Order ID or Customer..." value="${searchQuery}">
                </div>
                <select id="sales-salesperson-filter" class="form-control" style="max-width: 180px;">
                    <option value="">All Salespersons</option>
                    ${salespersons.map(s => `<option value="${s}" ${s === salespersonValue ? 'selected' : ''}>${s}</option>`).join('')}
                </select>
                <select id="sales-status-filter" class="form-control" style="max-width: 140px;">
                    <option value="">All Status</option>
                    <option value="Active" ${statusValue === 'Active' ? 'selected' : ''}>Active</option>
                    <option value="Pending" ${statusValue === 'Pending' ? 'selected' : ''}>Pending</option>
                    <option value="Churned" ${statusValue === 'Churned' ? 'selected' : ''}>Churned</option>
                </select>
                <div class="page-info" style="margin-left: auto; color: var(--text-muted); font-size: 0.85rem;">
                    Showing ${totalItems > 0 ? startIndex + 1 : 0}-${endIndex} of ${totalItems}
                </div>
            </div>
            <style>
                .sales-table tbody tr:hover {background: rgba(99, 91, 255, 0.08); }
                .margin-badge {padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
                .margin-high {background: rgba(0, 212, 170, 0.15); color: #00d4aa; }
                .margin-mid {background: rgba(255, 179, 71, 0.15); color: #ffb347; }
                .margin-low {background: rgba(255, 107, 107, 0.15); color: #ff6b6b; }
                .type-icon {font-size: 0.7rem; padding: 0.15rem 0.4rem; border-radius: 3px; margin-right: 0.3rem; white-space: nowrap; }
                .type-resale {background: rgba(99, 91, 255, 0.2); color: #635bff; }
                .type-inventory {background: rgba(0, 212, 170, 0.2); color: #00d4aa; }
                .type-hybrid {background: rgba(255, 179, 71, 0.2); color: #ffb347; }
                .type-swap {background: rgba(150, 150, 150, 0.2); color: #999; }
                .order-id-cell { white-space: nowrap; color: #5a6a85 !important; }
                .customer-name { max-width: 180px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }
                .col-revenue, .col-margin, .col-margin-percent { text-align: right; }
                .inventory-link { font-size: 0.7rem; color: #999 !important; margin-top: 2px; }
                .filter-bar { display: flex; gap: 1rem; flex-wrap: wrap; align-items: center; }
                .search-box { position: relative; flex: 1; min-width: 200px; max-width: 300px; }
                .search-box ion-icon { position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: var(--text-muted); }
                .search-box input { padding-left: 2.25rem; }
            </style>
            <div class="table-container">
                <table class="sales-table">
                    <thead>
                        <tr>
                            <th>Order ID</th>
                            <th>Customer</th>
                            <th>Type</th>
                            <th>Capacity</th>
                            <th>Status</th>
                            <th class="col-revenue" style="text-align:right">Revenue</th>
                            <th class="col-margin" style="text-align:right">Margin</th>
                            <th class="col-margin-percent" style="text-align:right">Margin %</th>
                            <th class="col-salesperson">Salesperson</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${paginatedData.length === 0 ? '<tr><td colspan="10" style="text-align:center; color:var(--text-muted); padding:2rem;">No sales orders match your filters.</td></tr>' : ''}
                        ${paginatedData.map(item => {
            // Use unified calculation engine
            const computed = computeOrderFinancials(item);
            const salesModel = item.salesModel || 'Lease';
            const salesType = item.salesType || 'Resale';

            // Revenue display
            const mrr = computed.monthlyRevenue;

            // Margin display - prepare for both single and dual display
            const margin = computed.monthlyProfit;
            const marginPercent = computed.marginPercent.toFixed(1);

            // For IRU Resale, show dual margins (first month + recurring)
            const isIruResale = computed.isIruResale;
            const firstMonthMargin = computed.firstMonthMargin?.toFixed(1) || '0.0';
            const recurringMargin = computed.recurringMargin?.toFixed(1) || '0.0';

            // Color coding for margin
            const marginClass = marginPercent >= 50 ? 'margin-high' : (marginPercent >= 20 ? 'margin-mid' : 'margin-low');
            const firstMonthMarginClass = firstMonthMargin >= 50 ? 'margin-high' : (firstMonthMargin >= 20 ? 'margin-mid' : 'margin-low');
            const recurringMarginClass = recurringMargin >= 50 ? 'margin-high' : (recurringMargin >= 20 ? 'margin-mid' : 'margin-low');

            // Status badge
            const statusClass = item.status === 'Active' ? 'badge-success' : (item.status === 'Pending' ? 'badge-warning' : 'badge-danger');

            // Type icons
            const typeClass = salesType === 'Resale' ? 'type-resale' :
                salesType === 'Inventory' ? 'type-inventory' :
                    salesType === 'Hybrid' ? 'type-hybrid' : 'type-swap';
            const typeIcon = salesType === 'Resale' ? '🔄' :
                salesType === 'Inventory' ? '📦' :
                    salesType === 'Hybrid' ? '🔁' : '🔀';

            // Inventory indicator
            const hasInventory = item.inventoryLink ? '✓' : '';

            // Build margin percent cell - dual display for IRU Resale
            const marginPercentCell = isIruResale ? `
                <div style="display:flex; flex-direction:column; gap:2px; align-items:flex-end;">
                    <div style="display:flex; align-items:center; gap:4px;">
                        <span style="font-size:0.65rem; color:var(--text-muted);">1st</span>
                        <span class="margin-badge ${firstMonthMarginClass}" style="font-size:0.75rem; padding:2px 6px;">${firstMonthMargin}%</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:4px;">
                        <span style="font-size:0.65rem; color:var(--text-muted);">续</span>
                        <span class="margin-badge ${recurringMarginClass}" style="font-size:0.75rem; padding:2px 6px;">${recurringMargin}%</span>
                    </div>
                </div>
            ` : `<span class="margin-badge ${marginClass}">${marginPercent}%</span>`;

            return `
                            <tr>
                                <td class="font-mono order-id-cell">${item.salesOrderId}</td>
                                <td>
                                    <div class="customer-name" style="font-weight:600" title="${item.customerName}">${item.customerName}</div>
                                    <div class="mobile-capacity-info" style="font-size:0.75rem; color:var(--accent-primary); margin-top:0.25rem; font-weight:500;">📦 ${item.capacity?.value || '-'} ${item.capacity?.unit || 'Gbps'}</div>
                                    ${item.inventoryLink ? `<div class="inventory-link">🔗 ${item.inventoryLink}</div>` : ''}
                                </td>
                                <td>
                                    <span class="type-icon ${typeClass}">${typeIcon} ${salesType}</span>
                                    <div style="font-size:0.7rem; color:var(--text-muted); margin-top:2px;">${salesModel}</div>
                                </td>
                                <td class="font-mono" style="color: var(--accent-primary)">${item.capacity?.value || '-'} ${item.capacity?.unit || ''}</td>
                                <td><span class="badge ${statusClass}">${item.status}</span></td>
                                <td class="col-revenue font-mono" style="text-align:right; color: var(--accent-success)">$${mrr.toLocaleString()}</td>
                                <td class="col-margin font-mono" style="text-align:right; color: ${margin >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)'}">$${margin.toLocaleString()}</td>
                                <td class="col-margin-percent" style="text-align:right">${marginPercentCell}</td>
                                <td class="col-salesperson" style="font-size:0.85rem; color:var(--text-muted)">${item.salesperson || '-'}</td>
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
            ${totalPages > 1 ? `
            <div class="pagination-controls" style="display: flex; justify-content: center; align-items: center; gap: 0.5rem; margin-top: 1rem;">
                <button class="btn btn-secondary sales-pagination-btn" data-page="${currentPage - 1}" ${currentPage <= 1 ? 'disabled' : ''} style="padding: 0.4rem 0.8rem;">
                    <ion-icon name="chevron-back-outline"></ion-icon>
                </button>
                <span style="color: var(--text-muted); font-size: 0.85rem;">Page ${currentPage} of ${totalPages}</span>
                <button class="btn btn-secondary sales-pagination-btn" data-page="${currentPage + 1}" ${currentPage >= totalPages ? 'disabled' : ''} style="padding: 0.4rem 0.8rem;">
                    <ion-icon name="chevron-forward-outline"></ion-icon>
                </button>
            </div>
            ` : ''}
            `;
        this.container.innerHTML = html;

        // Add filter event listeners
        const applyFilters = (page = 1) => {
            const search = document.getElementById('sales-search')?.value || '';
            const salesperson = document.getElementById('sales-salesperson-filter')?.value || '';
            const status = document.getElementById('sales-status-filter')?.value || '';
            this.headerActions.innerHTML = '';
            this.renderSales({ search, salesperson, status, page });
        };

        const searchInput = document.getElementById('sales-search');
        const salespersonFilter = document.getElementById('sales-salesperson-filter');
        const statusFilter = document.getElementById('sales-status-filter');

        if (searchInput) {
            searchInput.addEventListener('input', () => applyFilters(1));
            // Focus cursor at end of search input if there's a value
            if (filters.search) {
                searchInput.focus();
                searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
            }
        }
        if (salespersonFilter) {
            salespersonFilter.addEventListener('change', () => applyFilters(1));
        }
        if (statusFilter) {
            statusFilter.addEventListener('change', () => applyFilters(1));
        }

        // Add pagination event listeners
        document.querySelectorAll('.sales-pagination-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetPage = parseInt(e.currentTarget.dataset.page);
                applyFilters(targetPage);
            });
        });
    },

    viewSalesDetails(salesOrderId) {
        const order = window.Store.getSales().find(s => s.salesOrderId === salesOrderId);
        if (!order) return;

        // Use unified calculation engine
        const computed = computeOrderFinancials(order);
        const salesModel = order.salesModel || 'Lease';
        const salesType = order.salesType || 'Resale';

        // Revenue display - handle both Lease and IRU
        const isIru = salesModel === 'IRU';
        const mrrDisplay = isIru ? computed.monthlyRevenue : (order.financials?.mrcSales || 0);
        const nrcDisplay = isIru ? (order.financials?.otc || 0) : (order.financials?.nrcSales || 0);
        const revenueLabel1 = isIru ? 'Monthly O&M Revenue' : 'Monthly Revenue (MRR)';
        const revenueLabel2 = isIru ? 'OTC Revenue' : 'One-time Revenue (NRC)';

        const statusClass = order.status === 'Active' ? 'badge-success' : (order.status === 'Pending' ? 'badge-warning' : 'badge-danger');

        // Calculate costs display
        const cableCostMrc = order.costs?.cableCost?.mrc || order.costs?.cable?.mrc || 0;
        const backhaulAMrc = order.costs?.backhaulA?.mrc || order.costs?.backhaul?.aEnd?.monthly || 0;
        const backhaulZMrc = order.costs?.backhaulZ?.mrc || order.costs?.backhaul?.zEnd?.monthly || 0;
        const xcAMrc = order.costs?.crossConnectA?.mrc || order.costs?.crossConnect?.aEnd?.monthly || 0;
        const xcZMrc = order.costs?.crossConnectZ?.mrc || order.costs?.crossConnect?.zEnd?.monthly || 0;
        const totalCostsMrc = cableCostMrc + backhaulAMrc + backhaulZMrc + xcAMrc + xcZMrc;

        // Use computed values for margin
        const grossMargin = computed.monthlyProfit;
        const marginPercent = computed.marginPercent.toFixed(1);
        const marginColor = grossMargin >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)';

        // Build profitability section - different for IRU Resale
        let profitabilityHtml = '';
        if (computed.isIruResale) {
            const firstMonthMargin = computed.firstMonthMargin?.toFixed(1) || '0.0';
            const recurringMargin = computed.recurringMargin?.toFixed(1) || '0.0';
            const firstMonthProfit = computed.firstMonthProfit || 0;
            profitabilityHtml = `
                <tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">首月利润</td><td class="font-mono" style="color:${firstMonthProfit >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)'}; font-weight:600">$${firstMonthProfit.toLocaleString()}</td></tr>
                <tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">首月利润率</td><td class="font-mono" style="color:${marginColor}; font-weight:600">${firstMonthMargin}%</td></tr>
                <tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">续月利润</td><td class="font-mono" style="color:${marginColor}; font-weight:600">$${grossMargin.toLocaleString()}</td></tr>
                <tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">续月利润率</td><td class="font-mono" style="color:${marginColor}; font-weight:600">${recurringMargin}%</td></tr>
            `;
        } else {
            profitabilityHtml = `
                <tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">Gross Margin (MRC)</td><td class="font-mono" style="color:${marginColor}; font-weight:600">$${grossMargin.toLocaleString()}</td></tr>
                <tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">Margin %</td><td class="font-mono" style="color:${marginColor}; font-weight:600">${marginPercent}%</td></tr>
            `;
        }

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
                                                                                                                                            <tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">${revenueLabel1}</td><td class="font-mono" style="color:var(--accent-success)">$${mrrDisplay.toLocaleString()}</td></tr>
                                                                                                                                            <tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">${revenueLabel2}</td><td class="font-mono">$${nrcDisplay.toLocaleString()}</td></tr>
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
                                                                                                                                            ${profitabilityHtml}
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

        const salespersonOptions = ['Janna Dai', 'Miki Chen', 'Wayne Jiang', 'Kristen Gan', 'Becky Hai', 'Wolf Yuan', 'Yifeng Jiang', 'Procurement Team']
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
