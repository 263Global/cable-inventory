/**
 * Sales list view rendering and event wiring.
 */

// HTML escape utility to prevent XSS
const escapeHtml = (str) => {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

const { getSalesStatusBadgeClass, computeSalesStatus } = window.SalesStatus;
const { isExpiringWithin } = window.StatusUi;
const openImportModalWithFallback = (entityType) => {
    if (window.CsvImport?.openImportModal) {
        window.CsvImport.openImportModal(entityType);
        return;
    }
    alert('Import module unavailable. Please refresh and try again.');
};

export function renderSalesList(context, filters = {}) {
    // Check if coming from Dashboard with an expiring filter
    if (context._pendingFilter === 'expiring' && !filters.status) {
        filters.status = 'Expiring';
        context._pendingFilter = null;
    }

    let data = window.Store.getSales().slice();
    const now = new Date();
    const getEffectiveStatus = (item) => computeSalesStatus(item.dates?.start, item.dates?.end, now, item.terminatedAt);

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
            data = data.filter(item => {
                const effectiveStatus = getEffectiveStatus(item);
                if (effectiveStatus !== 'Active') return false;
                return isExpiringWithin(item.dates?.end, 90, now, item.dates?.start);
            });
        } else {
            data = data.filter(item => getEffectiveStatus(item) === statusValue);
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

    // Add Import button
    const importBtn = document.createElement('button');
    importBtn.className = 'btn btn-secondary';
    importBtn.innerHTML = '<ion-icon name="cloud-upload-outline"></ion-icon> Import';
    importBtn.onclick = () => openImportModalWithFallback('sales');
    context.headerActions.appendChild(importBtn);

    // Add "Add Sale" button
    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-primary';
    addBtn.innerHTML = '<ion-icon name="add-outline"></ion-icon> New Sale';
    addBtn.onclick = () => context.openAddSalesModal();
    context.headerActions.appendChild(addBtn);

    const safeSearchQuery = escapeHtml(searchQuery);
    const html = `
        <div class="filter-bar mb-4">
            <div class="search-box">
                <ion-icon name="search-outline"></ion-icon>
                <input type="text" id="sales-search" placeholder="Search Order ID or Customer..." value="${safeSearchQuery}">
            </div>
            <select id="sales-salesperson-filter" class="form-control" style="max-width: 180px;">
                <option value="">All Salespersons</option>
                ${salespersons.map(s => {
        const safeSalesperson = escapeHtml(s);
        return `<option value="${safeSalesperson}" ${s === salespersonValue ? 'selected' : ''}>${safeSalesperson}</option>`;
    }).join('')}
            </select>
            <select id="sales-status-filter" class="form-control" style="max-width: 160px;">
                <option value="">All Status</option>
                <option value="Active" ${statusValue === 'Active' ? 'selected' : ''}>Active</option>
                <option value="Pending" ${statusValue === 'Pending' ? 'selected' : ''}>Pending</option>
                <option value="Expired" ${statusValue === 'Expired' ? 'selected' : ''}>Expired</option>
                <option value="Terminated" ${statusValue === 'Terminated' ? 'selected' : ''}>Terminated</option>
                <option value="Expiring" ${statusValue === 'Expiring' ? 'selected' : ''}>Expiring Soon</option>
            </select>
            <div class="page-info" style="margin-left: auto; color: var(--text-muted); font-size: 0.85rem;">
                Showing ${totalItems > 0 ? startIndex + 1 : 0}-${endIndex} of ${totalItems}
            </div>
            ${!context._salesSelectionMode ? `
                <button type="button" class="btn btn-secondary" data-action="enter-sales-selection-mode" style="font-size: 0.8rem; padding: 0.4rem 0.75rem;">
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
            <button type="button" class="btn btn-secondary" data-action="export-selected-sales" style="font-size: 0.8rem; padding: 0.4rem 0.75rem;" ${context._selectedSales.size === 0 ? 'disabled' : ''}>
                <ion-icon name="download-outline"></ion-icon> Export Selected
            </button>
            <button type="button" class="btn" data-action="exit-sales-selection-mode" style="font-size: 0.8rem; padding: 0.4rem 0.75rem; margin-left: auto;">
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
        const effectiveStatus = getEffectiveStatus(item);

        // Status badge
        const statusClass = getSalesStatusBadgeClass(effectiveStatus);

        // Type icons
        const typeClass = salesType === 'Resale' ? 'type-resale' :
            salesType === 'Inventory' ? 'type-inventory' :
                salesType === 'Hybrid' ? 'type-hybrid' : 'type-swap';
        const typeIcon = salesType === 'Resale' ? '🔄' :
            salesType === 'Inventory' ? '📦' :
                salesType === 'Hybrid' ? '🔁' : '🔀';

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
                            ${context._salesSelectionMode ? `<td style="text-align: center;"><input type="checkbox" class="sales-row-checkbox" data-id="${escapeHtml(item.salesOrderId)}" ${context._selectedSales.has(item.salesOrderId) ? 'checked' : ''}></td>` : ''}
                            <td class="font-mono order-id-cell">${escapeHtml(item.salesOrderId)}</td>
                            <td>
                                <div class="customer-name" style="font-weight:600" title="${escapeHtml(item.customerName)}">${escapeHtml(item.customerName)}</div>
                                <div class="mobile-capacity-info" style="font-size:0.75rem; color:var(--accent-primary); margin-top:0.25rem; font-weight:500;">📦 ${item.capacity?.value || '-'} ${item.capacity?.unit || 'Gbps'}</div>
                                ${item.inventoryLink ? `<div class="inventory-link">🔗 ${escapeHtml(item.inventoryLink)}</div>` : ''}
                            </td>
                            <td>
                                <span class="type-icon ${typeClass}">${typeIcon} ${salesType}</span>
                                <div style="font-size:0.7rem; color:var(--text-muted); margin-top:2px;">${salesModel}</div>
                            </td>
                            <td class="font-mono" style="color: var(--accent-primary)">${item.capacity?.value || '-'} ${item.capacity?.unit || ''}</td>
                            <td><span class="badge ${statusClass}">${effectiveStatus}</span></td>
                            <td class="col-revenue font-mono" style="text-align:right; color: var(--accent-success)">$${mrr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td class="col-margin font-mono" style="text-align:right; color: ${margin >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)'}">$${margin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td class="col-margin-percent" style="text-align:right">${marginPercentCell}</td>
                            <td class="col-salesperson" style="font-size:0.85rem; color:var(--text-muted)">${escapeHtml(item.salesperson || '-')}</td>
                            <td>
                                <div class="flex gap-4">
                                    <button type="button" class="btn btn-secondary" data-action="view-sales-order" data-sales-order-id="${escapeHtml(item.salesOrderId)}" style="padding:0.4rem" title="View">
                                        <ion-icon name="eye-outline"></ion-icon>
                                    </button>
                                    <button type="button" class="btn btn-primary" data-action="edit-sales-order" data-sales-order-id="${escapeHtml(item.salesOrderId)}" style="padding:0.4rem" title="Edit">
                                        <ion-icon name="create-outline"></ion-icon>
                                    </button>
                                    <button type="button" class="btn btn-warning" data-action="renew-sales-order" data-sales-order-id="${escapeHtml(item.salesOrderId)}" style="padding:0.4rem" title="Renew">
                                        <ion-icon name="refresh-outline"></ion-icon>
                                    </button>
                                    ${effectiveStatus === 'Active' ? `<button type="button" class="btn btn-danger" data-action="terminate-sales-order" data-sales-order-id="${escapeHtml(item.salesOrderId)}" style="padding:0.4rem; opacity:0.85;" title="Terminate">
                                        <ion-icon name="close-circle-outline"></ion-icon>
                                    </button>` : ''}
                                    <button type="button" class="btn btn-danger" data-action="delete-sales-order" data-sales-order-id="${escapeHtml(item.salesOrderId)}" style="padding:0.4rem" title="Delete">
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

    context.container.querySelectorAll('[data-action="enter-sales-selection-mode"]').forEach(btn => {
        btn.addEventListener('click', () => context.enterSalesSelectionMode());
    });
    context.container.querySelectorAll('[data-action="export-selected-sales"]').forEach(btn => {
        btn.addEventListener('click', () => context.exportSelectedSales());
    });
    context.container.querySelectorAll('[data-action="exit-sales-selection-mode"]').forEach(btn => {
        btn.addEventListener('click', () => context.exitSalesSelectionMode());
    });
    context.container.querySelectorAll('[data-action="view-sales-order"]').forEach(btn => {
        btn.addEventListener('click', () => context.viewSalesDetails(btn.dataset.salesOrderId || ''));
    });
    context.container.querySelectorAll('[data-action="edit-sales-order"]').forEach(btn => {
        btn.addEventListener('click', () => context.editSalesOrder(btn.dataset.salesOrderId || ''));
    });
    context.container.querySelectorAll('[data-action="renew-sales-order"]').forEach(btn => {
        btn.addEventListener('click', () => context.openRenewModal(btn.dataset.salesOrderId || ''));
    });
    context.container.querySelectorAll('[data-action="terminate-sales-order"]').forEach(btn => {
        btn.addEventListener('click', () => context.openTerminateModal(btn.dataset.salesOrderId || ''));
    });
    context.container.querySelectorAll('[data-action="delete-sales-order"]').forEach(btn => {
        btn.addEventListener('click', () => context.deleteSalesOrderWithConfirm(btn.dataset.salesOrderId || ''));
    });

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
        // Visual indicator for active filter
        statusFilter.classList.toggle('filter-active', statusFilter.value !== '');
        statusFilter.addEventListener('change', () => {
            statusFilter.classList.toggle('filter-active', statusFilter.value !== '');
        });
    }
    if (salespersonFilter) {
        salespersonFilter.classList.toggle('filter-active', salespersonFilter.value !== '');
        salespersonFilter.addEventListener('change', () => {
            salespersonFilter.classList.toggle('filter-active', salespersonFilter.value !== '');
        });
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
