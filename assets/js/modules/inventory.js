/**
 * Inventory Module (ES6)
 * Handles inventory management: rendering, details view, form handling
 * 
 * All functions receive `context` (the App object) as the first parameter
 * to access shared state and utilities.
 */

import { renderSearchableDropdown, initSearchableDropdown, renderSimpleDropdown, initSimpleDropdown } from './searchableDropdown.js';

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

const escapeJsString = (str) => {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/\r/g, '\\r')
        .replace(/\n/g, '\\n');
};

const resolveSupplierName = (supplierId, fallback = '') => {
    if (!supplierId) return fallback || '';
    const supplier = window.Store.getSuppliers().find(s => s.id === supplierId);
    return supplier?.short_name || supplier?.full_name || fallback || supplierId;
};

const {
    buildSalesIndex,
    computeInventoryStatus,
    getInventoryDisplayMetrics
} = window.InventoryStatus;

const { isExpiringWithin } = window.StatusUi;

export function renderInventory(context, searchQuery = '', page = 1, statusFilter = '') {
    // Check if coming from Dashboard with an expiring filter
    if (context._pendingFilter === 'expiring' && !statusFilter) {
        statusFilter = 'Expiring';
        context._pendingFilter = null;
    }

    const ITEMS_PER_PAGE = 20;
    let data = window.Store.getInventory();
    const allSales = window.Store.getSales();
    const { byResourceId: salesByResourceId, soldByResourceId } = buildSalesIndex(allSales);
    const now = new Date();

    // Apply search filter
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        data = data.filter(item =>
            item.resourceId.toLowerCase().includes(query) ||
            (item.cableSystem && item.cableSystem.toLowerCase().includes(query))
        );
    }

    // Apply status filter
    if (statusFilter) {
        if (statusFilter === 'Expiring') {
            // For Expiring, we need to use computed status logic
            data = data.filter(item => {
                const totalSoldCapacity = soldByResourceId.get(item.resourceId) || 0;
                const { startDate, endDate } = computeInventoryStatus(item, totalSoldCapacity, now);
                return isExpiringWithin(endDate, 90, now, startDate);
            });
        } else {
            // For other filters, need to compute status and compare
            data = data.filter(item => {
                const totalSoldCapacity = soldByResourceId.get(item.resourceId) || 0;
                const { calculatedStatus } = computeInventoryStatus(item, totalSoldCapacity, now);
                return calculatedStatus === statusFilter;
            });
        }
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
    addBtn.onclick = () => context.openInventoryModal();
    context.headerActions.appendChild(addBtn);

    const safeSearchQuery = escapeHtml(searchQuery);
    const html = `
        <div class="filter-bar mb-4">
            <div class="search-box">
                <ion-icon name="search-outline"></ion-icon>
                <input type="text" id="inventory-search" placeholder="Search Resource ID or Cable..." value="${safeSearchQuery}">
            </div>
            <select id="inventory-status-filter" class="form-control" style="max-width: 160px;">
                <option value="">All Status</option>
                <option value="Available" ${statusFilter === 'Available' ? 'selected' : ''}>Available</option>
                <option value="Draft" ${statusFilter === 'Draft' ? 'selected' : ''}>Draft</option>
                <option value="Sold Out" ${statusFilter === 'Sold Out' ? 'selected' : ''}>Sold Out</option>
                <option value="Expired" ${statusFilter === 'Expired' ? 'selected' : ''}>Expired</option>
                <option value="Expiring" ${statusFilter === 'Expiring' ? 'selected' : ''}>Expiring Soon</option>
            </select>
            <div class="page-info" style="margin-left: auto; color: var(--text-muted); font-size: 0.85rem;">
                Showing ${totalItems > 0 ? startIndex + 1 : 0}-${endIndex} of ${totalItems}
            </div>
            ${!context._inventorySelectionMode ? `
                <button class="btn btn-secondary" onclick="App.enterInventorySelectionMode()" style="font-size: 0.8rem; padding: 0.4rem 0.75rem;">
                    <ion-icon name="checkbox-outline"></ion-icon> Bulk
                </button>
            ` : ''}
        </div>
        ${context._inventorySelectionMode ? `
        <div id="inventory-bulk-toolbar" class="bulk-toolbar" style="display: flex; gap: 0.75rem; align-items: center; padding: 0.75rem 1rem; background: rgba(99, 91, 255, 0.1); border-radius: 8px; margin-bottom: 1rem;">
            <span style="font-weight: 600; color: var(--accent-primary);">
                <ion-icon name="checkbox-outline"></ion-icon>
                <span id="inventory-selection-count">${context._selectedInventory.size}</span> selected
            </span>
            <button class="btn btn-secondary" onclick="App.exportSelectedInventory()" style="font-size: 0.8rem; padding: 0.4rem 0.75rem;" ${context._selectedInventory.size === 0 ? 'disabled' : ''}>
                <ion-icon name="download-outline"></ion-icon> Export Selected
            </button>
            <button class="btn" onclick="App.exitInventorySelectionMode()" style="font-size: 0.8rem; padding: 0.4rem 0.75rem; margin-left: auto;">
                <ion-icon name="close-outline"></ion-icon> Exit Bulk Mode
            </button>
        </div>
        ` : ''}
        <style>
            .inventory-table tbody tr:hover {background: rgba(99, 91, 255, 0.08); }
            .row-selected { background: rgba(99, 91, 255, 0.12) !important; }
            .inventory-row-checkbox, #inventory-select-all { cursor: pointer; width: 16px; height: 16px; }
        </style>
        <div class="table-container">
            <table class="inventory-table">
                <thead>
                                                                                                                                    <tr>
                                                                                                                                        ${context._inventorySelectionMode ? '<th style="width: 40px; text-align: center;"><input type="checkbox" id="inventory-select-all" title="Select All"></th>' : ''}
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
        const linkedSales = salesByResourceId.get(item.resourceId) || [];

        // Calculate total sold capacity
        const totalSoldCapacity = soldByResourceId.get(item.resourceId) || 0;

        // Auto-calculate status based on dates and usage
        const {
            calculatedStatus,
            totalCapacity,
            usagePercent,
            statusBadgeClass,
            progressColor
        } = getInventoryDisplayMetrics(item, totalSoldCapacity, now);

        return `
                        <tr style="${calculatedStatus === 'Expired' ? 'opacity: 0.6;' : ''}" class="${context._selectedInventory.has(item.resourceId) ? 'row-selected' : ''}">
                            ${context._inventorySelectionMode ? `<td style="text-align: center;"><input type="checkbox" class="inventory-row-checkbox" data-id="${escapeHtml(item.resourceId)}" ${context._selectedInventory.has(item.resourceId) ? 'checked' : ''}></td>` : ''}
                            <td class="font-mono" style="color: var(--accent-secondary); white-space: nowrap;">${escapeHtml(item.resourceId)}</td>
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
                                <div style="font-weight:500">${escapeHtml(item.acquisition?.type || 'Purchased')}</div>
                                <div style="font-size:0.75rem; color:var(--text-muted)">${escapeHtml(item.acquisition?.ownership || '')}</div>
                            </td>
                            <td>
                                <div style="font-weight:600">${escapeHtml(item.cableSystem)}</div>
                                ${item.protection === 'Protected' && item.protectionCableSystem ? `<div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.1rem;">${escapeHtml(item.protectionCableSystem)}</div>` : ''}
                                <div style="font-size:0.8em; color:var(--text-muted)">
                                    ${item.capacity?.value || 0} ${item.capacity?.unit || 'Gbps'}
                                </div>
                                <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.2rem;">
                                    ${escapeHtml(item.segmentType || '')} (${escapeHtml(item.protection || '')})
                                </div>
                                <div class="mobile-capacity-info" style="font-size:0.75rem; color:var(--accent-warning); margin-top:0.35rem; font-weight:500;">
                                    📊 已售 ${totalSoldCapacity}/${totalCapacity} ${item.capacity?.unit || 'Gbps'}
                                </div>
                            </td>
                            <td class="col-cost-info">
                                ${item.acquisition?.ownership !== 'IRU' ? `<div class="font-mono">MRC: $${(item.financials?.mrc || 0).toLocaleString()}</div>` : ''}
                                <div class="font-mono" style="font-size:0.8em; color:var(--text-muted)">${item.acquisition?.ownership === 'IRU' ? 'OTC' : 'NRC'}: $${(item.acquisition?.ownership === 'IRU' ? item.financials?.otc : item.financials?.nrc || 0).toLocaleString()}</div>
                                <div style="font-size:0.75rem; color:var(--accent-danger); margin-top:0.2rem;">Expires: ${escapeHtml(item.dates?.end || 'N/A')}</div>
                            </td>
                            <td class="col-location" style="font-size:0.85rem">
                                <div><strong style="color:var(--accent-primary)">A:</strong> ${escapeHtml(item.location?.aEnd?.pop || '-')} (${escapeHtml(item.location?.aEnd?.city || '')})</div>
                                <div><strong style="color:var(--accent-secondary)">Z:</strong> ${escapeHtml(item.location?.zEnd?.pop || '-')} (${escapeHtml(item.location?.zEnd?.city || '')})</div>
                            </td>
                            <td>
                                <div class="flex gap-4">
                                    <button class="btn btn-secondary" style="padding:0.4rem" onclick="App.viewInventoryDetails('${escapeJsString(item.resourceId)}')" title="View">
                                        <ion-icon name="eye-outline"></ion-icon>
                                    </button>
                                    <button class="btn btn-primary" style="padding:0.4rem" onclick="App.openInventoryModal('${escapeJsString(item.resourceId)}')" title="Edit">
                                        <ion-icon name="create-outline"></ion-icon>
                                    </button>
                                    <button class="btn btn-danger" style="padding:0.4rem" onclick="App.deleteInventoryWithConfirm('${escapeJsString(item.resourceId)}')" title="Delete">
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
    context.container.innerHTML = html;

    // Add filter event listeners
    const searchInput = document.getElementById('inventory-search');
    const statusFilterEl = document.getElementById('inventory-status-filter');

    const applyFilters = (page = 1) => {
        const search = searchInput?.value || '';
        const status = statusFilterEl?.value || '';
        context.headerActions.innerHTML = '';
        context.renderInventory(search, page, status);
    };

    if (searchInput) {
        searchInput.addEventListener('input', () => applyFilters(1));
        if (searchQuery) {
            searchInput.focus();
            searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
        }
    }

    if (statusFilterEl) {
        statusFilterEl.addEventListener('change', () => applyFilters(1));
    }

    // Add pagination event listeners
    document.querySelectorAll('.pagination-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetPage = parseInt(e.currentTarget.dataset.page);
            applyFilters(targetPage);
        });
    });

    // Checkbox event listeners
    const selectAllCheckbox = document.getElementById('inventory-select-all');
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = paginatedData.length > 0 && paginatedData.every(item => context._selectedInventory.has(item.resourceId));
        selectAllCheckbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                paginatedData.forEach(item => context._selectedInventory.add(item.resourceId));
            } else {
                paginatedData.forEach(item => context._selectedInventory.delete(item.resourceId));
            }
            context.updateInventoryBulkToolbar();
            document.querySelectorAll('.inventory-row-checkbox').forEach(cb => {
                cb.checked = e.target.checked;
                cb.closest('tr').classList.toggle('row-selected', e.target.checked);
            });
        });
    }

    document.querySelectorAll('.inventory-row-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => {
            const id = e.target.dataset.id;
            if (e.target.checked) {
                context._selectedInventory.add(id);
            } else {
                context._selectedInventory.delete(id);
            }
            e.target.closest('tr').classList.toggle('row-selected', e.target.checked);
            context.updateInventoryBulkToolbar();
            // Update select-all checkbox state
            if (selectAllCheckbox) {
                selectAllCheckbox.checked = paginatedData.every(item => context._selectedInventory.has(item.resourceId));
            }
        });
    });
}

