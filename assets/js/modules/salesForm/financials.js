/**
 * Sales form financial calculations.
 */

export function calculateSalesFinancials(context) {
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
    if (linkedResource && (salesType === 'Inventory' || salesType === 'Hybrid' || salesType === 'Swapped Out')) {
        const rawAllocations = document.getElementById('batch-allocations-input')?.value || '[]';
        let batchAllocations = [];
        try {
            batchAllocations = JSON.parse(rawAllocations) || [];
        } catch {
            batchAllocations = [];
        }
        if (window.computeInventoryMonthlyCost) {
            inventoryMonthlyCost = window.computeInventoryMonthlyCost({
                capacity: { value: salesCapacity },
                dates: { start: getVal('dates.start') },
                batchAllocations
            }, linkedResource, capacityRatio);
        } else {
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
    }

    // ===== Get Operating Costs (Backhaul, XC, Other) =====
    const getBackhaulMonthlyCost = (suffix) => {
        const model = getVal(`costs.backhaul${suffix}.model`) || 'Lease';
        if (model === 'IRU') {
            const otc = getValue(`costs.backhaul${suffix}.otc`);
            const annualOm = getValue(`costs.backhaul${suffix}.annualOm`);
            const termMonths = getValue(`costs.backhaul${suffix}.termMonths`) || salesTerm;
            const monthlyOtc = termMonths > 0 ? (otc / termMonths) : 0;
            return monthlyOtc + (annualOm / 12);
        }
        return getValue(`costs.backhaul.${suffix === 'A' ? 'aEnd' : 'zEnd'}.monthly`);
    };
    const backhaulMRC = getBackhaulMonthlyCost('A') + getBackhaulMonthlyCost('Z');
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
            case 'Swapped Out':
                monthlyProfit = mrcSales - inventoryMonthlyCost - operatingCosts;
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
                // Swapped Out: market price revenue minus linked inventory cost
                const swapMonthlyOtcRevenue = otcRevenue / salesTerm;
                monthlyRevenue = swapMonthlyOtcRevenue + monthlyOmRevenue;
                monthlyProfit = monthlyRevenue - inventoryMonthlyCost - operatingCosts;
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

    // ===== Check for cost date mismatch warning =====
    const salesStartDate = getVal('dates.start');
    const cableStartDate = getVal('costs.cable.startDate');
    const warningEl = document.getElementById('cost-date-warning');
    const warningText = document.getElementById('cost-date-warning-text');

    if (warningEl && salesStartDate && cableStartDate && cableStartDate < salesStartDate) {
        warningEl.style.display = 'block';
        warningText.textContent = `成本开始日期 (${cableStartDate}) 早于销售合同 (${salesStartDate})`;
    } else if (warningEl) {
        warningEl.style.display = 'none';
    }
}
