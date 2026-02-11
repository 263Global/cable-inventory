/**
 * Dashboard Module (ES6)
 * Renders the operational dashboard with metrics, alerts, and charts
 */

/**
 * Renders the dashboard view
 * @param {Object} context - The App object context (this)
 */
const { getAlertBadgeClass, getAlertAccentColor, isExpiringWithin } = window.StatusUi;
const { computeSalesStatus } = window.SalesStatus;
const { escapeHtml } = window.DomUtils;

export function renderDashboard(context) {
    const inventory = window.Store.getInventory();
    const sales = window.Store.getSalesOrders();
    const { soldByResourceId } = window.InventoryStatus.buildSalesIndex(sales);

    // Calculate Stats
    const totalCapacity = inventory.reduce((acc, item) => acc + (item.capacity?.value || 0), 0);
    const totalSoldCapacity = Array.from(soldByResourceId.values()).reduce((acc, value) => acc + value, 0);
    const capacityUsagePercent = totalCapacity > 0 ? Math.round((totalSoldCapacity / totalCapacity) * 100) : 0;

    // Resale capacity: sum capacity from sales without inventory link (pure resale)
    const now = new Date();
    const totalResaleCapacity = sales
        .filter(s => !s.inventoryLink && computeSalesStatus(s.dates?.start, s.dates?.end, now) !== 'Expired')
        .reduce((acc, s) => acc + (s.capacity?.value || 0), 0);

    // Use mrcSales and filter for Active orders with valid contract dates
    const getEffectiveSalesStatus = (sale) => computeSalesStatus(sale.dates?.start, sale.dates?.end, now);
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    let totalMrr = 0;
    let totalMonthlyProfit = 0;
    let activeOrders = 0;
    sales.forEach(s => {
        if (getEffectiveSalesStatus(s) !== 'Active') return;
        const computed = computeOrderFinancials(s);
        const mrr = computed.monthlyRevenue || 0;
        if (mrr <= 0) return;
        const contractStart = s.dates?.start ? new Date(s.dates.start) : null;
        const contractEnd = s.dates?.end ? new Date(s.dates.end) : null;
        const startedBeforeOrDuring = !contractStart || contractStart <= currentMonthEnd;
        const endedAfterOrDuring = !contractEnd || contractEnd >= currentMonthStart;
        if (startedBeforeOrDuring && endedAfterOrDuring) {
            totalMrr += mrr;
            totalMonthlyProfit += computed.monthlyProfit || 0;
            activeOrders++;
        }
    });

    const profit = totalMonthlyProfit;

    const expiringSales = sales.filter(s => {
        return getEffectiveSalesStatus(s) === 'Active' && isExpiringWithin(s.dates?.end, 90, now, s.dates?.start);
    });

    const expiringInventory = inventory.filter(i => {
        return isExpiringWithin(i.dates?.end, 90, now, i.dates?.start);
    });

    // Salesperson Leaderboard - Exclude Procurement Team
    const salesByPerson = {};
    sales.forEach(s => {
        const name = s.salesperson || 'Unassigned';
        if (name === 'Procurement Team') return;
        if (!salesByPerson[name]) {
            salesByPerson[name] = { name, totalMrr: 0, orderCount: 0 };
        }
        const computed = computeOrderFinancials(s);
        salesByPerson[name].totalMrr += (computed.monthlyRevenue || 0);
        salesByPerson[name].orderCount += 1;
    });
    const leaderboard = Object.values(salesByPerson).sort((a, b) => b.totalMrr - a.totalMrr);

    // Sales Type Distribution
    const salesTypeCount = { Resale: 0, Inventory: 0, Hybrid: 0 };
    sales.forEach(s => {
        const type = s.salesType;
        if (type && salesTypeCount.hasOwnProperty(type)) {
            salesTypeCount[type]++;
        }
    });
    const totalSalesCount = salesTypeCount.Resale + salesTypeCount.Inventory + salesTypeCount.Hybrid;

    // Monthly MRR Trend (last 6 months)
    const monthlyMrr = {};
    const monthKeys = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthlyMrr[key] = 0;
        monthKeys.push(key);
    }

    monthKeys.forEach(monthKey => {
        const [year, month] = monthKey.split('-').map(Number);
        const monthStart = new Date(year, month - 1, 1);
        const monthEnd = new Date(year, month, 0);

        sales.forEach(s => {
            const computed = computeOrderFinancials(s);
            const mrr = computed.monthlyRevenue || 0;
            if (mrr <= 0) return;
            const contractStart = s.dates?.start ? new Date(s.dates.start) : null;
            const contractEnd = s.dates?.end ? new Date(s.dates.end) : null;
            const startedBeforeOrDuring = !contractStart || contractStart <= monthEnd;
            const endedAfterOrDuring = !contractEnd || contractEnd >= monthStart;
            if (startedBeforeOrDuring && endedAfterOrDuring) {
                monthlyMrr[monthKey] += mrr;
            }
        });
    });

    const mrrTrendData = Object.entries(monthlyMrr).sort((a, b) => a[0].localeCompare(b[0]));
    const maxMrrTrend = Math.max(...mrrTrendData.map(d => d[1]), 1);

    // Margin Distribution
    const marginDist = { high: 0, mid: 0, low: 0 };
    sales.forEach(s => {
        const computed = computeOrderFinancials(s);
        const m = computed.marginPercent || 0;
        if (m >= 50) marginDist.high++;
        else if (m >= 20) marginDist.mid++;
        else marginDist.low++;
    });
    const marginTotal = marginDist.high + marginDist.mid + marginDist.low;

    const html = `
        <!-- Top Stats -->
        <div class="grid-4 mb-6 dashboard-grid-metrics">
            <div class="card metric-card capacity-card" style="flex-direction:column; gap:0.5rem;">
                <span class="metric-label"><ion-icon name="cube-outline" class="metric-icon"></ion-icon> Capacity</span>
                <!-- Inventory row -->
                <div style="display:flex; align-items:center; gap:0.75rem; width:100%;">
                    <div style="min-width:0; flex:1;">
                        <div style="display:flex; align-items:baseline; gap:0.25rem;">
                            <span style="font-size:0.65rem; color:var(--accent-success); font-weight:600;">INV</span>
                            <span style="font-size:1.1rem; font-weight:700; color:var(--accent-primary);">${totalSoldCapacity.toLocaleString()}</span>
                            <span style="font-size:0.7rem; color:var(--text-muted)">/${totalCapacity.toLocaleString()} Gbps</span>
                        </div>
                        <div style="width:100%; height:5px; background:var(--border-color); border-radius:3px; overflow:hidden; margin-top:3px;">
                            <div style="width:${capacityUsagePercent}%; height:100%; background:${capacityUsagePercent >= 80 ? 'var(--accent-danger)' : capacityUsagePercent >= 50 ? 'var(--accent-warning)' : 'var(--accent-success)'}; transition:width 0.3s;"></div>
                        </div>
                    </div>
                    <span style="font-size:0.7rem; color:var(--text-muted); white-space:nowrap;">${capacityUsagePercent}%</span>
                </div>
                <!-- Resale row -->
                <div style="display:flex; align-items:baseline; gap:0.25rem; width:100%;">
                    <span style="font-size:0.65rem; color:#635bff; font-weight:600;">RSL</span>
                    <span style="font-size:1.1rem; font-weight:700; color:#635bff;">${totalResaleCapacity.toLocaleString()}</span>
                    <span style="font-size:0.7rem; color:var(--text-muted)">Gbps</span>
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
            <div class="card alert-card" style="border-left: 4px solid ${getAlertAccentColor('warning')};">
                <div class="alert-header">
                    <h3 style="color: ${getAlertAccentColor('warning')}"><ion-icon name="alert-circle-outline"></ion-icon> <span class="alert-title-full">Expiring Sales (90 Days)</span><span class="alert-title-short">Sales Expiry</span></h3>
                    <span class="badge ${getAlertBadgeClass('warning')}">${expiringSales.length}</span>
                </div>
                <div class="alert-content">
                ${expiringSales.length === 0 ? '<p style="color:var(--text-muted)">No contracts expiring soon.</p>' : `
                    <div class="alert-list">
                        ${expiringSales.slice(0, 5).map(s => {
        const days = getDaysDiff(s.dates?.end);
        return `<div class="alert-item">
                                <span class="alert-item-id">${escapeHtml(s.salesOrderId)}</span>
                                <span class="alert-item-name">${escapeHtml(s.customerName)}</span>
                                <span class="alert-item-days" style="color:${getAlertAccentColor('warning')}">${days}d</span>
                            </div>`;
    }).join('')}
                    </div>
                    ${expiringSales.length > 5 ? `<button type="button" class="alert-more" data-action="navigate-expiring-sales" style="cursor:pointer; background:none; border:none; padding:0; color:inherit; font:inherit;">+${expiringSales.length - 5} more</button>` : ''}
                `}
                </div>
            </div>

            <!-- Inventory Alerts -->
            <div class="card alert-card" style="border-left: 4px solid ${getAlertAccentColor('danger')};">
                <div class="alert-header">
                    <h3 style="color: ${getAlertAccentColor('danger')}"><ion-icon name="timer-outline"></ion-icon> <span class="alert-title-full">Expiring Resources (90 Days)</span><span class="alert-title-short">Resource Expiry</span></h3>
                    <span class="badge ${getAlertBadgeClass('danger')}">${expiringInventory.length}</span>
                </div>
                <div class="alert-content">
                ${expiringInventory.length === 0 ? '<p style="color:var(--text-muted)">No resources expiring soon.</p>' : `
                    <div class="alert-list">
                        ${expiringInventory.slice(0, 5).map(i => {
        const days = getDaysDiff(i.dates?.end);
        return `<div class="alert-item">
                                <span class="alert-item-id">${escapeHtml(i.resourceId)}</span>
                                <span class="alert-item-name">${escapeHtml(i.cableSystem)}</span>
                                <span class="alert-item-days" style="color:${getAlertAccentColor('danger')}">${days}d</span>
                            </div>`;
    }).join('')}
                    </div>
                    ${expiringInventory.length > 5 ? `<button type="button" class="alert-more" data-action="navigate-expiring-inventory" style="cursor:pointer; background:none; border:none; padding:0; color:inherit; font:inherit;">+${expiringInventory.length - 5} more</button>` : ''}
                `}
                </div>
            </div>
        </div>

        <!-- Bottom Analytics -->
        <div class="grid-3 mb-4 dashboard-grid-bottom dashboard-secondary mobile-hidden">
            <!-- 1. MRR Trend Chart -->
            <div class="card" style="border-left: 4px solid var(--accent-success);">
                <h3 class="mb-4" style="color: var(--accent-success)"><ion-icon name="trending-up-outline"></ion-icon> MRR Trend (6 Months)</h3>
                <div style="display: flex; align-items: flex-end; gap: 0.5rem; height: 120px; padding-bottom: 1.5rem; position: relative;">
                    ${mrrTrendData.map(([month, mrr]) => {
        const height = maxMrrTrend > 0 ? Math.max((mrr / maxMrrTrend) * 100, 2) : 2;
        const [year, mon] = month.split('-');
        const shortYear = year.slice(2);
        const label = `${shortYear}/${mon}`;
        return `
                            <div style="flex: 1; display: flex; flex-direction: column; align-items: center;">
                                <div style="font-size: 0.65rem; color: var(--text-muted); margin-bottom: 0.25rem;">$${(mrr / 1000).toFixed(0)}k</div>
                                <div style="width: 100%; height: ${height}%; background: linear-gradient(180deg, var(--accent-success), rgba(0, 212, 170, 0.5)); border-radius: 4px 4px 0 0; min-height: 4px; transition: height 0.3s;"></div>
                                <div style="font-size: 0.6rem; color: var(--text-muted); margin-top: 0.25rem;">${label}</div>
                            </div>
                        `;
    }).join('')}
                </div>
            </div>

            <!-- 2. Margin Distribution -->
            <div class="card" style="border-left: 4px solid var(--accent-warning);">
                <h3 class="mb-4" style="color: var(--accent-warning)"><ion-icon name="stats-chart-outline"></ion-icon> Margin Distribution</h3>
                ${marginTotal === 0 ? '<p style="color:var(--text-muted); text-align:center; padding: 1rem 0;"><ion-icon name="stats-chart-outline" style="font-size:2rem; display:block; margin:0 auto 0.5rem; opacity:0.5;"></ion-icon>No sales data yet.<br><button type="button" class="btn btn-primary" data-action="navigate-sales" style="margin-top:0.75rem; font-size:0.8rem;"><ion-icon name="add-outline"></ion-icon> Add First Sale</button></p>' : `
                    <div>
                        <div style="display: flex; height: 24px; border-radius: 6px; overflow: hidden; margin-bottom: 0.75rem;">
                            ${marginDist.high > 0 ? `<div style="flex: ${marginDist.high}; background: var(--accent-success);" title="High (≥50%)"></div>` : ''}
                            ${marginDist.mid > 0 ? `<div style="flex: ${marginDist.mid}; background: var(--accent-warning);" title="Mid (20-50%)"></div>` : ''}
                            ${marginDist.low > 0 ? `<div style="flex: ${marginDist.low}; background: var(--accent-danger);" title="Low (<20%)"></div>` : ''}
                        </div>
                        <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; font-size: 0.8rem;">
                            <span><span style="display:inline-block;width:10px;height:10px;background:var(--accent-success);border-radius:2px;margin-right:4px;"></span>≥50%: ${marginDist.high}</span>
                            <span><span style="display:inline-block;width:10px;height:10px;background:var(--accent-warning);border-radius:2px;margin-right:4px;"></span>20-50%: ${marginDist.mid}</span>
                            <span><span style="display:inline-block;width:10px;height:10px;background:var(--accent-danger);border-radius:2px;margin-right:4px;"></span><20%: ${marginDist.low}</span>
                        </div>
                    </div>
                `}
            </div>

            <!-- 3. Sales by Type -->
            <div class="card">
                <h3 class="mb-4"><ion-icon name="pie-chart-outline"></ion-icon> Sales by Type</h3>
                ${totalSalesCount === 0 ? '<p style="color:var(--text-muted); text-align:center; padding: 1rem 0;"><ion-icon name="pie-chart-outline" style="font-size:2rem; display:block; margin:0 auto 0.5rem; opacity:0.5;"></ion-icon>No sales data yet.<br><button type="button" class="btn btn-primary" data-action="navigate-sales" style="margin-top:0.75rem; font-size:0.8rem;"><ion-icon name="add-outline"></ion-icon> Add First Sale</button></p>' : `
                    <div style="display: flex; align-items: center; gap: 2rem;">
                        <div style="position: relative; width: 120px; height: 120px;">
                            <svg viewBox="0 0 36 36" style="width: 100%; height: 100%; transform: rotate(-90deg);">
                                ${(() => {
                const colors = { Resale: '#635bff', Inventory: '#00d4aa', Hybrid: '#ffb347' };
                let offset = 0;
                return ['Resale', 'Inventory', 'Hybrid'].map(type => {
                    const pct = totalSalesCount > 0 ? (salesTypeCount[type] / totalSalesCount) * 100 : 0;
                    const circle = pct > 0 ? `<circle cx="18" cy="18" r="15.9" fill="transparent" stroke="${colors[type]}" stroke-width="4" stroke-dasharray="${pct} ${100 - pct}" stroke-dashoffset="${-offset}" />` : '';
                    offset += pct;
                    return circle;
                }).join('');
            })()}
                            </svg>
                        </div>
                        <div style="font-size: 0.85rem;">
                            <div style="margin-bottom: 0.4rem;"><span style="display:inline-block;width:10px;height:10px;background:#635bff;border-radius:2px;margin-right:6px;"></span>Resale: ${salesTypeCount.Resale} (${Math.round(salesTypeCount.Resale / totalSalesCount * 100)}%)</div>
                            <div style="margin-bottom: 0.4rem;"><span style="display:inline-block;width:10px;height:10px;background:#00d4aa;border-radius:2px;margin-right:6px;"></span>Inventory: ${salesTypeCount.Inventory} (${Math.round(salesTypeCount.Inventory / totalSalesCount * 100)}%)</div>
                            <div><span style="display:inline-block;width:10px;height:10px;background:#ffb347;border-radius:2px;margin-right:6px;"></span>Hybrid: ${salesTypeCount.Hybrid} (${Math.round(salesTypeCount.Hybrid / totalSalesCount * 100)}%)</div>
                        </div>
                    </div>
                `}
            </div>

            <!-- 4. Leaderboard + Export -->
            <div class="card leaderboard-card" style="border-left: 4px solid var(--accent-primary);">
                <h3 class="mb-4" style="color: var(--accent-primary)"><ion-icon name="trophy-outline"></ion-icon> Sales Leaderboard</h3>
                ${leaderboard.length === 0 ? '<p style="color:var(--text-muted); text-align:center; padding: 1rem 0;"><ion-icon name="trophy-outline" style="font-size:2rem; display:block; margin:0 auto 0.5rem; opacity:0.5;"></ion-icon>No sales team data yet.<br><button type="button" class="btn btn-primary" data-action="navigate-sales" style="margin-top:0.75rem; font-size:0.8rem;"><ion-icon name="add-outline"></ion-icon> Add Sale</button></p>' : `
                    <div class="leaderboard-list" style="margin-bottom: 1rem;">
                        ${(() => {
                const maxMrr = leaderboard[0]?.totalMrr || 1;
                return leaderboard.slice(0, 5).map((p, idx) => {
                    const medals = ['🥇', '🥈', '🥉'];
                    const medal = idx < 3 ? medals[idx] : `<span style="color:var(--text-muted)">${idx + 1}</span>`;
                    const barWidth = Math.round((p.totalMrr / maxMrr) * 100);
                    return `
                                    <div class="leaderboard-item" style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;">
                                        <div style="width:20px;text-align:center;">${medal}</div>
                                        <div style="flex:1;">
                                            <div style="font-size:0.85rem;">${escapeHtml(p.name)}</div>
                                            <div style="background:var(--border-color);height:4px;border-radius:2px;margin-top:2px;">
                                                <div style="width:${barWidth}%;height:100%;background:var(--accent-primary);border-radius:2px;"></div>
                                            </div>
                                        </div>
                                        <div style="font-size:0.8rem;color:var(--accent-success);font-weight:600;">$${p.totalMrr.toLocaleString()}</div>
                                    </div>`;
                }).join('');
            })()}
                    </div>
                `}
                <hr style="border-color: var(--border-color); margin: 0.5rem 0;">
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    <button type="button" class="btn btn-secondary" data-action="export-sales-csv" style="font-size: 0.75rem; padding: 0.35rem 0.6rem;">
                        <ion-icon name="document-outline"></ion-icon> Sales CSV
                    </button>
                    <button type="button" class="btn btn-secondary" data-action="export-inventory-csv" style="font-size: 0.75rem; padding: 0.35rem 0.6rem;">
                        <ion-icon name="cube-outline"></ion-icon> Inventory CSV
                    </button>
                </div>
            </div>
        </div>
    `;
    context.container.innerHTML = html;

    context.container.querySelectorAll('[data-action]').forEach(el => {
        el.addEventListener('click', () => {
            const action = el.dataset.action;
            if (action === 'navigate-expiring-sales') {
                context.navigateToView('sales', { filter: 'expiring' });
                return;
            }
            if (action === 'navigate-expiring-inventory') {
                context.navigateToView('inventory', { filter: 'expiring' });
                return;
            }
            if (action === 'navigate-sales') {
                context.navigateToView('sales');
                return;
            }
            if (action === 'export-sales-csv') {
                context.exportSalesToCSV();
                return;
            }
            if (action === 'export-inventory-csv') {
                context.exportInventoryToCSV();
            }
        });
    });
}
