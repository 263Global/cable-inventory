/**
 * Inventory list view rendering and event wiring.
 */

const { escapeHtml } = window.DomUtils;

const {
    buildSalesIndex,
    computeInventoryStatus,
    getInventoryDisplayMetrics
} = window.InventoryStatus;

const { isExpiringWithin } = window.StatusUi;

export function renderInventoryList(context, searchQuery = '', page = 1, statusFilter = '') {
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

    // Add Import button
    const importBtn = document.createElement('button');
    importBtn.className = 'btn btn-secondary';
    importBtn.innerHTML = '<ion-icon name="cloud-upload-outline"></ion-icon> Import';
    importBtn.onclick = () => window.CsvImport?.openImportModal('inventory');
    context.headerActions.appendChild(importBtn);

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
                <button type="button" class="btn btn-secondary" data-action="enter-selection-mode" style="font-size: 0.8rem; padding: 0.4rem 0.75rem;">
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
            <button type="button" class="btn btn-secondary" data-action="export-selected" style="font-size: 0.8rem; padding: 0.4rem 0.75rem;" ${context._selectedInventory.size === 0 ? 'disabled' : ''}>
                <ion-icon name="download-outline"></ion-icon> Export Selected
            </button>
            <button type="button" class="btn" data-action="exit-selection-mode" style="font-size: 0.8rem; padding: 0.4rem 0.75rem; margin-left: auto;">
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

        const baseCapacity = item.capacity?.value || 0;
        const isBatchMode = item.costMode === 'batches';
        const litCapacity = isBatchMode ? totalCapacity : baseCapacity;
        const unlitCapacity = isBatchMode ? Math.max(0, baseCapacity - litCapacity) : 0;
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
                                ${isBatchMode ? `
                                <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.15rem;">
                                    Lit ${litCapacity}/${baseCapacity} ${item.capacity?.unit || 'Gbps'} · Unlit ${unlitCapacity} ${item.capacity?.unit || 'Gbps'}
                                </div>
                                ` : ''}
                                <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.2rem;">
                                    ${escapeHtml(item.segmentType || '')} (${escapeHtml(item.protection || '')})
                                </div>
                                <div class="mobile-capacity-info" style="font-size:0.75rem; color:var(--accent-warning); margin-top:0.35rem; font-weight:500;">
                                    📊 已售 ${totalSoldCapacity}/${totalCapacity} ${item.capacity?.unit || 'Gbps'}
                                </div>
                                ${isBatchMode ? `
                                <div class="mobile-capacity-info" style="font-size:0.7rem; color:var(--text-muted); margin-top:0.15rem;">
                                    🔆 Lit ${litCapacity}/${baseCapacity} ${item.capacity?.unit || 'Gbps'} · Unlit ${unlitCapacity} ${item.capacity?.unit || 'Gbps'}
                                </div>
                                ` : ''}
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
                                    <button type="button" class="btn btn-secondary" data-action="view-resource" data-resource-id="${escapeHtml(item.resourceId)}" style="padding:0.4rem" title="View">
                                        <ion-icon name="eye-outline"></ion-icon>
                                    </button>
                                    <button type="button" class="btn btn-primary" data-action="edit-resource" data-resource-id="${escapeHtml(item.resourceId)}" style="padding:0.4rem" title="Edit">
                                        <ion-icon name="create-outline"></ion-icon>
                                    </button>
                                    <button type="button" class="btn btn-danger" data-action="delete-resource" data-resource-id="${escapeHtml(item.resourceId)}" style="padding:0.4rem" title="Delete">
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

    context.container.querySelectorAll('[data-action="enter-selection-mode"]').forEach(btn => {
        btn.addEventListener('click', () => context.enterInventorySelectionMode());
    });
    context.container.querySelectorAll('[data-action="export-selected"]').forEach(btn => {
        btn.addEventListener('click', () => context.exportSelectedInventory());
    });
    context.container.querySelectorAll('[data-action="exit-selection-mode"]').forEach(btn => {
        btn.addEventListener('click', () => context.exitInventorySelectionMode());
    });
    context.container.querySelectorAll('[data-action="view-resource"]').forEach(btn => {
        btn.addEventListener('click', () => context.viewInventoryDetails(btn.dataset.resourceId || ''));
    });
    context.container.querySelectorAll('[data-action="edit-resource"]').forEach(btn => {
        btn.addEventListener('click', () => context.openInventoryModal(btn.dataset.resourceId || ''));
    });
    context.container.querySelectorAll('[data-action="delete-resource"]').forEach(btn => {
        btn.addEventListener('click', () => context.deleteInventoryWithConfirm(btn.dataset.resourceId || ''));
    });

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
        // Visual indicator for active filter
        statusFilterEl.classList.toggle('filter-active', statusFilterEl.value !== '');
        statusFilterEl.addEventListener('change', () => {
            statusFilterEl.classList.toggle('filter-active', statusFilterEl.value !== '');
        });
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
