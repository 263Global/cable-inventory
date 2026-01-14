/**
 * Sales Module (ES6)
 * Handles sales management: rendering, details view, editing
 * 
 * All functions receive `context` (the App object) as the first parameter
 * to access shared state and utilities.
 */

export function renderSales(context, filters = {}) {
    // Check if coming from Dashboard with an expiring filter
    if (context._pendingFilter === 'expiring' && !filters.status) {
        filters.status = 'Expiring';
        context._pendingFilter = null;
    }

    let data = window.Store.getSales();

    // Sort by contract start date (newest first), orders without date go to end
    data.sort((a, b) => {
        const dateA = a.dates?.start || '';
        const dateB = b.dates?.start || '';
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateB.localeCompare(dateA); // Descending (newest first)
    });

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
        if (statusValue === 'Expiring') {
            // Filter for Active orders expiring within 90 days
            const now = new Date();
            data = data.filter(item => {
                if (item.status !== 'Active') return false;
                if (!item.dates?.end) return false;
                const endDate = new Date(item.dates.end);
                const daysUntilExpiry = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
                return daysUntilExpiry >= 0 && daysUntilExpiry <= 90;
            });
        } else {
            data = data.filter(item => item.status === statusValue);
        }
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
    addBtn.onclick = () => context.openAddSalesModal();
    context.headerActions.appendChild(addBtn);

    const html = `
        <div class="filter-bar mb-4">
            <div class="search-box">
                <ion-icon name="search-outline"></ion-icon>
                <input type="text" id="sales-search" placeholder="Search Order ID or Customer..." value="${searchQuery}">
            </div>
            <select id="sales-salesperson-filter" class="form-control" style="max-width: 180px;">
                <option value="">All Salespersons</option>
                ${salespersons.map(s => `<option value="${s}" ${s === salespersonValue ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
            <select id="sales-status-filter" class="form-control" style="max-width: 160px;">
                <option value="">All Status</option>
                <option value="Active" ${statusValue === 'Active' ? 'selected' : ''}>Active</option>
                <option value="Pending" ${statusValue === 'Pending' ? 'selected' : ''}>Pending</option>
                <option value="Churned" ${statusValue === 'Churned' ? 'selected' : ''}>Churned</option>
                <option value="Expiring" ${statusValue === 'Expiring' ? 'selected' : ''}>Expiring Soon</option>
            </select>
            <div class="page-info" style="margin-left: auto; color: var(--text-muted); font-size: 0.85rem;">
                Showing ${totalItems > 0 ? startIndex + 1 : 0}-${endIndex} of ${totalItems}
            </div>
            ${!context._salesSelectionMode ? `
                <button class="btn btn-secondary" onclick="App.enterSalesSelectionMode()" style="font-size: 0.8rem; padding: 0.4rem 0.75rem;">
                    <ion-icon name="checkbox-outline"></ion-icon> Bulk
                </button>
            ` : ''}
        </div>
        ${context._salesSelectionMode ? `
        <div id="sales-bulk-toolbar" class="bulk-toolbar" style="display: flex; gap: 0.75rem; align-items: center; padding: 0.75rem 1rem; background: rgba(99, 91, 255, 0.1); border-radius: 8px; margin-bottom: 1rem;">
            <span style="font-weight: 600; color: var(--accent-primary);">
                <ion-icon name="checkbox-outline"></ion-icon>
                <span id="sales-selection-count">${context._selectedSales.size}</span> selected
            </span>
            <button class="btn btn-secondary" onclick="App.exportSelectedSales()" style="font-size: 0.8rem; padding: 0.4rem 0.75rem;" ${context._selectedSales.size === 0 ? 'disabled' : ''}>
                <ion-icon name="download-outline"></ion-icon> Export Selected
            </button>
            <button class="btn" onclick="App.exitSalesSelectionMode()" style="font-size: 0.8rem; padding: 0.4rem 0.75rem; margin-left: auto;">
                <ion-icon name="close-outline"></ion-icon> Exit Bulk Mode
            </button>
        </div>
        ` : ''}
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
            .row-selected { background: rgba(99, 91, 255, 0.12) !important; }
            .sales-row-checkbox, #sales-select-all { cursor: pointer; width: 16px; height: 16px; }
        </style>
        <div class="table-container">
            <table class="sales-table">
                <thead>
                    <tr>
                        ${context._salesSelectionMode ? '<th style="width: 40px; text-align: center;"><input type="checkbox" id="sales-select-all" title="Select All"></th>' : ''}
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
                    ${paginatedData.length === 0 ? `<tr><td colspan="${context._salesSelectionMode ? 11 : 10}" style="text-align:center; color:var(--text-muted); padding:2rem;">No sales orders match your filters.</td></tr>` : ''}
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
                        <tr class="${context._selectedSales.has(item.salesOrderId) ? 'row-selected' : ''}">
                            ${context._salesSelectionMode ? `<td style="text-align: center;"><input type="checkbox" class="sales-row-checkbox" data-id="${item.salesOrderId}" ${context._selectedSales.has(item.salesOrderId) ? 'checked' : ''}></td>` : ''}
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
                            <td class="col-revenue font-mono" style="text-align:right; color: var(--accent-success)">$${mrr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td class="col-margin font-mono" style="text-align:right; color: ${margin >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)'}">$${margin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
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
    context.container.innerHTML = html;

    // Add filter event listeners
    const applyFilters = (page = 1) => {
        const search = document.getElementById('sales-search')?.value || '';
        const salesperson = document.getElementById('sales-salesperson-filter')?.value || '';
        const status = document.getElementById('sales-status-filter')?.value || '';
        context.headerActions.innerHTML = '';
        context.renderSales({ search, salesperson, status, page });
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

    // Checkbox event listeners
    const selectAllCheckbox = document.getElementById('sales-select-all');
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = paginatedData.length > 0 && paginatedData.every(item => context._selectedSales.has(item.salesOrderId));
        selectAllCheckbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                paginatedData.forEach(item => context._selectedSales.add(item.salesOrderId));
            } else {
                paginatedData.forEach(item => context._selectedSales.delete(item.salesOrderId));
            }
            context.updateSalesBulkToolbar();
            document.querySelectorAll('.sales-row-checkbox').forEach(cb => {
                cb.checked = e.target.checked;
                cb.closest('tr').classList.toggle('row-selected', e.target.checked);
            });
        });
    }

    document.querySelectorAll('.sales-row-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => {
            const id = e.target.dataset.id;
            if (e.target.checked) {
                context._selectedSales.add(id);
            } else {
                context._selectedSales.delete(id);
            }
            e.target.closest('tr').classList.toggle('row-selected', e.target.checked);
            context.updateSalesBulkToolbar();
            // Update select-all checkbox state
            if (selectAllCheckbox) {
                selectAllCheckbox.checked = paginatedData.every(item => context._selectedSales.has(item.salesOrderId));
            }
        });
    });
}

