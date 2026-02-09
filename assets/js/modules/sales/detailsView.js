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

    const effectiveStatus = computeSalesStatus(order.dates?.start, order.dates?.end, new Date());
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
                        <button type="button" class="btn btn-warning" data-action="renew-from-detail" data-sales-order-id="${escapeHtml(order.salesOrderId)}" style="font-size: 0.75rem; padding: 0.35rem 0.75rem;">
                            <ion-icon name="refresh-outline"></ion-icon> Renew
                        </button>
                    </div>
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

                <!-- Cost Breakdown MRC -->
                <div style="${sectionStyle}">
                    <h4 style="color: var(--accent-danger); margin-bottom: 0.75rem; font-size: 0.9rem;">${monthlyCostsLabel}</h4>
                    <table style="width:100%;">
                        <tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">${cableCostLabel}</td><td class="font-mono">$${cableCostMrc.toLocaleString()}</td></tr>
                        <tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">Backhaul A-End</td><td class="font-mono">$${backhaulAMrc.toLocaleString()}</td></tr>
                        <tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">Backhaul Z-End</td><td class="font-mono">$${backhaulZMrc.toLocaleString()}</td></tr>
                        <tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">Cross Connect A</td><td class="font-mono">$${xcAMrc.toLocaleString()}</td></tr>
                        <tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">Cross Connect Z</td><td class="font-mono">$${xcZMrc.toLocaleString()}</td></tr>
                        ${otherMonthly > 0 ? `<tr><td style="padding:0.4rem 0; color:var(--text-muted); font-size:0.85rem;">Other Monthly</td><td class="font-mono">$${otherMonthly.toLocaleString()}</td></tr>` : ''}
                        <tr style="border-top: 1px solid var(--border-color)"><td style="padding:0.5rem 0; font-weight:600; font-size:0.85rem;">Total MRC</td><td class="font-mono" style="color:var(--accent-danger); font-weight:600">$${totalCostsMrc.toLocaleString()}</td></tr>
                    </table>
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

        <!-- Notes -->
        ${order.notes ? `
        <div style="${sectionStyle}">
            <h4 style="color: var(--text-muted); margin-bottom: 0.5rem; font-size: 0.9rem;">Notes</h4>
            <p style="margin: 0; font-size: 0.9rem; line-height: 1.5;">${order.notes}</p>
        </div>
        ` : ''}
    `;

    context.openModal(`Sales Order: ${order.salesOrderId}`, detailsHtml, null, true);
    context.modalContainer.querySelectorAll('[data-action="renew-from-detail"]').forEach(btn => {
        btn.addEventListener('click', () => {
            context.closeModal();
            context.openRenewModal(btn.dataset.salesOrderId || '');
        });
    });
}