export function viewInventoryDetails(context, resourceId) {
    const item = window.Store.getInventory().find(i => i.resourceId === resourceId);
    if (!item) return;

    // Get linked sales orders
    const allSales = window.Store.getSales();
    const { byResourceId: salesByResourceId, soldByResourceId } = buildSalesIndex(allSales);
    const linkedSales = salesByResourceId.get(resourceId) || [];
    const now = new Date();

    // Calculate usage
    const totalSoldCapacity = soldByResourceId.get(resourceId) || 0;
    const totalCapacity = item.capacity?.value || 0;
    const {
        calculatedStatus,
        totalCapacity: displayTotalCapacity,
        usagePercent,
        statusBadgeClass
    } = getInventoryDisplayMetrics(item, totalSoldCapacity, now);

    // Calculate financial totals from linked sales
    let totalMonthlyRevenue = 0;
    let totalContractRevenue = 0;
    linkedSales.forEach(sale => {
        const computed = computeOrderFinancials(sale);
        const monthlyRevenue = computed.monthlyRevenue || 0;
        const termMonths = sale.dates?.term || 12;
        const isIru = sale.salesModel === 'IRU';
        const isIruResale = isIru && sale.salesType === 'Resale';
        const oneTimeRevenue = isIruResale
            ? (sale.financials?.otc || 0)
            : (isIru ? 0 : (sale.financials?.nrcSales || 0));
        totalMonthlyRevenue += monthlyRevenue;
        totalContractRevenue += (monthlyRevenue * termMonths) + oneTimeRevenue;
    });
    const remainingCapacity = displayTotalCapacity - totalSoldCapacity;

    // Build clickable linked sales list
    const linkedSalesHtml = linkedSales.length === 0
        ? '<div style="color:var(--text-muted); padding: 0.5rem 0;">No sales orders linked to this resource</div>'
        : linkedSales.map(s => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid var(--border-color);">
                <div>
                    <span class="font-mono" style="color: var(--accent-primary);">${escapeHtml(s.salesOrderId)}</span>
                    <span style="margin-left: 0.5rem; font-weight: 600;">${escapeHtml(s.customerName)}</span>
                    <span style="margin-left: 0.5rem; color: var(--text-muted);">${s.capacity?.value || 0} ${escapeHtml(s.capacity?.unit || 'Gbps')}</span>
                </div>
                <button class="btn btn-secondary" style="padding: 0.3rem 0.6rem; font-size: 0.75rem;" onclick="App.closeModal(); App.viewSalesDetails('${escapeJsString(s.salesOrderId)}')">
                    <ion-icon name="eye-outline"></ion-icon> View
                </button>
            </div>
        `).join('');

    const sectionStyle = 'background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem 1.25rem; margin-bottom: 1rem; box-shadow: 0 2px 8px rgba(0,0,0,0.08);';
    const highlightStyle = 'background: linear-gradient(135deg, var(--bg-card) 0%, var(--bg-secondary) 100%); border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem 1.25rem; margin-bottom: 1rem; box-shadow: 0 2px 8px rgba(0,0,0,0.08);';
    const tdStyle = 'padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;';

    // Check if ownership is IRU to show O&M fields
    const isIRU = item.acquisition?.ownership === 'IRU';
    const omRate = item.financials?.omRate || 0;
    const otc = item.financials?.otc || 0;
    const annualOmCost = (otc * omRate / 100);

    // Usage progress bar color
    const usageColor = usagePercent >= 100 ? 'var(--accent-danger)' : usagePercent >= 75 ? 'var(--accent-warning)' : 'var(--accent-success)';

    const detailsHtml = `
        <!-- Contract Summary - Highlighted -->
        <div style="${highlightStyle}">
            <h4 style="color: var(--accent-primary); margin-bottom: 1rem; font-size: 0.9rem; display: flex; align-items: center; gap: 0.5rem;">
                <ion-icon name="stats-chart-outline"></ion-icon> Resource Summary
            </h4>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; text-align: center;">
                <div>
                    <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.25rem;">Total Capacity</div>
                    <div class="font-mono" style="font-size: 1.25rem; font-weight: 700; color: var(--accent-primary);">${totalCapacity} ${item.capacity?.unit || 'Gbps'}</div>
                </div>
                <div>
                    <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.25rem;">Sold</div>
                    <div class="font-mono" style="font-size: 1.25rem; font-weight: 700; color: var(--accent-warning);">${totalSoldCapacity} ${item.capacity?.unit || 'Gbps'}</div>
                </div>
                <div>
                    <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.25rem;">Available</div>
                    <div class="font-mono" style="font-size: 1.25rem; font-weight: 700; color: var(--accent-success);">${remainingCapacity} ${item.capacity?.unit || 'Gbps'}</div>
                </div>
                <div>
                    <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.25rem;">Monthly Revenue</div>
                    <div class="font-mono" style="font-size: 1.25rem; font-weight: 700; color: var(--accent-success);">$${totalMonthlyRevenue.toLocaleString()}</div>
                    <div style="font-size: 0.65rem; color: var(--text-muted); margin-top: 0.25rem;">Sum of linked sales monthly revenue (incl. IRU amortized)</div>
                </div>
            </div>
            <!-- Usage Progress Bar -->
            <div style="margin-top: 1rem;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                    <span style="font-size: 0.75rem; color: var(--text-muted);">Utilization</span>
                    <span style="font-size: 0.75rem; font-weight: 600; color: ${usageColor};">${usagePercent}%</span>
                </div>
                <div style="background: var(--bg-secondary); border-radius: 4px; height: 8px; overflow: hidden;">
                    <div style="background: ${usageColor}; height: 100%; width: ${Math.min(usagePercent, 100)}%; transition: width 0.3s ease;"></div>
                </div>
            </div>
        </div>

        <div class="grid-2" style="gap:1.5rem; align-items: start;">
            <div>
                <div style="${sectionStyle}">
                    <h4 style="color: var(--accent-primary); margin-bottom: 0.75rem; font-size: 0.9rem;">Resource Information</h4>
                    <table style="width:100%;">
                        <tr><td style="${tdStyle}">Resource ID</td><td class="font-mono">${escapeHtml(item.resourceId)}</td></tr>
                        <tr><td style="${tdStyle}">Status</td><td><span class="badge ${statusBadgeClass}">${calculatedStatus}</span></td></tr>
                        <tr><td style="${tdStyle}">Cable System</td><td style="font-weight:600">${escapeHtml(item.cableSystem)}</td></tr>
                        <tr><td style="${tdStyle}">Segment Type</td><td>${escapeHtml(item.segmentType || '-')}</td></tr>
                        <tr><td style="${tdStyle}">Route Description</td><td>${escapeHtml(item.routeDescription || '-')}</td></tr>
                        <tr><td style="${tdStyle}">Handoff Type</td><td>${escapeHtml(item.handoffType || '-')}</td></tr>
                        <tr><td style="${tdStyle}">Protection</td><td>${escapeHtml(item.protection || '-')}</td></tr>
                        <tr><td style="${tdStyle}">Protection Cable</td><td>${escapeHtml(item.protectionCableSystem || '-')}</td></tr>
                    </table>
                </div>

                <div style="${sectionStyle}">
                    <h4 style="color: var(--accent-secondary); margin-bottom: 0.75rem; font-size: 0.9rem;">Acquisition</h4>
                    <table style="width:100%;">
                        <tr><td style="${tdStyle}">Type</td><td>${escapeHtml(item.acquisition?.type || 'Purchased')}</td></tr>
                        <tr><td style="${tdStyle}">Ownership</td><td>${escapeHtml(item.acquisition?.ownership || '-')}</td></tr>
                        <tr><td style="${tdStyle}">Supplier</td><td>${escapeHtml(resolveSupplierName(item.acquisition?.supplierId, item.acquisition?.supplierName) || '-')}</td></tr>
                        <tr><td style="${tdStyle}">Contract Ref</td><td class="font-mono">${escapeHtml(item.acquisition?.contractRef || '-')}</td></tr>
                    </table>
                </div>
            </div>
            <div>
                <div style="${sectionStyle}">
                    <h4 style="color: var(--accent-warning); margin-bottom: 0.75rem; font-size: 0.9rem;">Location</h4>
                    <table style="width:100%;">
                        <tr><td style="${tdStyle}">A-End</td><td>${escapeHtml(item.location?.aEnd?.city || '-')} - ${escapeHtml(item.location?.aEnd?.pop || '-')}</td></tr>
                        <tr><td style="${tdStyle}">A-End Device/Port</td><td class="font-mono">${escapeHtml(item.location?.aEnd?.device || '-')} / ${escapeHtml(item.location?.aEnd?.port || '-')}</td></tr>
                        <tr><td style="${tdStyle}">Z-End</td><td>${escapeHtml(item.location?.zEnd?.city || '-')} - ${escapeHtml(item.location?.zEnd?.pop || '-')}</td></tr>
                        <tr><td style="${tdStyle}">Z-End Device/Port</td><td class="font-mono">${escapeHtml(item.location?.zEnd?.device || '-')} / ${escapeHtml(item.location?.zEnd?.port || '-')}</td></tr>
                    </table>
                </div>

                <div style="${sectionStyle}">
                    <h4 style="color: var(--accent-danger); margin-bottom: 0.75rem; font-size: 0.9rem;">Financials & Dates</h4>
                    <table style="width:100%;">
                        ${!isIRU ? `<tr><td style="${tdStyle}">MRC</td><td class="font-mono">$${(item.financials?.mrc || 0).toLocaleString()}</td></tr>` : ''}
                        <tr><td style="${tdStyle}">${isIRU ? 'OTC' : 'NRC'}</td><td class="font-mono">$${(isIRU ? (item.financials?.otc || 0) : (item.financials?.nrc || 0)).toLocaleString()}</td></tr>
                        ${isIRU ? `
                        <tr><td style="${tdStyle}">O&M Rate</td><td class="font-mono">${omRate}%</td></tr>
                        <tr><td style="${tdStyle}">Annual O&M Cost</td><td class="font-mono" style="color:var(--accent-warning)">$${annualOmCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>
                        ` : ''}
                        <tr><td style="${tdStyle}">Term</td><td>${escapeHtml(item.financials?.term || '-')} months</td></tr>
                        <tr><td style="${tdStyle}">Start Date</td><td>${escapeHtml(item.dates?.start || '-')}</td></tr>
                        <tr><td style="${tdStyle}">End Date</td><td>${escapeHtml(item.dates?.end || '-')}</td></tr>
                    </table>
                </div>

                <div style="${sectionStyle}">
                    <h4 style="color: var(--accent-primary); margin-bottom: 0.75rem; font-size: 0.9rem; display: flex; justify-content: space-between; align-items: center;">
                        <span>Linked Sales Orders</span>
                        <span class="badge badge-info" style="font-size: 0.7rem;">${linkedSales.length}</span>
                    </h4>
                    ${linkedSalesHtml}
                </div>
            </div>
        </div>
    `;

    context.openModal(`Resource: ${escapeHtml(item.resourceId)}`, detailsHtml, null, true);
}

export function openInventoryModal(context, resourceId = null) {
    const item = resourceId ? window.Store.getInventory().find(i => i.resourceId === resourceId) : {};
    const isEdit = !!resourceId;

    // Calculate correct status based on capacity usage
    let calculatedStatus = item.status || 'Available';
    if (isEdit && item.resourceId) {
        const allSales = window.Store.getSales();
        const { soldByResourceId } = buildSalesIndex(allSales);
        const totalSoldCapacity = soldByResourceId.get(item.resourceId) || 0;
        const now = new Date();
        calculatedStatus = computeInventoryStatus(item, totalSoldCapacity, now).calculatedStatus;
    }

    // Generate supplier options for searchable dropdown
    const suppliers = window.Store.getSuppliers();
    const supplierOptions = suppliers.map(s => ({
        value: s.id,
        label: s.short_name,
        subtitle: s.full_name || ''
    }));
    const existingSupplier = item.acquisition?.supplierId || '';


    const formHTML = `
                                                                                                                        ${item.usage?.currentUser ? `
            <!-- Usage Information -->
            <div class="mb-4 p-3" style="background: rgba(189, 39, 30, 0.1); border: 1px solid var(--accent-danger); border-radius: 8px;">
                <h4 class="mb-2" style="color: var(--accent-danger); font-size: 0.9rem;"><ion-icon name="link-outline"></ion-icon> Linked Sales</h4>
                <div style="display: flex; gap: 2rem; flex-wrap: wrap;">
                    <div>
                        <span style="color: var(--text-muted); font-size: 0.85rem;">Customer:</span>
                        <div style="font-weight: 600; font-size: 1.1rem;">${escapeHtml(item.usage.currentUser)}</div>
                    </div>
                    <div>
                        <span style="color: var(--text-muted); font-size: 0.85rem;">Sales Order:</span>
                        <div class="font-mono" style="color: var(--accent-secondary);">${escapeHtml(item.usage.orderLink || 'N/A')}</div>
                    </div>
                </div>
            </div>
            ` : ''}

                                                                                                                        <!-- Core Identity -->
                                                                                                                        <h4 class="mb-4" style="border-bottom:1px solid var(--border-color); padding-bottom:0.5rem; margin-top:0;">Identity</h4>
                                                                                                                        <div class="grid-2">
                                                                                                                            <div class="form-group">
                                                                                                                                <label class="form-label">Resource ID</label>
                                                                                                                                <input type="text" class="form-control" name="resourceId" value="${escapeHtml(item.resourceId || '')}" ${isEdit ? 'readonly' : ''} placeholder="Auto-generated if empty">
                                                                                                                            </div>
                                                                                                                            <div class="form-group">
                                                                                                                                <label class="form-label">Status <small style="color:var(--text-muted)">(Auto-calculated)</small></label>
                                                                                                                                <div id="inventory-status-dropdown-placeholder" data-selected="${escapeHtml(calculatedStatus)}"></div>
                                                                                                                            </div>
                                                                                                                        </div>

                                                                                                                        <!--Acquisition -->
                                                                                                                        <h4 class="mb-4 mt-4" style="border-bottom:1px solid var(--border-color); padding-bottom:0.5rem;">Acquisition</h4>
                                                                                                                        <div class="grid-3">
                                                                                                                            <div class="form-group">
                                                                                                                                <label class="form-label">Acquisition Type</label>
                                                                                                                                <div id="inventory-acquisition-type-dropdown-placeholder" data-selected="${escapeHtml(item.acquisition?.type || 'Purchased')}"></div>
                                                                                                                            </div>
                                                                                                                            <div class="form-group">
                                                                                                                                <label class="form-label">Ownership</label>
                                                                                                                                <div id="inventory-ownership-dropdown-placeholder" data-selected="${escapeHtml(item.acquisition?.ownership || 'Leased')}"></div>
                                                                                                                            </div>
                                                                                                                            <div class="form-group">
                                                                                                                                <label class="form-label">Supplier</label>
                                                                                                                                <div id="inventory-supplier-dropdown-placeholder"></div>
                                                                                                                            </div>
                                                                                                                            <div class="form-group">
                                                                                                                                <label class="form-label">Contract Ref</label>
                                                                                                                                <input type="text" class="form-control" name="acquisition.contractRef" value="${escapeHtml(item.acquisition?.contractRef || '')}">
                                                                                                                            </div>
                                                                                                                        </div>

                                                                                                                        <!-- Technical Specs -->
                                                                                                                        <h4 class="mb-4 mt-4" style="border-bottom:1px solid var(--border-color); padding-bottom:0.5rem;">Technical Specs</h4>
                                                                                                                        <div class="grid-2">
                                                                                                                            <div class="form-group">
                                                                                                                                <label class="form-label">Cable System</label>
                                                                                                                                <input type="text" class="form-control" name="cableSystem" value="${escapeHtml(item.cableSystem || '')}">
                                                                                                                            </div>
                                                                                                                            <div class="form-group">
                                                                                                                                <label class="form-label">Segment Type</label>
                                                                                                                                <div id="inventory-segment-type-dropdown-placeholder" data-selected="${escapeHtml(item.segmentType || 'Capacity')}"></div>
                                                                                                                            </div>
                                                                                                                        </div>
                                                                                                                        <div class="grid-2">
                                                                                                                            <div class="form-group">
                                                                                                                                <label class="form-label">Handoff Type</label>
                                                                                                                                <div id="inventory-handoff-type-dropdown-placeholder" data-selected="${escapeHtml(item.handoffType || 'OTU-4')}"></div>
                                                                                                                            </div>
                                                                                                                            <div class="form-group" id="handoff-type-custom-container" style="display: ${item.handoffType && !['OTU-4', '100GE', '400GE'].includes(item.handoffType) ? 'block' : 'none'}">
                                                                                                                                <label class="form-label">Custom Handoff Type</label>
                                                                                                                                <input type="text" class="form-control" name="handoffTypeCustom" id="handoff-type-custom" value="${escapeHtml(item.handoffType && !['OTU-4', '100GE', '400GE'].includes(item.handoffType) ? item.handoffType : '')}" placeholder="Enter custom handoff type">
                                                                                                                            </div>
                                                                                                                        </div>
                                                                                                                        <div class="grid-1">
                                                                                                                            <div class="form-group">
                                                                                                                                <label class="form-label">Route Description</label>
                                                                                                                                <textarea class="form-control" name="routeDescription" rows="3" placeholder="Describe the cable routing path...">${escapeHtml(item.routeDescription || '')}</textarea>
                                                                                                                            </div>
                                                                                                                        </div>
                                                                                                                        <div class="grid-3">
                                                                                                                            <div class="form-group">
                                                                                                                                <label class="form-label">Capacity Value</label>
                                                                                                                                <input type="number" class="form-control" name="capacity.value" value="${item.capacity?.value || 0}">
                                                                                                                            </div>
                                                                                                                            <div class="form-group">
                                                                                                                                <label class="form-label">Unit</label>
                                                                                                                                <div id="inventory-capacity-unit-dropdown-placeholder" data-selected="${escapeHtml(item.capacity?.unit || 'Gbps')}"></div>
                                                                                                                            </div>
                                                                                                                            <div class="form-group">
                                                                                                                                <label class="form-label">Protection</label>
                                                                                                                                <div id="inventory-protection-dropdown-placeholder" data-selected="${escapeHtml(item.protection || 'Unprotected')}"></div>
                                                                                                                            </div>
                                                                                                                        </div>
                                                                                                                        <div class="grid-1" id="protection-cable-container" style="display: ${item.protection === 'Protected' ? 'block' : 'none'}">
                                                                                                                            <div class="form-group">
                                                                                                                                <label class="form-label">Protection Cable System</label>
                                                                                                                                <input type="text" class="form-control" name="protectionCableSystem" value="${escapeHtml(item.protectionCableSystem || '')}" placeholder="Specify the cable system used for protection">
                                                                                                                            </div>
                                                                                                                        </div>

                                                                                                                        <!--Locations -->
                                                                                                                        <h4 class="mb-4 mt-4" style="border-bottom:1px solid var(--border-color); padding-bottom:0.5rem;">Location</h4>
                                                                                                                        <div class="grid-2">
                                                                                                                            <div style="background:rgba(255,255,255,0.02); padding:1rem; border-radius:4px;">
                                                                                                                                <h5 class="mb-2" style="color:var(--accent-primary)">A-End</h5>
                                                                                                                                <div class="form-group"><label class="form-label">Country</label><input type="text" class="form-control" name="location.aEnd.country" value="${escapeHtml(item.location?.aEnd?.country || '')}"></div>
                                                                                                                                <div class="form-group"><label class="form-label">City</label><input type="text" class="form-control" name="location.aEnd.city" value="${escapeHtml(item.location?.aEnd?.city || '')}"></div>
                                                                                                                                <div class="form-group"><label class="form-label">PoP Site</label><input type="text" class="form-control" name="location.aEnd.pop" value="${escapeHtml(item.location?.aEnd?.pop || '')}"></div>
                                                                                                                                <div class="form-group"><label class="form-label">Device</label><input type="text" class="form-control" name="location.aEnd.device" value="${escapeHtml(item.location?.aEnd?.device || '')}" placeholder="e.g., Router-01, Switch-HK"></div>
                                                                                                                                <div class="form-group"><label class="form-label">Port</label><input type="text" class="form-control" name="location.aEnd.port" value="${escapeHtml(item.location?.aEnd?.port || '')}" placeholder="e.g., Eth1/1/1"></div>
                                                                                                                            </div>
                                                                                                                            <div style="background:rgba(255,255,255,0.02); padding:1rem; border-radius:4px;">
                                                                                                                                <h5 class="mb-2" style="color:var(--accent-secondary)">Z-End</h5>
                                                                                                                                <div class="form-group"><label class="form-label">Country</label><input type="text" class="form-control" name="location.zEnd.country" value="${escapeHtml(item.location?.zEnd?.country || '')}"></div>
                                                                                                                                <div class="form-group"><label class="form-label">City</label><input type="text" class="form-control" name="location.zEnd.city" value="${escapeHtml(item.location?.zEnd?.city || '')}"></div>
                                                                                                                                <div class="form-group"><label class="form-label">PoP Site</label><input type="text" class="form-control" name="location.zEnd.pop" value="${escapeHtml(item.location?.zEnd?.pop || '')}"></div>
                                                                                                                                <div class="form-group"><label class="form-label">Device</label><input type="text" class="form-control" name="location.zEnd.device" value="${escapeHtml(item.location?.zEnd?.device || '')}" placeholder="e.g., Router-02, Switch-SG"></div>
                                                                                                                                <div class="form-group"><label class="form-label">Port</label><input type="text" class="form-control" name="location.zEnd.port" value="${escapeHtml(item.location?.zEnd?.port || '')}" placeholder="e.g., Eth1/1/2"></div>
                                                                                                                            </div>
                                                                                                                        </div>

                                                                                                                        <!-- Cost Mode -->
                                                                                                                        <h4 class="mb-4 mt-4" style="border-bottom:1px solid var(--border-color); padding-bottom:0.5rem;">Cost Mode</h4>
                                                                                                                        <div class="grid-2">
                                                                                                                            <div class="form-group">
                                                                                                                                <label class="form-label">Cost Mode</label>
                                                                                                                                <div id="inventory-cost-mode-dropdown-placeholder" data-selected="${escapeHtml(item.costMode || 'single')}"></div>
                                                                                                                                <small style="color:var(--text-muted)">Single = legacy cost; Batches = staged lighting + base cost pool.</small>
                                                                                                                            </div>
                                                                                                                            <div class="form-group">
                                                                                                                                <label class="form-label">Base Order ID</label>
                                                                                                                                <input type="text" class="form-control" name="baseCost.orderId" value="${escapeHtml(item.baseCost?.orderId || '')}">
                                                                                                                            </div>
                                                                                                                        </div>

                                                                                                                        <!-- Base Cost (Batch Mode) -->
                                                                                                                        <div id="inventory-base-cost-section" style="display:${item.costMode === 'batches' ? 'block' : 'none'}; background:rgba(255,255,255,0.02); padding:0.75rem; border-radius:6px; margin-bottom:1rem;">
                                                                                                                            <h5 style="color:var(--accent-secondary); margin:0 0 0.5rem 0; font-size:0.85rem;">Base Cost Pool</h5>
                                                                                                                            <div class="grid-3">
                                                                                                                                <div class="form-group">
                                                                                                                                    <label class="form-label">Base Model</label>
                                                                                                                                    <div id="inventory-base-model-dropdown-placeholder" data-selected="${escapeHtml(item.baseCost?.model || 'IRU')}"></div>
                                                                                                                                </div>
                                                                                                                               <div class="form-group" id="base-mrc-container" style="display:${item.baseCost?.model === 'Lease' ? 'block' : 'none'};">
                                                                                                                                    <label class="form-label">Base MRC ($)</label>
                                                                                                                                    <input type="number" class="form-control" name="baseCost.mrc" value="${item.baseCost?.mrc || 0}">
                                                                                                                                </div>
                                                                                                                               <div class="form-group" id="base-term-container" style="display:${item.baseCost?.model === 'IRU' ? 'block' : 'none'};">
                                                                                                                                    <label class="form-label">Base Term (Months)</label>
                                                                                                                                    <input type="number" class="form-control" name="baseCost.termMonths" value="${item.baseCost?.termMonths || 0}">
                                                                                                                                </div>
                                                                                                                            </div>
                                                                                                                            <div class="grid-2" id="base-iru-container" style="display:${item.baseCost?.model === 'IRU' ? 'grid' : 'none'};">
                                                                                                                                <div class="form-group">
                                                                                                                                    <label class="form-label">Base OTC ($)</label>
                                                                                                                                    <input type="number" class="form-control" name="baseCost.otc" value="${item.baseCost?.otc || 0}">
                                                                                                                                </div>
                                                                                                                                <div class="form-group">
                                                                                                                                    <label class="form-label">Base O&amp;M Rate (%)</label>
                                                                                                                                    <input type="number" class="form-control" id="base-om-rate-input" name="baseCost.omRate" value="${item.baseCost?.omRate || 0}" step="0.1" min="0" max="100">
                                                                                                                                </div>
                                                                                                                            </div>
                                                                                                                            <div class="grid-2" id="base-annual-om-container" style="display:${item.baseCost?.model === 'IRU' ? 'grid' : 'none'};">
                                                                                                                                <div class="form-group">
                                                                                                                                    <label class="form-label">Base Annual O&amp;M ($)</label>
                                                                                                                                    <input type="number" class="form-control" id="base-annual-om-input" name="baseCost.annualOm" value="${item.baseCost?.annualOm || 0}" readonly style="background-color: var(--bg-card-hover); cursor: not-allowed;">
                                                                                                                                </div>
                                                                                                                            </div>
                                                                                                                        </div>

                                                                                                                        <!--Financials (Single Mode) -->
                                                                                                                        <h4 class="mb-4 mt-4" id="single-financials-title" style="border-bottom:1px solid var(--border-color); padding-bottom:0.5rem; display:${item.costMode === 'batches' ? 'none' : 'block'};">Financials & Terms</h4>
                                                                                                                        <div class="grid-3" id="financials-grid" style="display:${item.costMode === 'batches' ? 'none' : 'grid'};">
                                                                                                                            <div class="form-group" id="mrc-container" style="display: ${item.acquisition?.ownership === 'IRU' ? 'none' : 'block'}">
                                                                                                                                <label class="form-label">MRC Cost ($)</label>
                                                                                                                                <input type="number" class="form-control" name="financials.mrc" value="${item.financials?.mrc || 0}">
                                                                                                                            </div>
                                                                                                                            <div class="form-group">
                                                                                                                                <label class="form-label" id="otc-label">${item.acquisition?.ownership === 'IRU' ? 'OTC ($)' : 'NRC ($)'}</label>
                                                                                                                                <input type="number" class="form-control" name="financials.otc" value="${item.acquisition?.ownership === 'IRU' ? (item.financials?.otc || 0) : (item.financials?.nrc || 0)}">
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
                                                                                                                                <input type="date" class="form-control" id="start-date-input" name="dates.start" value="${escapeHtml(item.dates?.start || '')}">
                                                                                                                            </div>
                                                                                                                            <div class="form-group">
                                                                                                                                <label class="form-label">End Date (Auto-calculated)</label>
                                                                                                                                <input type="date" class="form-control" id="end-date-input" name="dates.end" value="${escapeHtml(item.dates?.end || '')}" readonly style="background-color: var(--bg-card-hover); cursor: not-allowed;">
                                                                                                                            </div>
                                                                                                                        </div>
                                                                                                                        <div id="inventory-batch-section" style="display:${item.costMode === 'batches' ? 'block' : 'none'}; margin-top: 1rem;">
                                                                                                                            <h4 class="mb-3" style="border-bottom:1px solid var(--border-color); padding-bottom:0.5rem;">Inventory Batches</h4>
                                                                                                                            <div id="inventory-batch-rows">
                                                                                                                                ${(item.batches || []).map(batch => `
                                                                                                                                    <div class="batch-row" data-batch-id="${escapeHtml(batch.batchId || '')}" style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 8px; padding: 0.75rem; margin-bottom: 0.75rem;">
                                                                                                                                        <div class="grid-4">
                                                                                                                                            <div class="form-group">
                                                                                                                                                <label class="form-label">Batch Order ID</label>
                                                                                                                                                <input type="text" class="form-control batch-input" data-field="orderId" value="${escapeHtml(batch.orderId || '')}">
                                                                                                                                            </div>
                                                                                                                                            <div class="form-group">
                                                                                                                                                <label class="form-label">Model</label>
                                                                                                                                                <select class="form-control batch-input" data-field="model">
                                                                                                                                                    <option value="IRU" ${batch.model === 'IRU' ? 'selected' : ''}>IRU</option>
                                                                                                                                                    <option value="Lease" ${batch.model === 'Lease' ? 'selected' : ''}>Lease</option>
                                                                                                                                                </select>
                                                                                                                                            </div>
                                                                                                                                            <div class="form-group">
                                                                                                                                                <label class="form-label">Start Date</label>
                                                                                                                                                <input type="date" class="form-control batch-input" data-field="startDate" value="${escapeHtml(batch.startDate || '')}">
                                                                                                                                            </div>
                                                                                                                                            <div class="form-group">
                                                                                                                                                <label class="form-label">Status</label>
                                                                                                                                                <select class="form-control batch-input" data-field="status">
                                                                                                                                                    <option value="Planned" ${batch.status === 'Planned' ? 'selected' : ''}>Planned</option>
                                                                                                                                                    <option value="Active" ${batch.status === 'Active' ? 'selected' : ''}>Active</option>
                                                                                                                                                    <option value="Ended" ${batch.status === 'Ended' ? 'selected' : ''}>Ended</option>
                                                                                                                                                </select>
                                                                                                                                            </div>
                                                                                                                                        </div>
                                                                                                                                        <div class="grid-4">
                                                                                                                                            <div class="form-group">
                                                                                                                                                <label class="form-label">Capacity (${escapeHtml(item.capacity?.unit || 'Gbps')})</label>
                                                                                                                                                <input type="number" class="form-control batch-input" data-field="capacity" value="${batch.capacity?.value || 0}">
                                                                                                                                            </div>
                                                                                                                                            <div class="form-group batch-iru-field">
                                                                                                                                                <label class="form-label">OTC ($)</label>
                                                                                                                                                <input type="number" class="form-control batch-input" data-field="otc" value="${batch.financials?.otc || 0}">
                                                                                                                                            </div>
                                                                                                                                            <div class="form-group batch-iru-field">
                                                                                                                                                <label class="form-label">O&amp;M Rate (%)</label>
                                                                                                                                                <input type="number" class="form-control batch-input batch-om-rate" data-field="omRate" value="${batch.financials?.omRate || 0}" step="0.1" min="0" max="100">
                                                                                                                                            </div>
                                                                                                                                            <div class="form-group batch-iru-field">
                                                                                                                                                <label class="form-label">Term (Months)</label>
                                                                                                                                                <input type="number" class="form-control batch-input" data-field="termMonths" value="${batch.financials?.termMonths || 0}">
                                                                                                                                            </div>
                                                                                                                                        </div>
                                                                                                                                        <div class="grid-2 batch-iru-field">
                                                                                                                                            <div class="form-group">
                                                                                                                                                <label class="form-label">Annual O&amp;M ($)</label>
                                                                                                                                                <input type="number" class="form-control batch-input batch-annual-om" data-field="annualOm" value="${batch.financials?.annualOm || 0}" readonly style="background-color: var(--bg-card-hover); cursor: not-allowed;">
                                                                                                                                            </div>
                                                                                                                                        </div>
                                                                                                                                        <div class="grid-2">
                                                                                                                                            <div class="form-group batch-lease-field">
                                                                                                                                                <label class="form-label">MRC ($)</label>
                                                                                                                                                <input type="number" class="form-control batch-input" data-field="mrc" value="${batch.financials?.mrc || 0}">
                                                                                                                                            </div>
                                                                                                                                            <div class="form-group" style="display:flex; align-items:flex-end;">
                                                                                                                                                <button type="button" class="btn btn-secondary batch-remove-btn" style="font-size:0.75rem;">Remove Batch</button>
                                                                                                                                            </div>
                                                                                                                                        </div>
                                                                                                                                    </div>
                                                                                                                                `).join('')}
                                                                                                                            </div>
                                                                                                                            <button type="button" class="btn btn-secondary" id="add-batch-btn" style="font-size:0.8rem; padding:0.4rem 0.75rem;">+ Add Batch</button>
                                                                                                                        </div>
                                                                                                                        `;

    context.openModal(isEdit ? 'Edit Resource' : 'Add Resource', formHTML, async (form) => {
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
                supplierId: form.querySelector('[name="acquisition.supplierId"]').value,
                supplierName: resolveSupplierName(form.querySelector('[name="acquisition.supplierId"]').value),
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
            financials: (() => {
                const ownership = form.querySelector('[name="acquisition.ownership"]').value;
                const oneTimeCost = Number(form.querySelector('[name="financials.otc"]').value);
                return {
                    mrc: Number(form.querySelector('[name="financials.mrc"]').value),
                    nrc: ownership === 'IRU' ? 0 : oneTimeCost,
                    otc: ownership === 'IRU' ? oneTimeCost : 0,
                    term: Number(form.querySelector('[name="financials.term"]').value),
                    omRate: Number(form.querySelector('[name="financials.omRate"]')?.value || 0),
                    annualOmCost: Number(form.querySelector('[name="financials.annualOmCost"]')?.value || 0)
                };
            })(),
            costMode: form.querySelector('[name="costMode"]')?.value || 'single',
            baseCost: {
                orderId: form.querySelector('[name="baseCost.orderId"]')?.value || '',
                model: form.querySelector('[name="baseCost.model"]')?.value || 'IRU',
                mrc: Number(form.querySelector('[name="baseCost.mrc"]')?.value || 0),
                otc: Number(form.querySelector('[name="baseCost.otc"]')?.value || 0),
                omRate: Number(form.querySelector('[name="baseCost.omRate"]')?.value || 0),
                annualOm: Number(form.querySelector('[name="baseCost.annualOm"]')?.value || 0),
                termMonths: Number(form.querySelector('[name="baseCost.termMonths"]')?.value || 0)
            },
            dates: {
                start: form.querySelector('[name="dates.start"]').value,
                end: form.querySelector('[name="dates.end"]').value
            }
        };

        const batchRows = Array.from(form.querySelectorAll('.batch-row'));
        const batches = batchRows.map(row => {
            const getField = (field) => row.querySelector(`[data-field="${field}"]`)?.value || '';
            const model = getField('model') || 'IRU';
            return {
                batchId: row.dataset.batchId || `BAT-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
                resourceId: newItem.resourceId,
                orderId: getField('orderId'),
                model,
                capacity: {
                    value: Number(getField('capacity') || 0),
                    unit: newItem.capacity.unit
                },
                financials: {
                    mrc: Number(getField('mrc') || 0),
                    otc: Number(getField('otc') || 0),
                    omRate: Number(getField('omRate') || 0),
                    annualOm: Number(getField('annualOm') || 0),
                    termMonths: Number(getField('termMonths') || 0)
                },
                startDate: getField('startDate'),
                status: getField('status') || 'Planned'
            };
        }).filter(b => b.capacity.value > 0);

        if (isEdit) {
            await window.Store.updateInventory(newItem.resourceId, newItem);
        } else {
            await window.Store.addInventory(newItem);
        }

        if (newItem.costMode === 'batches') {
            await window.Store.replaceInventoryBatches(newItem.resourceId, batches);
        } else {
            await window.Store.replaceInventoryBatches(newItem.resourceId, []);
        }

        // Refresh the inventory view to show updated data
        context.renderView('inventory');
        return true;
    }, true);

    // Initialize supplier searchable dropdown
    const supplierDropdownPlaceholder = document.getElementById('inventory-supplier-dropdown-placeholder');
    if (supplierDropdownPlaceholder) {
        supplierDropdownPlaceholder.outerHTML = renderSearchableDropdown({
            name: 'acquisition.supplierId',
            id: 'inventory-supplier-dropdown',
            options: supplierOptions,
            selectedValue: existingSupplier,
            placeholder: '搜索供应商...'
        });
        initSearchableDropdown('inventory-supplier-dropdown-container');
    }

    // Initialize Status simple dropdown
    const statusPlaceholder = document.getElementById('inventory-status-dropdown-placeholder');
    if (statusPlaceholder) {
        const selectedStatus = statusPlaceholder.dataset.selected || 'Available';
        statusPlaceholder.outerHTML = renderSimpleDropdown({
            name: 'status',
            id: 'inventory-status',
            options: [
                { value: 'Draft', label: 'Draft' },
                { value: 'Available', label: 'Available' },
                { value: 'Sold Out', label: 'Sold Out' },
                { value: 'Expired', label: 'Expired' }
            ],
            selectedValue: selectedStatus,
            placeholder: 'Select...'
        });
        initSimpleDropdown('inventory-status-container');
    }

    // Initialize Acquisition Type simple dropdown
    const acquisitionTypePlaceholder = document.getElementById('inventory-acquisition-type-dropdown-placeholder');
    if (acquisitionTypePlaceholder) {
        const selectedType = acquisitionTypePlaceholder.dataset.selected || 'Purchased';
        acquisitionTypePlaceholder.outerHTML = renderSimpleDropdown({
            name: 'acquisition.type',
            id: 'inventory-acquisition-type',
            options: [
                { value: 'Purchased', label: 'Purchased' },
                { value: 'Swapped In', label: 'Swapped In' }
            ],
            selectedValue: selectedType,
            placeholder: 'Select...'
        });
        initSimpleDropdown('inventory-acquisition-type-container');
    }

    // Initialize Ownership simple dropdown
    const ownershipPlaceholder = document.getElementById('inventory-ownership-dropdown-placeholder');
    if (ownershipPlaceholder) {
        const selectedOwnership = ownershipPlaceholder.dataset.selected || 'Leased';
        ownershipPlaceholder.outerHTML = renderSimpleDropdown({
            name: 'acquisition.ownership',
            id: 'inventory-ownership',
            options: [
                { value: 'Leased', label: 'Leased' },
                { value: 'IRU', label: 'IRU' }
            ],
            selectedValue: selectedOwnership,
            placeholder: 'Select...'
        });
        initSimpleDropdown('inventory-ownership-container');
    }

    // Initialize Cost Mode simple dropdown
    const costModePlaceholder = document.getElementById('inventory-cost-mode-dropdown-placeholder');
    if (costModePlaceholder) {
        const selectedMode = costModePlaceholder.dataset.selected || 'single';
        costModePlaceholder.outerHTML = renderSimpleDropdown({
            name: 'costMode',
            id: 'inventory-cost-mode',
            options: [
                { value: 'single', label: 'Single Cost' },
                { value: 'batches', label: 'Batches + Base Cost' }
            ],
            selectedValue: selectedMode,
            placeholder: 'Select...'
        });
        initSimpleDropdown('inventory-cost-mode-container');
    }

    // Initialize Base Model dropdown
    const baseModelPlaceholder = document.getElementById('inventory-base-model-dropdown-placeholder');
    if (baseModelPlaceholder) {
        const selectedBaseModel = baseModelPlaceholder.dataset.selected || 'IRU';
        baseModelPlaceholder.outerHTML = renderSimpleDropdown({
            name: 'baseCost.model',
            id: 'inventory-base-model',
            options: [
                { value: 'IRU', label: 'IRU' },
                { value: 'Lease', label: 'Lease' }
            ],
            selectedValue: selectedBaseModel,
            placeholder: 'Select...'
        });
        initSimpleDropdown('inventory-base-model-container');
    }

    // Initialize Segment Type simple dropdown
    const segmentTypePlaceholder = document.getElementById('inventory-segment-type-dropdown-placeholder');
    if (segmentTypePlaceholder) {
        const selectedSegment = segmentTypePlaceholder.dataset.selected || 'Capacity';
        segmentTypePlaceholder.outerHTML = renderSimpleDropdown({
            name: 'segmentType',
            id: 'inventory-segment-type',
            options: [
                { value: 'Capacity', label: 'Capacity' },
                { value: 'Fiber Pair', label: 'Fiber Pair' },
                { value: 'Spectrum', label: 'Spectrum' },
                { value: 'Backhaul', label: 'Backhaul' }
            ],
            selectedValue: selectedSegment,
            placeholder: 'Select...'
        });
        initSimpleDropdown('inventory-segment-type-container');
    }

    const singleFinancialsTitle = document.getElementById('single-financials-title');
    const financialsGrid = document.getElementById('financials-grid');
    const baseCostSection = document.getElementById('inventory-base-cost-section');
    const batchSection = document.getElementById('inventory-batch-section');
    const costModeInput = document.getElementById('inventory-cost-mode');
    const baseModelInput = document.getElementById('inventory-base-model');
    const baseMrcContainer = document.getElementById('base-mrc-container');
    const baseIruContainer = document.getElementById('base-iru-container');
    const baseAnnualOmContainer = document.getElementById('base-annual-om-container');
    const baseTermContainer = document.getElementById('base-term-container');

    const updateCostModeDisplay = () => {
        const mode = costModeInput?.value || 'single';
        if (mode === 'batches') {
            if (singleFinancialsTitle) singleFinancialsTitle.style.display = 'none';
            if (financialsGrid) financialsGrid.style.display = 'none';
            if (baseCostSection) baseCostSection.style.display = 'block';
            if (batchSection) batchSection.style.display = 'block';
        } else {
            if (singleFinancialsTitle) singleFinancialsTitle.style.display = 'block';
            if (financialsGrid) financialsGrid.style.display = 'grid';
            if (baseCostSection) baseCostSection.style.display = 'none';
            if (batchSection) batchSection.style.display = 'none';
        }
    };

    const updateBaseModelDisplay = () => {
        const model = baseModelInput?.value || 'IRU';
        if (model === 'Lease') {
            if (baseMrcContainer) baseMrcContainer.style.display = 'block';
            if (baseIruContainer) baseIruContainer.style.display = 'none';
            if (baseAnnualOmContainer) baseAnnualOmContainer.style.display = 'none';
            if (baseTermContainer) baseTermContainer.style.display = 'none';
        } else {
            if (baseMrcContainer) baseMrcContainer.style.display = 'none';
            if (baseIruContainer) baseIruContainer.style.display = 'grid';
            if (baseAnnualOmContainer) baseAnnualOmContainer.style.display = 'grid';
            if (baseTermContainer) baseTermContainer.style.display = 'block';
        }
    };

    if (costModeInput) {
        costModeInput.addEventListener('change', updateCostModeDisplay);
        updateCostModeDisplay();
    }

    if (baseModelInput) {
        baseModelInput.addEventListener('change', updateBaseModelDisplay);
        updateBaseModelDisplay();
    }

    const baseOtcInput = document.querySelector('[name="baseCost.otc"]');
    const baseOmRateInput = document.getElementById('base-om-rate-input');
    const baseAnnualOmInput = document.getElementById('base-annual-om-input');

    const calculateBaseOmCost = () => {
        if (!baseOtcInput || !baseOmRateInput || !baseAnnualOmInput) return;
        const otcVal = parseFloat(baseOtcInput.value) || 0;
        const omRateVal = parseFloat(baseOmRateInput.value) || 0;
        const annualCost = (otcVal * omRateVal / 100);
        baseAnnualOmInput.value = annualCost.toFixed(2);
    };

    if (baseOtcInput && baseOmRateInput) {
        baseOtcInput.addEventListener('input', calculateBaseOmCost);
        baseOmRateInput.addEventListener('input', calculateBaseOmCost);
        calculateBaseOmCost();
    }

    const batchRowsContainer = document.getElementById('inventory-batch-rows');
    const addBatchBtn = document.getElementById('add-batch-btn');
    const generateBatchId = () => `BAT-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;

    const syncBatchRowFields = (row) => {
        const modelSelect = row.querySelector('[data-field="model"]');
        const iruFields = row.querySelectorAll('.batch-iru-field');
        const leaseFields = row.querySelectorAll('.batch-lease-field');
        if (!modelSelect) return;
        const isLease = modelSelect.value === 'Lease';
        iruFields.forEach(el => { el.style.display = isLease ? 'none' : 'block'; });
        leaseFields.forEach(el => { el.style.display = isLease ? 'block' : 'none'; });
    };

    const calculateBatchOmCost = (row) => {
        const otcInput = row.querySelector('[data-field="otc"]');
        const rateInput = row.querySelector('[data-field="omRate"]');
        const annualInput = row.querySelector('[data-field="annualOm"]');
        if (!otcInput || !rateInput || !annualInput) return;
        const otcVal = parseFloat(otcInput.value) || 0;
        const rateVal = parseFloat(rateInput.value) || 0;
        const annual = (otcVal * rateVal / 100);
        annualInput.value = annual.toFixed(2);
    };

    const attachBatchRowListeners = (row) => {
        const modelSelect = row.querySelector('[data-field="model"]');
        if (modelSelect) {
            modelSelect.addEventListener('change', () => syncBatchRowFields(row));
        }
        const otcInput = row.querySelector('[data-field="otc"]');
        const rateInput = row.querySelector('[data-field="omRate"]');
        if (otcInput) otcInput.addEventListener('input', () => calculateBatchOmCost(row));
        if (rateInput) rateInput.addEventListener('input', () => calculateBatchOmCost(row));
        const removeBtn = row.querySelector('.batch-remove-btn');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => row.remove());
        }
        syncBatchRowFields(row);
        calculateBatchOmCost(row);
    };

    if (batchRowsContainer) {
        batchRowsContainer.querySelectorAll('.batch-row').forEach(row => attachBatchRowListeners(row));
    }

    if (addBatchBtn && batchRowsContainer) {
        addBatchBtn.addEventListener('click', () => {
            const unit = document.querySelector('[name="capacity.unit"]')?.value || 'Gbps';
            const row = document.createElement('div');
            row.className = 'batch-row';
            row.dataset.batchId = generateBatchId();
            row.style.cssText = 'background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 8px; padding: 0.75rem; margin-bottom: 0.75rem;';
            row.innerHTML = `
                <div class="grid-4">
                    <div class="form-group">
                        <label class="form-label">Batch Order ID</label>
                        <input type="text" class="form-control batch-input" data-field="orderId" value="">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Model</label>
                        <select class="form-control batch-input" data-field="model">
                            <option value="IRU" selected>IRU</option>
                            <option value="Lease">Lease</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Start Date</label>
                        <input type="date" class="form-control batch-input" data-field="startDate" value="">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Status</label>
                        <select class="form-control batch-input" data-field="status">
                            <option value="Planned" selected>Planned</option>
                            <option value="Active">Active</option>
                            <option value="Ended">Ended</option>
                        </select>
                    </div>
                </div>
                <div class="grid-4">
                    <div class="form-group">
                        <label class="form-label">Capacity (${escapeJsString(unit)})</label>
                        <input type="number" class="form-control batch-input" data-field="capacity" value="0">
                    </div>
                    <div class="form-group batch-iru-field">
                        <label class="form-label">OTC ($)</label>
                        <input type="number" class="form-control batch-input" data-field="otc" value="0">
                    </div>
                    <div class="form-group batch-iru-field">
                        <label class="form-label">O&amp;M Rate (%)</label>
                        <input type="number" class="form-control batch-input batch-om-rate" data-field="omRate" value="0" step="0.1" min="0" max="100">
                    </div>
                    <div class="form-group batch-iru-field">
                        <label class="form-label">Term (Months)</label>
                        <input type="number" class="form-control batch-input" data-field="termMonths" value="0">
                    </div>
                </div>
                <div class="grid-2 batch-iru-field">
                    <div class="form-group">
                        <label class="form-label">Annual O&amp;M ($)</label>
                        <input type="number" class="form-control batch-input batch-annual-om" data-field="annualOm" value="0" readonly style="background-color: var(--bg-card-hover); cursor: not-allowed;">
                    </div>
                </div>
                <div class="grid-2">
                    <div class="form-group batch-lease-field">
                        <label class="form-label">MRC ($)</label>
                        <input type="number" class="form-control batch-input" data-field="mrc" value="0">
                    </div>
                    <div class="form-group" style="display:flex; align-items:flex-end;">
                        <button type="button" class="btn btn-secondary batch-remove-btn" style="font-size:0.75rem;">Remove Batch</button>
                    </div>
                </div>
            `;
            batchRowsContainer.appendChild(row);
            attachBatchRowListeners(row);
        });
    }

    // Initialize Handoff Type simple dropdown
    const handoffTypePlaceholder = document.getElementById('inventory-handoff-type-dropdown-placeholder');
    if (handoffTypePlaceholder) {
        let selectedHandoff = handoffTypePlaceholder.dataset.selected || 'OTU-4';
        // If it's a custom value, set to 'Other'
        const standardHandoffs = ['OTU-4', '100GE', '400GE', 'Other'];
        if (selectedHandoff && !standardHandoffs.includes(selectedHandoff)) {
            selectedHandoff = 'Other';
        }
        handoffTypePlaceholder.outerHTML = renderSimpleDropdown({
            name: 'handoffType',
            id: 'inventory-handoff-type',
            options: [
                { value: 'OTU-4', label: 'OTU-4' },
                { value: '100GE', label: '100GE' },
                { value: '400GE', label: '400GE' },
                { value: 'Other', label: 'Other' }
            ],
            selectedValue: selectedHandoff,
            placeholder: 'Select...'
        });
        initSimpleDropdown('inventory-handoff-type-container');
    }

    // Initialize Capacity Unit simple dropdown
    const capacityUnitPlaceholder = document.getElementById('inventory-capacity-unit-dropdown-placeholder');
    if (capacityUnitPlaceholder) {
        const selectedUnit = capacityUnitPlaceholder.dataset.selected || 'Gbps';
        capacityUnitPlaceholder.outerHTML = renderSimpleDropdown({
            name: 'capacity.unit',
            id: 'inventory-capacity-unit',
            options: [
                { value: 'Gbps', label: 'Gbps' },
                { value: 'Tbps', label: 'Tbps' },
                { value: 'Fiber Pair', label: 'Fiber Pair' },
                { value: 'Half Fiber Pair', label: 'Half Fiber Pair' },
                { value: 'GHz', label: 'GHz' }
            ],
            selectedValue: selectedUnit,
            placeholder: 'Select...'
        });
        initSimpleDropdown('inventory-capacity-unit-container');
    }

    // Initialize Protection simple dropdown
    const protectionPlaceholder = document.getElementById('inventory-protection-dropdown-placeholder');
    if (protectionPlaceholder) {
        const selectedProtection = protectionPlaceholder.dataset.selected || 'Unprotected';
        protectionPlaceholder.outerHTML = renderSimpleDropdown({
            name: 'protection',
            id: 'inventory-protection',
            options: [
                { value: 'Unprotected', label: 'Unprotected' },
                { value: 'Protected', label: 'Protected' }
            ],
            selectedValue: selectedProtection,
            placeholder: 'Select...'
        });
        initSimpleDropdown('inventory-protection-container');
    }

    // Attach Form Event Listeners after modal is rendered
    context.attachInventoryFormListeners();
}

export function attachInventoryFormListeners(context) {
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
    const handoffSelect = document.querySelector('[name="handoffType"]');
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
            startDate.setDate(startDate.getDate() - 1); // End date is the last day of the term
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
}