export function viewSalesDetails(context, salesOrderId) {
    const order = window.Store.getSales().find(s => s.salesOrderId === salesOrderId);
    if (!order) return;

    // Use unified calculation engine
    const computed = computeOrderFinancials(order);
    const salesModel = order.salesModel || 'Lease';
    const salesType = order.salesType || 'Resale';
    const term = order.dates?.term || 12;

    // Revenue display - handle both Lease and IRU
    const isIru = salesModel === 'IRU';
    const mrrDisplay = isIru ? computed.monthlyRevenue : (order.financials?.mrcSales || 0);
    const nrcDisplay = isIru ? (order.financials?.otc || 0) : (order.financials?.nrcSales || 0);
    const revenueLabel1 = isIru ? 'Monthly O&M Revenue' : 'Monthly Revenue (MRR)';
    const revenueLabel2 = isIru ? 'OTC Revenue' : 'One-time Revenue (NRC)';

    const statusClass = order.status === 'Active' ? 'badge-success' : (order.status === 'Pending' ? 'badge-warning' : 'badge-danger');

    // Calculate costs display - MRC
    const cableCostMrc = order.costs?.cableCost?.mrc || order.costs?.cable?.mrc || 0;
    const backhaulAMrc = order.costs?.backhaulA?.mrc || order.costs?.backhaul?.aEnd?.monthly || 0;
    const backhaulZMrc = order.costs?.backhaulZ?.mrc || order.costs?.backhaul?.zEnd?.monthly || 0;
    const xcAMrc = order.costs?.crossConnectA?.mrc || order.costs?.crossConnect?.aEnd?.monthly || 0;
    const xcZMrc = order.costs?.crossConnectZ?.mrc || order.costs?.crossConnect?.zEnd?.monthly || 0;
    const totalCostsMrc = cableCostMrc + backhaulAMrc + backhaulZMrc + xcAMrc + xcZMrc;

    // Calculate costs display - NRC
    const cableCostNrc = order.costs?.cableCost?.nrc || order.costs?.cable?.nrc || 0;
    const backhaulANrc = order.costs?.backhaulA?.nrc || 0;
    const backhaulZNrc = order.costs?.backhaulZ?.nrc || 0;
    const xcANrc = order.costs?.crossConnectA?.nrc || 0;
    const xcZNrc = order.costs?.crossConnectZ?.nrc || 0;
    const totalCostsNrc = cableCostNrc + backhaulANrc + backhaulZNrc + xcANrc + xcZNrc;

    // Contract totals
    const totalRevenue = (mrrDisplay * term) + nrcDisplay;
    const totalCost = (totalCostsMrc * term) + totalCostsNrc;
    const totalProfit = totalRevenue - totalCost;
    const totalMargin = totalRevenue > 0 ? (totalProfit / totalRevenue * 100).toFixed(1) : 0;

    // Annual figures
    const annualRevenue = mrrDisplay * 12;
    const annualCost = totalCostsMrc * 12;
    const annualProfit = annualRevenue - annualCost;

    // Use computed values for margin
    const grossMargin = computed.monthlyProfit;
    const marginPercent = computed.marginPercent.toFixed(1);
    const marginColor = grossMargin >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)';
    const totalProfitColor = totalProfit >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)';

    // Build profitability section - different for IRU Resale
    let profitabilityHtml = '';
    if (computed.isIruResale) {
        const firstMonthMargin = computed.firstMonthMargin?.toFixed(1) || '0.0';
        const recurringMargin = computed.recurringMargin?.toFixed(1) || '0.0';
        const firstMonthProfit = computed.firstMonthProfit || 0;
        profitabilityHtml = `
            <tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">First Month Profit</td><td class="font-mono" style="color:${firstMonthProfit >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)'}; font-weight:600">$${firstMonthProfit.toLocaleString()}</td></tr>
            <tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">First Month Margin</td><td class="font-mono" style="color:${marginColor}; font-weight:600">${firstMonthMargin}%</td></tr>
            <tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">Recurring Profit</td><td class="font-mono" style="color:${marginColor}; font-weight:600">$${grossMargin.toLocaleString()}</td></tr>
            <tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">Recurring Margin</td><td class="font-mono" style="color:${marginColor}; font-weight:600">${recurringMargin}%</td></tr>
        `;
    } else {
        profitabilityHtml = `
            <tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">Monthly Profit</td><td class="font-mono" style="color:${marginColor}; font-weight:600">$${grossMargin.toLocaleString()}</td></tr>
            <tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">Monthly Margin</td><td class="font-mono" style="color:${marginColor}; font-weight:600">${marginPercent}%</td></tr>
        `;
    }

    // Location info
    const aEndCity = order.locationAEnd?.city || order.aEndCity || '-';
    const aEndPop = order.locationAEnd?.pop || order.aEndPop || '-';
    const zEndCity = order.locationZEnd?.city || order.zEndCity || '-';
    const zEndPop = order.locationZEnd?.pop || order.zEndPop || '-';

    const sectionStyle = 'background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem 1.25rem; margin-bottom: 1rem; box-shadow: 0 2px 8px rgba(0,0,0,0.08);';
    const highlightStyle = 'background: linear-gradient(135deg, var(--bg-card) 0%, var(--bg-secondary) 100%); border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem 1.25rem; margin-bottom: 1rem; box-shadow: 0 2px 8px rgba(0,0,0,0.08);';

    const detailsHtml = `
        <!-- Contract Summary - Highlighted -->
        <div style="${highlightStyle}">
            <h4 style="color: var(--accent-primary); margin-bottom: 1rem; font-size: 0.9rem; display: flex; align-items: center; gap: 0.5rem;">
                <ion-icon name="briefcase-outline"></ion-icon> Contract Summary
            </h4>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; text-align: center;">
                <div>
                    <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.25rem;">Total Revenue</div>
                    <div class="font-mono" style="font-size: 1.25rem; font-weight: 700; color: var(--accent-success);">$${totalRevenue.toLocaleString()}</div>
                </div>
                <div>
                    <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.25rem;">Total Cost</div>
                    <div class="font-mono" style="font-size: 1.25rem; font-weight: 700; color: var(--accent-danger);">$${totalCost.toLocaleString()}</div>
                </div>
                <div>
                    <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.25rem;">Total Profit</div>
                    <div class="font-mono" style="font-size: 1.25rem; font-weight: 700; color: ${totalProfitColor};">$${totalProfit.toLocaleString()}</div>
                </div>
                <div>
                    <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.25rem;">Contract Margin</div>
                    <div class="font-mono" style="font-size: 1.25rem; font-weight: 700; color: ${totalProfitColor};">${totalMargin}%</div>
                </div>
            </div>
        </div>

        <div class="grid-2" style="gap:1.5rem; align-items: start;">
            <div>
                <!-- Order Information -->
                <div style="${sectionStyle}">
                    <h4 style="color: var(--accent-primary); margin-bottom: 0.75rem; font-size: 0.9rem;">Order Information</h4>
                    <table style="width:100%;">
                        <tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">Order ID</td><td class="font-mono">${order.salesOrderId}</td></tr>
                        <tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">Customer</td><td style="font-weight:600">${order.customerName}</td></tr>
                        <tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">Salesperson</td><td>${order.salesperson || '-'}</td></tr>
                        <tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">Sales Model</td><td>${salesModel}</td></tr>
                        <tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">Sales Type</td><td>${salesType}</td></tr>
                        <tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">Capacity</td><td class="font-mono" style="color:var(--accent-primary)">${order.capacity?.value || '-'} ${order.capacity?.unit || ''}</td></tr>
                        <tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">Status</td><td><span class="badge ${statusClass}">${order.status}</span></td></tr>
                        <tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">Linked Resource</td><td class="font-mono">${order.inventoryLink || '-'}</td></tr>
                    </table>
                </div>

                <!-- Contract Period -->
                <div style="${sectionStyle}">
                    <h4 style="color: var(--accent-secondary); margin-bottom: 0.75rem; font-size: 0.9rem;">Contract Period</h4>
                    <table style="width:100%;">
                        <tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">Term</td><td class="font-mono">${term} months</td></tr>
                        <tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">Start Date</td><td>${order.dates?.start || '-'}</td></tr>
                        <tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">End Date</td><td>${order.dates?.end || '-'}</td></tr>
                    </table>
                </div>

                <!-- Route / Location -->
                <div style="${sectionStyle}">
                    <h4 style="color: var(--accent-warning); margin-bottom: 0.75rem; font-size: 0.9rem;">Route</h4>
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <div style="flex: 1; text-align: center; padding: 0.75rem; background: var(--bg-secondary); border-radius: 6px;">
                            <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">A-End</div>
                            <div style="font-weight: 600; margin-top: 0.25rem;">${aEndCity}</div>
                            <div style="font-size: 0.8rem; color: var(--text-muted);">${aEndPop}</div>
                        </div>
                        <ion-icon name="arrow-forward-outline" style="font-size: 1.5rem; color: var(--text-muted);"></ion-icon>
                        <div style="flex: 1; text-align: center; padding: 0.75rem; background: var(--bg-secondary); border-radius: 6px;">
                            <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Z-End</div>
                            <div style="font-weight: 600; margin-top: 0.25rem;">${zEndCity}</div>
                            <div style="font-size: 0.8rem; color: var(--text-muted);">${zEndPop}</div>
                        </div>
                    </div>
                </div>
            </div>
            <div>
                <!-- Revenue -->
                <div style="${sectionStyle}">
                    <h4 style="color: var(--accent-success); margin-bottom: 0.75rem; font-size: 0.9rem;">Revenue</h4>
                    <table style="width:100%;">
                        <tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">${revenueLabel1}</td><td class="font-mono" style="color:var(--accent-success)">$${mrrDisplay.toLocaleString()}</td></tr>
                        <tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">${revenueLabel2}</td><td class="font-mono">$${nrcDisplay.toLocaleString()}</td></tr>
                        <tr style="border-top: 1px solid var(--border-color)"><td style="padding:0.5rem 0; color:var(--text-muted); font-size:0.85rem;">Annual Revenue</td><td class="font-mono" style="font-weight:600">$${annualRevenue.toLocaleString()}</td></tr>
                    </table>
                </div>

                <!-- Cost Breakdown MRC -->
                <div style="${sectionStyle}">
                    <h4 style="color: var(--accent-danger); margin-bottom: 0.75rem; font-size: 0.9rem;">Monthly Costs (MRC)</h4>
                    <table style="width:100%;">
                        <tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">Cable Cost</td><td class="font-mono">$${cableCostMrc.toLocaleString()}</td></tr>
                        <tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">Backhaul A-End</td><td class="font-mono">$${backhaulAMrc.toLocaleString()}</td></tr>
                        <tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">Backhaul Z-End</td><td class="font-mono">$${backhaulZMrc.toLocaleString()}</td></tr>
                        <tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">Cross Connect A</td><td class="font-mono">$${xcAMrc.toLocaleString()}</td></tr>
                        <tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">Cross Connect Z</td><td class="font-mono">$${xcZMrc.toLocaleString()}</td></tr>
                        <tr style="border-top: 1px solid var(--border-color)"><td style="padding:0.5rem 0; font-weight:600; font-size:0.85rem;">Total MRC</td><td class="font-mono" style="color:var(--accent-danger); font-weight:600">$${totalCostsMrc.toLocaleString()}</td></tr>
                    </table>
                </div>

                <!-- Cost Breakdown NRC -->
                ${totalCostsNrc > 0 ? `
                <div style="${sectionStyle}">
                    <h4 style="color: var(--accent-warning); margin-bottom: 0.75rem; font-size: 0.9rem;">One-time Costs (NRC)</h4>
                    <table style="width:100%;">
                        ${cableCostNrc > 0 ? `<tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">Cable NRC</td><td class="font-mono">$${cableCostNrc.toLocaleString()}</td></tr>` : ''}
                        ${backhaulANrc > 0 ? `<tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">Backhaul A NRC</td><td class="font-mono">$${backhaulANrc.toLocaleString()}</td></tr>` : ''}
                        ${backhaulZNrc > 0 ? `<tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">Backhaul Z NRC</td><td class="font-mono">$${backhaulZNrc.toLocaleString()}</td></tr>` : ''}
                        ${xcANrc > 0 ? `<tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">XC A NRC</td><td class="font-mono">$${xcANrc.toLocaleString()}</td></tr>` : ''}
                        ${xcZNrc > 0 ? `<tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">XC Z NRC</td><td class="font-mono">$${xcZNrc.toLocaleString()}</td></tr>` : ''}
                        <tr style="border-top: 1px solid var(--border-color)"><td style="padding:0.5rem 0; font-weight:600; font-size:0.85rem;">Total NRC</td><td class="font-mono" style="color:var(--accent-warning); font-weight:600">$${totalCostsNrc.toLocaleString()}</td></tr>
                    </table>
                </div>
                ` : ''}

                <!-- Profitability -->
                <div style="${sectionStyle}">
                    <h4 style="color: var(--accent-secondary); margin-bottom: 0.75rem; font-size: 0.9rem;">Profitability</h4>
                    <table style="width:100%;">
                        ${profitabilityHtml}
                        <tr style="border-top: 1px solid var(--border-color)"><td style="padding:0.5rem 0; color:var(--text-muted); font-size:0.85rem;">Annual Profit</td><td class="font-mono" style="font-weight:600; color: ${annualProfit >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)'}">$${annualProfit.toLocaleString()}</td></tr>
                    </table>
                </div>
            </div>
        </div>

        <!-- Notes -->
        ${order.notes ? `
        <div style="${sectionStyle}">
            <h4 style="color: var(--text-muted); margin-bottom: 0.5rem; font-size: 0.9rem;">Notes</h4>
            <p style="margin: 0; font-size: 0.9rem; line-height: 1.5;">${order.notes}</p>
        </div>
        ` : ''}
    `;

    context.openModal(`Sales Order: ${order.salesOrderId}`, detailsHtml, null, true);
}

export function editSalesOrder(context, salesOrderId) {
    // Use the full form modal with edit mode support
    context.openAddSalesModal(salesOrderId);
}
