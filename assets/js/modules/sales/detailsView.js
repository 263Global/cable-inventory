/**
 * Sales details modal rendering.
 */

const { computeSalesStatus, getSalesStatusBadgeClass } = window.SalesStatus;
const computeOrderFinancials = window.computeOrderFinancials;
const escapeHtml = window.DomUtils?.escapeHtml || (s => s);

export function viewSalesDetailsModal(context, salesOrderId) {
    const order = window.Store.getSales().find(s => s.salesOrderId === salesOrderId);
    if (!order) return;

    // Use unified calculation engine
    const computed = computeOrderFinancials(order);
    const salesModel = order.salesModel || 'Lease';
    const salesType = order.salesType || 'Resale';
    const term = order.dates?.term || 12;
    const getCableSegments = (costs = {}) => {
        if (Array.isArray(costs.cableSegments) && costs.cableSegments.length) {
            return costs.cableSegments;
        }
        const legacy = costs.cable || costs.cableCost;
        return legacy ? [legacy] : [];
    };
    const summarizeCableSegments = (segments, defaultTerm) => {
        const summary = {
            leaseMonthly: 0,
            iruMonthlyOtc: 0,
            iruMonthlyOm: 0,
            totalOtc: 0,
            totalNrc: 0,
            allIru: segments.length > 0
        };
        const termFallback = defaultTerm || 12;
        segments.forEach(seg => {
            const model = seg.model || 'Lease';
            if (model !== 'IRU') {
                summary.allIru = false;
            }
            const annualOm = Number(seg.annualOm || 0);
            const otc = Number(seg.otc || 0);
            const termMonths = Number(seg.termMonths || termFallback || 1);
            summary.totalOtc += otc;
            summary.totalNrc += Number(seg.nrc || 0);
            if (model === 'IRU') {
                summary.leaseMonthly += annualOm / 12;
            } else {
                summary.leaseMonthly += Number(seg.mrc || 0);
            }
            summary.iruMonthlyOtc += termMonths > 0 ? (otc / termMonths) : 0;
            summary.iruMonthlyOm += annualOm / 12;
        });
        return summary;
    };
    const cableSegments = getCableSegments(order.costs || {});
    const cableSummary = summarizeCableSegments(cableSegments, term);

    // Revenue display - handle both Lease and IRU
    const isIru = salesModel === 'IRU';
    const mrrDisplay = isIru ? computed.monthlyRevenue : (order.financials?.mrcSales || 0);
    const nrcDisplay = isIru ? (order.financials?.otc || 0) : (order.financials?.nrcSales || 0);
    const revenueLabel1 = isIru
        ? (salesType === 'Resale' ? 'Monthly O&M Revenue' : 'Monthly Revenue (OTC amortized + O&M)')
        : 'Monthly Revenue (MRR)';
    const revenueLabel2 = isIru ? 'OTC Revenue' : 'One-time Revenue (NRC)';

    const effectiveStatus = computeSalesStatus(order.dates?.start, order.dates?.end, new Date(), order.terminatedAt);
    const statusClass = getSalesStatusBadgeClass(effectiveStatus);

    // Calculate costs display - MRC
    const cableOtc = cableSummary.totalOtc;
    const cableMonthlyOtc = cableSummary.iruMonthlyOtc;
    const cableMonthlyOm = cableSummary.iruMonthlyOm;
    let cableCostMrc = salesModel === 'IRU'
        ? (cableMonthlyOtc + cableMonthlyOm)
        : cableSummary.leaseMonthly;
    let cableCostLabel = 'Cable Cost';
    if (salesModel === 'IRU') {
        cableCostLabel = 'Cable Cost (Amortized)';
    } else if (cableSummary.allIru) {
        cableCostLabel = 'Cable Cost (O&M)';
    }
    const getBackhaulMonthlyCost = (backhaul) => {
        if (!backhaul) return 0;
        if (backhaul.model === 'IRU') {
            const termMonths = backhaul.termMonths || term;
            const monthlyOtc = termMonths > 0 ? (backhaul.otc || 0) / termMonths : 0;
            const monthlyOm = (backhaul.annualOm || 0) / 12;
            return monthlyOtc + monthlyOm;
        }
        return backhaul.monthly || 0;
    };
    const backhaulA = order.costs?.backhaul?.aEnd || order.costs?.backhaulA || null;
    const backhaulZ = order.costs?.backhaul?.zEnd || order.costs?.backhaulZ || null;
    const backhaulAMrc = getBackhaulMonthlyCost(backhaulA);
    const backhaulZMrc = getBackhaulMonthlyCost(backhaulZ);
    const xcAMrc = order.costs?.crossConnectA?.mrc || order.costs?.crossConnect?.aEnd?.monthly || 0;
    const xcZMrc = order.costs?.crossConnectZ?.mrc || order.costs?.crossConnect?.zEnd?.monthly || 0;
    const otherMonthly = order.costs?.otherCosts?.monthly || 0;
    const totalCostsMrc = cableCostMrc + backhaulAMrc + backhaulZMrc + xcAMrc + xcZMrc + otherMonthly;

    // Calculate costs display - NRC
    const cableCostNrc = cableSummary.totalNrc;
    const backhaulANrc = backhaulA?.nrc || 0;
    const backhaulZNrc = backhaulZ?.nrc || 0;
    const xcANrc = order.costs?.crossConnectA?.nrc || 0;
    const xcZNrc = order.costs?.crossConnectZ?.nrc || 0;
    const otherOneOff = order.costs?.otherCosts?.oneOff || 0;
    const oneTimeCostLabel = salesModel === 'IRU' ? 'One-time Costs (OTC/NRC)' : 'One-time Costs (NRC)';
    const cableOneTimeCost = salesModel === 'IRU' ? cableOtc : cableCostNrc;
    const cableOneTimeLabel = salesModel === 'IRU' ? 'Cable OTC' : 'Cable NRC';
    const backhaulAOneTimeCost = backhaulA?.model === 'IRU' ? (backhaulA?.otc || 0) : backhaulANrc;
    const backhaulZOneTimeCost = backhaulZ?.model === 'IRU' ? (backhaulZ?.otc || 0) : backhaulZNrc;
    const backhaulAOneTimeLabel = backhaulA?.model === 'IRU' ? 'Backhaul A OTC' : 'Backhaul A NRC';
    const backhaulZOneTimeLabel = backhaulZ?.model === 'IRU' ? 'Backhaul Z OTC' : 'Backhaul Z NRC';
    const totalOneTimeCosts = cableOneTimeCost + backhaulAOneTimeCost + backhaulZOneTimeCost + xcANrc + xcZNrc + otherOneOff;

    // ===== Contract Term Mismatch Detection =====
    const salesEndDate = order.dates?.end || '';
    const xcA = order.costs?.crossConnect?.aEnd || order.costs?.crossConnectA || null;
    const xcZ = order.costs?.crossConnect?.zEnd || order.costs?.crossConnectZ || null;
    const otherCosts = order.costs?.otherCosts || null;
    const mismatches = [];
    const checkMismatch = (label, costObj) => {
        if (!costObj?.endDate || !salesEndDate) return;
        const costEnd = new Date(costObj.endDate);
        const salesEnd = new Date(salesEndDate);
        const diffDays = Math.round((costEnd - salesEnd) / (1000 * 60 * 60 * 24));
        if (Math.abs(diffDays) > 7) {
            const direction = diffDays < 0 ? 'early' : 'late';
            const months = Math.abs(Math.round(diffDays / 30));
            mismatches.push({ label, costEnd: costObj.endDate, direction, months });
        }
    };
    // Check each cable segment
    cableSegments.forEach((seg, i) => {
        const label = cableSegments.length > 1 ? `Cable Seg ${i + 1}` : 'Cable';
        checkMismatch(label, seg);
    });
    checkMismatch('Backhaul A', backhaulA);
    checkMismatch('Backhaul Z', backhaulZ);
    checkMismatch('XC A', xcA);
    checkMismatch('XC Z', xcZ);
    checkMismatch('Other', otherCosts);

    const mismatchBadge = (label) => {
        const m = mismatches.find(x => label.startsWith(x.label));
        if (!m) return '';
        const icon = m.direction === 'early' ? '⏰' : '📅';
        const color = m.direction === 'early' ? 'var(--accent-danger)' : 'var(--accent-warning)';
        const tip = m.direction === 'early'
            ? `Expires ${m.months}mo before sales order`
            : `Extends ${m.months}mo past sales order`;
        return `<span title="${tip}" style="margin-left:0.35rem; font-size:0.7rem; color:${color}; cursor:help;">${icon}</span>`;
    };

    const mismatchAlertHtml = mismatches.length === 0 ? '' : `
        <div style="${sectionStyle} border-left: 3px solid var(--accent-warning); padding-left: 0.75rem;">
            <h4 style="color: var(--accent-warning); margin-bottom: 0.5rem; font-size: 0.9rem;">⚠️ Contract Term Mismatches</h4>
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.5rem;">Sales order ends: ${salesEndDate}</div>
            <table style="width:100%;">
                ${mismatches.map(m => {
        const icon = m.direction === 'early' ? '🔴' : '🟡';
        const msg = m.direction === 'early'
            ? `Expires ${m.months}mo early (${m.costEnd})`
            : `Extends ${m.months}mo past (${m.costEnd})`;
        return `<tr><td style="padding:0.3rem 0; font-size:0.85rem;">${icon} ${m.label}</td><td style="font-size:0.8rem; color:var(--text-muted);">${msg}</td></tr>`;
    }).join('')}
            </table>
        </div>`;

    // Contract totals (align with unified financial logic)
    let totalRevenue = (mrrDisplay * term) + nrcDisplay;
    if (salesModel === 'IRU' && salesType !== 'Resale') {
        // IRU Inventory/Hybrid: monthly revenue already amortizes OTC
        totalRevenue = mrrDisplay * term;
    }
    let totalProfit = 0;
    if (salesModel === 'IRU') {
        if (salesType === 'Resale') {
            const firstMonthProfit = computed.firstMonthProfit || 0;
            const recurringMonthlyProfit = computed.recurringMonthlyProfit || 0;
            totalProfit = firstMonthProfit + (recurringMonthlyProfit * Math.max(term - 1, 0));
        } else {
            totalProfit = computed.monthlyProfit * term;
        }
    } else {
        // Lease: include monthly profit plus one-time NRC profit
        const nrcSales = order.financials?.nrcSales || 0;
        const nrcProfit = nrcSales - totalOneTimeCosts;
        totalProfit = (computed.monthlyProfit * term) + nrcProfit;
    }
    const totalCost = totalRevenue - totalProfit;
    const totalMargin = totalRevenue > 0 ? (totalProfit / totalRevenue * 100).toFixed(1) : 0;

    // Annual figures (use monthly profit/cost from unified logic)
    const annualRevenue = mrrDisplay * 12;
    const monthlyCost = mrrDisplay - computed.monthlyProfit;
    const annualCost = monthlyCost * 12;
    const annualProfit = annualRevenue - annualCost;
    const monthlyCostsLabel = salesModel === 'IRU' ? 'Monthly Costs (Amortized)' : 'Monthly Costs (MRC)';

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

    // Location info - fix field path to match saved data structure
    const aEndCity = order.location?.aEnd?.city || order.locationAEnd?.city || order.aEndCity || '-';
    const aEndPop = order.location?.aEnd?.pop || order.locationAEnd?.pop || order.aEndPop || '-';
    const zEndCity = order.location?.zEnd?.city || order.locationZEnd?.city || order.zEndCity || '-';
    const zEndPop = order.location?.zEnd?.pop || order.locationZEnd?.pop || order.zEndPop || '-';

    // Get cable supplier names
    const suppliers = window.Store.getSuppliers();
    const resolveSupplierName = (supplierId) => {
        if (!supplierId) return '';
        const supplier = suppliers.find(s => s.id === supplierId);
        return supplier ? (supplier.short_name || supplier.full_name || supplierId) : supplierId;
    };
    const cableSegmentRows = cableSegments.map((seg, index) => {
        const supplierName = resolveSupplierName(seg.supplier) || '-';
        const system = seg.cableSystem || '-';
        const capacity = seg.capacity ? `${seg.capacity} ${seg.capacityUnit || 'Gbps'}` : '';
        const model = seg.model || 'Lease';
        const protection = seg.protection && seg.protection !== 'Unprotected'
            ? `${seg.protection}${seg.protectionCableSystem ? ` (${seg.protectionCableSystem})` : ''}`
            : '';
        const meta = [capacity, model, protection].filter(Boolean).join(' • ');
        const orderNo = seg.orderNo ? ` (${seg.orderNo})` : '';
        return `
            <tr>
                <td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">Segment ${index + 1}</td>
                <td>
                    <div style="font-weight:600; color:var(--accent-primary);">${system}${orderNo}</div>
                    <div style="font-size:0.8rem; color:var(--text-muted);">${supplierName}${meta ? ` • ${meta}` : ''}</div>
                </td>
            </tr>
        `;
    }).join('');

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
                        <tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">Status</td><td><span class="badge ${statusClass}">${effectiveStatus}</span></td></tr>
                        <tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">Linked Resource</td><td class="font-mono">${order.inventoryLink || '-'}</td></tr>
                    </table>
                </div>

                <!-- Contract Period -->
                <div style="${sectionStyle}">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                        <h4 style="color: var(--accent-secondary); margin: 0; font-size: 0.9rem;">Contract Period</h4>
                        <div style="display: flex; gap: 0.5rem;">
                            <button type="button" class="btn btn-warning" data-action="renew-from-detail" data-sales-order-id="${escapeHtml(order.salesOrderId)}" style="font-size: 0.75rem; padding: 0.35rem 0.75rem;">
                                <ion-icon name="refresh-outline"></ion-icon> Renew
                            </button>
                            ${effectiveStatus === 'Active' ? `<button type="button" class="btn btn-danger" data-action="terminate-from-detail" data-sales-order-id="${escapeHtml(order.salesOrderId)}" style="font-size: 0.75rem; padding: 0.35rem 0.75rem;">
                                <ion-icon name="close-circle-outline"></ion-icon> Terminate
                            </button>` : ''}
                        </div>
                    </div>
                    <table style="width:100%;">
                        <tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">Term</td><td class="font-mono">${term} months</td></tr>
                        <tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">Start Date</td><td>${order.dates?.start || '-'}</td></tr>
                        <tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">End Date</td><td>${order.dates?.end || '-'}</td></tr>
                        ${order.terminatedAt ? `<tr><td style="padding:0.4rem 0; color:var(--accent-danger); font-size:0.85rem; font-weight:600;">⛔ Terminated</td><td style="color:var(--accent-danger);">${order.terminatedAt}${order.terminationReason ? ` — ${escapeHtml(order.terminationReason)}` : ''}</td></tr>` : ''}
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

                <!-- Cable System Information (Resale only) -->
                ${salesType === 'Resale' && cableSegments.length ? `
                <div style="${sectionStyle}">
                    <h4 style="color: var(--accent-primary); margin-bottom: 0.75rem; font-size: 0.9rem;">🔌 Cable System</h4>
                    <table style="width:100%;">
                        ${cableSegmentRows}
                    </table>
                </div>
                ` : ''}
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

                <!-- Cost Breakdown MRC with Supplier Details -->
                <div style="${sectionStyle}">
                    <h4 style="color: var(--accent-danger); margin-bottom: 0.75rem; font-size: 0.9rem;">${monthlyCostsLabel}</h4>
                    <div style="display: flex; flex-direction: column; gap: 0.4rem;">
                        ${(function renderCostCards() {
            const renderCard = ({ label, mrc, supplier, orderNo, startDate, endDate, termMonths, model, mismatchKey, notes }) => {
                const metaParts = [];
                if (supplier) metaParts.push(resolveSupplierName(supplier) || supplier);
                if (orderNo) metaParts.push(orderNo);
                const metaLine = metaParts.length > 0 ? `<div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.15rem;">${metaParts.join('  •  ')}</div>` : '';
                let dateLine = '';
                if (startDate) {
                    const dateParts = [`${startDate} → ${endDate || '?'}`];
                    if (termMonths) dateParts.push(`${termMonths}mo`);
                    if (model === 'IRU') dateParts.push('IRU');
                    dateLine = `<div style="font-size: 0.7rem; color: var(--text-muted);">${dateParts.join('  •  ')}</div>`;
                }
                const notesLine = notes ? `<div style="font-size: 0.7rem; color: var(--text-muted); font-style: italic; margin-top: 0.15rem;">📝 ${notes}</div>` : '';
                return `
                                <div style="display: flex; justify-content: space-between; align-items: flex-start; padding: 0.5rem; background: var(--bg-secondary); border-radius: 6px;">
                                    <div style="flex: 1; min-width: 0;">
                                        <div style="font-size: 0.85rem; font-weight: 600;">${label}${mismatchBadge(mismatchKey || label)}</div>
                                        ${metaLine}
                                        ${dateLine}
                                        ${notesLine}
                                    </div>
                                    <div class="font-mono" style="white-space: nowrap;">$${mrc.toLocaleString()}</div>
                                </div>`;
            };
            let html = '';
            if (cableCostMrc > 0 || cableSummary.totalNrc > 0) {
                html += renderCard({ label: cableCostLabel, mrc: cableCostMrc, supplier: cableSegments[0]?.supplier, orderNo: cableSegments[0]?.orderNo, startDate: cableSegments[0]?.startDate, endDate: cableSegments[0]?.endDate, termMonths: cableSegments[0]?.termMonths, model: null, mismatchKey: 'Cable', notes: cableSegments[0]?.notes });
            }
            if (backhaulAMrc > 0 || (backhaulA?.nrc || 0) > 0) {
                html += renderCard({ label: 'Backhaul A-End', mrc: backhaulAMrc, supplier: backhaulA?.supplier, orderNo: backhaulA?.orderNo, startDate: backhaulA?.startDate, endDate: backhaulA?.endDate, termMonths: backhaulA?.termMonths, model: backhaulA?.model, mismatchKey: 'Backhaul A', notes: backhaulA?.notes });
            }
            if (backhaulZMrc > 0 || (backhaulZ?.nrc || 0) > 0) {
                html += renderCard({ label: 'Backhaul Z-End', mrc: backhaulZMrc, supplier: backhaulZ?.supplier, orderNo: backhaulZ?.orderNo, startDate: backhaulZ?.startDate, endDate: backhaulZ?.endDate, termMonths: backhaulZ?.termMonths, model: backhaulZ?.model, mismatchKey: 'Backhaul Z', notes: backhaulZ?.notes });
            }
            if (xcAMrc > 0 || (xcA?.nrc || 0) > 0) {
                html += renderCard({ label: 'Cross Connect A', mrc: xcAMrc, supplier: xcA?.supplier, orderNo: xcA?.orderNo, startDate: xcA?.startDate, endDate: xcA?.endDate, termMonths: xcA?.termMonths, model: null, mismatchKey: 'XC A', notes: xcA?.notes });
            }
            if (xcZMrc > 0 || (xcZ?.nrc || 0) > 0) {
                html += renderCard({ label: 'Cross Connect Z', mrc: xcZMrc, supplier: xcZ?.supplier, orderNo: xcZ?.orderNo, startDate: xcZ?.startDate, endDate: xcZ?.endDate, termMonths: xcZ?.termMonths, model: null, mismatchKey: 'XC Z', notes: xcZ?.notes });
            }
            if (otherMonthly > 0 || otherOneOff > 0) {
                html += renderCard({ label: `Other${otherCosts?.description ? ' — ' + otherCosts.description : ''}`, mrc: otherMonthly, supplier: otherCosts?.supplier, orderNo: otherCosts?.orderNo, startDate: otherCosts?.startDate, endDate: otherCosts?.endDate, termMonths: otherCosts?.termMonths, model: null, mismatchKey: 'Other', notes: otherCosts?.notes });
            }
            return html;
        })()}
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 0.5rem 0 0; margin-top: 0.25rem; border-top: 1px solid var(--border-color);">
                        <span style="font-weight: 600; font-size: 0.85rem;">Total MRC</span>
                        <span class="font-mono" style="color: var(--accent-danger); font-weight: 600;">$${totalCostsMrc.toLocaleString()}</span>
                    </div>
                </div>

                <!-- Cost Breakdown NRC -->
                ${totalOneTimeCosts > 0 ? `
                <div style="${sectionStyle}">
                    <h4 style="color: var(--accent-warning); margin-bottom: 0.75rem; font-size: 0.9rem;">${oneTimeCostLabel}</h4>
                    <table style="width:100%;">
                        ${cableOneTimeCost > 0 ? `<tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">${cableOneTimeLabel}</td><td class="font-mono">$${cableOneTimeCost.toLocaleString()}</td></tr>` : ''}
                        ${backhaulAOneTimeCost > 0 ? `<tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">${backhaulAOneTimeLabel}</td><td class="font-mono">$${backhaulAOneTimeCost.toLocaleString()}</td></tr>` : ''}
                        ${backhaulZOneTimeCost > 0 ? `<tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">${backhaulZOneTimeLabel}</td><td class="font-mono">$${backhaulZOneTimeCost.toLocaleString()}</td></tr>` : ''}
                        ${xcANrc > 0 ? `<tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">XC A NRC</td><td class="font-mono">$${xcANrc.toLocaleString()}</td></tr>` : ''}
                        ${xcZNrc > 0 ? `<tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">XC Z NRC</td><td class="font-mono">$${xcZNrc.toLocaleString()}</td></tr>` : ''}
                        ${otherOneOff > 0 ? `<tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">Other One-off</td><td class="font-mono">$${otherOneOff.toLocaleString()}</td></tr>` : ''}
                        <tr style="border-top: 1px solid var(--border-color)"><td style="padding:0.5rem 0; font-weight:600; font-size:0.85rem;">Total One-time</td><td class="font-mono" style="color:var(--accent-warning); font-weight:600">$${totalOneTimeCosts.toLocaleString()}</td></tr>
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

        ${mismatchAlertHtml}

        <!-- Renewal History -->
        ${Array.isArray(order.renewalHistory) && order.renewalHistory.length ? `
        <div style="${sectionStyle}">
            <div id="renewal-history-header" style="cursor: pointer; display: flex; align-items: center; justify-content: space-between;">
                <h4 style="color: var(--accent-warning); margin: 0; font-size: 0.9rem; display: flex; align-items: center; gap: 0.5rem;">
                    <ion-icon name="time-outline"></ion-icon> 续约历史 (${order.renewalHistory.length})
                </h4>
                <ion-icon id="renewal-history-chevron" name="chevron-down-outline" style="font-size: 1.1rem; color: var(--text-muted); transition: transform 0.2s;"></ion-icon>
            </div>
            <div id="renewal-history-body" style="display: none; margin-top: 0.75rem; border-left: 2px solid var(--border-color); padding-left: 1rem;">
                ${order.renewalHistory.map((snap, i) => {
            const d = snap.dates || {};
            const f = snap.financials || {};
            const c = snap.costs || {};
            const renewDate = snap.renewedAt ? new Date(snap.renewedAt).toLocaleDateString() : '-';
            const mrc = f.mrcSales != null ? `$${Number(f.mrcSales).toLocaleString()}` : '-';
            const nrc = f.nrcSales != null ? `$${Number(f.nrcSales).toLocaleString()}` : '-';
            const otc = f.otc != null && f.otc > 0 ? `$${Number(f.otc).toLocaleString()}` : '';
            const changes = snap.costChanges?.length ? snap.costChanges.join(', ') : '';
            const costLines = [];
            const segs = Array.isArray(c.cableSegments) ? c.cableSegments : (c.cable ? [c.cable] : []);
            segs.forEach((seg, si) => {
                const label = segs.length > 1 ? `Cable Seg${si + 1}` : 'Cable';
                if (seg.model === 'IRU') {
                    costLines.push(`${label}: OTC $${Number(seg.otc || 0).toLocaleString()}, O&M $${Number(seg.annualOm || 0).toLocaleString()}/yr`);
                } else {
                    costLines.push(`${label}: MRC $${Number(seg.mrc || 0).toLocaleString()}, NRC $${Number(seg.nrc || 0).toLocaleString()}`);
                }
            });
            const bhA = c.backhaul?.aEnd || c.backhaulA;
            const bhZ = c.backhaul?.zEnd || c.backhaulZ;
            if (bhA) costLines.push(`BH-A: MRC $${Number(bhA.monthly || 0).toLocaleString()}, NRC $${Number(bhA.nrc || 0).toLocaleString()}`);
            if (bhZ) costLines.push(`BH-Z: MRC $${Number(bhZ.monthly || 0).toLocaleString()}, NRC $${Number(bhZ.nrc || 0).toLocaleString()}`);
            const xcA = c.crossConnect?.aEnd || c.crossConnectA;
            const xcZ = c.crossConnect?.zEnd || c.crossConnectZ;
            if (xcA) costLines.push(`XC-A: MRC $${Number(xcA.monthly || xcA.mrc || 0).toLocaleString()}, NRC $${Number(xcA.nrc || 0).toLocaleString()}`);
            if (xcZ) costLines.push(`XC-Z: MRC $${Number(xcZ.monthly || xcZ.mrc || 0).toLocaleString()}, NRC $${Number(xcZ.nrc || 0).toLocaleString()}`);
            if (c.otherCosts) costLines.push(`Other: MRC $${Number(c.otherCosts.monthly || 0).toLocaleString()}, NRC $${Number(c.otherCosts.oneOff || 0).toLocaleString()}`);
            return `
                    <div style="position: relative; margin-bottom: 0.75rem; padding-bottom: 0.75rem; border-bottom: 1px dashed var(--border-color);">
                        <div style="position: absolute; left: -1.35rem; top: 0.1rem; width: 10px; height: 10px; border-radius: 50%; background: var(--accent-warning); border: 2px solid var(--bg-card);"></div>
                        <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.35rem; font-weight: 600;">第 ${i + 1} 期 · 续约于 ${renewDate}</div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.25rem 1rem; font-size: 0.85rem;">
                            <div><span style="color: var(--text-muted);">期限:</span> ${d.start || '-'} ~ ${d.end || '-'}</div>
                            <div><span style="color: var(--text-muted);">合同月数:</span> ${d.term || '-'}</div>
                            <div><span style="color: var(--accent-success);">MRC:</span> ${mrc}</div>
                            <div><span style="color: var(--accent-warning);">NRC:</span> ${nrc}</div>
                            ${otc ? `<div><span style="color: var(--text-muted);">OTC:</span> ${otc}</div>` : ''}
                        </div>
                        ${costLines.length ? `
                        <div style="margin-top: 0.4rem; padding-top: 0.35rem; border-top: 1px solid var(--border-color);">
                            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; margin-bottom: 0.2rem;">成本明细</div>
                            ${costLines.map(l => `<div style="font-size: 0.8rem; color: var(--text-secondary);">${escapeHtml(l)}</div>`).join('')}
                        </div>` : ''}
                        ${changes ? `<div style="font-size: 0.8rem; color: var(--accent-primary); margin-top: 0.3rem;"><ion-icon name="swap-horizontal-outline" style="font-size: 0.75rem;"></ion-icon> ${escapeHtml(changes)}</div>` : ''}
                    </div>`;
        }).join('')}
            </div>
        </div>
        ` : ''}

        <!-- Notes -->
        ${order.notes ? `
        <div style="${sectionStyle}">
            <h4 style="color: var(--text-muted); margin-bottom: 0.5rem; font-size: 0.9rem;">Notes</h4>
            <p style="margin: 0; font-size: 0.9rem; line-height: 1.5;">${order.notes}</p>
        </div>
        ` : ''}
    `;

    context.openModal(`Sales Order: ${order.salesOrderId}`, detailsHtml, null, true);

    // Wire up renewal history toggle
    const histHeader = context.modalContainer.querySelector('#renewal-history-header');
    const histBody = context.modalContainer.querySelector('#renewal-history-body');
    const histChevron = context.modalContainer.querySelector('#renewal-history-chevron');
    if (histHeader && histBody) {
        histHeader.addEventListener('click', () => {
            const expanded = histBody.style.display !== 'none';
            histBody.style.display = expanded ? 'none' : 'block';
            if (histChevron) histChevron.style.transform = expanded ? 'rotate(0deg)' : 'rotate(180deg)';
        });
    }

    context.modalContainer.querySelectorAll('[data-action="renew-from-detail"]').forEach(btn => {
        btn.addEventListener('click', () => {
            context.closeModal();
            context.openRenewModal(btn.dataset.salesOrderId || '');
        });
    });
    context.modalContainer.querySelectorAll('[data-action="terminate-from-detail"]').forEach(btn => {
        btn.addEventListener('click', () => {
            context.closeModal();
            context.openTerminateModal(btn.dataset.salesOrderId || '');
        });
    });
}
