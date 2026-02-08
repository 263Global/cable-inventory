/**
 * Inventory details modal rendering.
 */

import { resolveSupplierName } from './supplierUtils.js';

const { escapeHtml } = window.DomUtils;

const {
    buildSalesIndex,
    getInventoryDisplayMetrics
} = window.InventoryStatus;

export function viewInventoryDetailsModal(context, resourceId) {
    const item = window.Store.getInventory().find(i => i.resourceId === resourceId);
    if (!item) return;

    // Get linked sales orders
    const allSales = window.Store.getSales();
    const { byResourceId: salesByResourceId, soldByResourceId } = buildSalesIndex(allSales);
    const linkedSales = salesByResourceId.get(resourceId) || [];
    const now = new Date();

    // Calculate usage
    const totalSoldCapacity = soldByResourceId.get(resourceId) || 0;
    const baseCapacity = item.capacity?.value || 0;
    const {
        calculatedStatus,
        totalCapacity: displayTotalCapacity,
        usagePercent,
        statusBadgeClass
    } = getInventoryDisplayMetrics(item, totalSoldCapacity, now);
    const isBatchMode = item.costMode === 'batches';
    const litCapacity = isBatchMode ? displayTotalCapacity : baseCapacity;
    const unlitCapacity = isBatchMode ? Math.max(0, baseCapacity - litCapacity) : 0;

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
                <button type="button" class="btn btn-secondary" data-action="open-linked-sale" data-sales-order-id="${escapeHtml(s.salesOrderId)}" style="padding: 0.3rem 0.6rem; font-size: 0.75rem;">
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
                    <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.25rem;">${isBatchMode ? 'Base Capacity' : 'Total Capacity'}</div>
                    <div class="font-mono" style="font-size: 1.25rem; font-weight: 700; color: var(--accent-primary);">${baseCapacity} ${item.capacity?.unit || 'Gbps'}</div>
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
            ${isBatchMode ? `
            <div style="margin-top: 0.75rem; display: flex; gap: 1rem; justify-content: center; font-size: 0.75rem; color: var(--text-muted);">
                <div><span style="color: var(--accent-warning); font-weight: 600;">Lit</span> ${litCapacity} ${item.capacity?.unit || 'Gbps'}</div>
                <div><span style="color: var(--accent-secondary); font-weight: 600;">Unlit</span> ${unlitCapacity} ${item.capacity?.unit || 'Gbps'}</div>
            </div>
            ` : ''}
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

    context.openModal(`Resource: ${item.resourceId}`, detailsHtml, null, true);
    context.modalContainer.querySelectorAll('[data-action="open-linked-sale"]').forEach(btn => {
        btn.addEventListener('click', () => {
            context.closeModal();
            context.viewSalesDetails(btn.dataset.salesOrderId || '');
        });
    });
}
