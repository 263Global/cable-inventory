/**
 * Inventory Module (ES6)
 * Handles inventory management: rendering, details view, form handling
 * 
 * All functions receive `context` (the App object) as the first parameter
 * to access shared state and utilities.
 */

export function renderInventory(context, searchQuery = '', page = 1, statusFilter = '') {
    // Check if coming from Dashboard with an expiring filter
    if (context._pendingFilter === 'expiring' && !statusFilter) {
        statusFilter = 'Expiring';
        context._pendingFilter = null;
    }

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

    // Apply status filter
    if (statusFilter) {
        if (statusFilter === 'Expiring') {
            const now = new Date();
            data = data.filter(item => {
                if (item.status !== 'Active') return false;
                if (!item.dates?.end) return false;
                const endDate = new Date(item.dates.end);
                const daysUntilExpiry = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
                return daysUntilExpiry >= 0 && daysUntilExpiry <= 90;
            });
        } else {
            data = data.filter(item => item.status === statusFilter);
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

    const html = `
        <div class="filter-bar mb-4">
            <div class="search-box">
                <ion-icon name="search-outline"></ion-icon>
                <input type="text" id="inventory-search" placeholder="Search Resource ID or Cable..." value="${searchQuery}">
            </div>
            <select id="inventory-status-filter" class="form-control" style="max-width: 160px;">
                <option value="">All Status</option>
                <option value="Active" ${statusFilter === 'Active' ? 'selected' : ''}>Active</option>
                <option value="Pending" ${statusFilter === 'Pending' ? 'selected' : ''}>Pending</option>
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
                        <tr style="${calculatedStatus === 'Expired' ? 'opacity: 0.6;' : ''}" class="${context._selectedInventory.has(item.resourceId) ? 'row-selected' : ''}">
                            ${context._inventorySelectionMode ? `<td style="text-align: center;"><input type="checkbox" class="inventory-row-checkbox" data-id="${item.resourceId}" ${context._selectedInventory.has(item.resourceId) ? 'checked' : ''}></td>` : ''}
                            <td class="font-mono" style="color: var(--accent-secondary); white-space: nowrap;">${item.resourceId}</td>
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

    // Calculate financial totals from linked sales
    let totalMrcRevenue = 0;
    let totalNrcRevenue = 0;
    linkedSales.forEach(sale => {
        totalMrcRevenue += (sale.financials?.mrcSales || 0);
        totalNrcRevenue += (sale.financials?.nrcSales || 0);
    });
    const contractTerm = item.financials?.term || 12;
    const totalContractRevenue = (totalMrcRevenue * contractTerm) + totalNrcRevenue;
    const remainingCapacity = totalCapacity - totalSoldCapacity;

    // Build clickable linked sales list
    const linkedSalesHtml = linkedSales.length === 0
        ? '<div style="color:var(--text-muted); padding: 0.5rem 0;">No sales orders linked to this resource</div>'
        : linkedSales.map(s => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid var(--border-color);">
                <div>
                    <span class="font-mono" style="color: var(--accent-primary);">${s.salesOrderId}</span>
                    <span style="margin-left: 0.5rem; font-weight: 600;">${s.customerName}</span>
                    <span style="margin-left: 0.5rem; color: var(--text-muted);">${s.capacity?.value || 0} ${s.capacity?.unit || 'Gbps'}</span>
                </div>
                <button class="btn btn-secondary" style="padding: 0.3rem 0.6rem; font-size: 0.75rem;" onclick="App.closeModal(); App.viewSalesDetails('${s.salesOrderId}')">
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
                    <div class="font-mono" style="font-size: 1.25rem; font-weight: 700; color: var(--accent-success);">$${totalMrcRevenue.toLocaleString()}</div>
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
                    <h4 style="color: var(--accent-secondary); margin-bottom: 0.75rem; font-size: 0.9rem;">Acquisition</h4>
                    <table style="width:100%;">
                        <tr><td style="${tdStyle}">Type</td><td>${item.acquisition?.type || 'Purchased'}</td></tr>
                        <tr><td style="${tdStyle}">Ownership</td><td>${item.acquisition?.ownership || '-'}</td></tr>
                        <tr><td style="${tdStyle}">Supplier</td><td>${item.acquisition?.supplier || '-'}</td></tr>
                        <tr><td style="${tdStyle}">Contract Ref</td><td class="font-mono">${item.acquisition?.contractRef || '-'}</td></tr>
                    </table>
                </div>
            </div>
            <div>
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
                    <h4 style="color: var(--accent-primary); margin-bottom: 0.75rem; font-size: 0.9rem; display: flex; justify-content: space-between; align-items: center;">
                        <span>Linked Sales Orders</span>
                        <span class="badge badge-info" style="font-size: 0.7rem;">${linkedSales.length}</span>
                    </h4>
                    ${linkedSalesHtml}
                </div>
            </div>
        </div>
    `;

    context.openModal(`Resource: ${item.resourceId}`, detailsHtml, null, true);
}

export function openInventoryModal(context, resourceId = null) {
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

    // Generate supplier options for all cost card dropdowns
    const suppliers = window.Store.getSuppliers();
    const supplierOptionsHTML = suppliers.map(s =>
        `<option value="${s.id}">${s.short_name}</option>`
    ).join('');

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
                                                                                                                                <select class="form-control" name="acquisition.supplier">
                                                                                                                                    <option value="">Select Supplier...</option>
                                                                                                                                    ${supplierOptionsHTML}
                                                                                                                                </select>
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
            await window.Store.updateInventory(newItem.resourceId, newItem);
        } else {
            await window.Store.addInventory(newItem);
        }

        // Refresh the inventory view to show updated data
        context.renderView('inventory');
        return true;
    }, true);

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
