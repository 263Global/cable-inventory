/**
 * Financial Calculations Module
 * Unified profit calculation engine for sales orders
 * 
 * This module provides financial calculation utilities that are used
 * throughout the application for computing order profitability metrics.
 */

/**
 * Computes financial metrics for a sales order based on Mixed Recognition Model
 * @param {object} order - Sales order object
 * @returns {object} Financial metrics including:
 *   - monthlyRevenue: Monthly revenue amount
 *   - monthlyProfit: Monthly profit amount
 *   - marginPercent: Profit margin percentage
 *   - isIruResale: Boolean indicating if this is an IRU Resale type
 *   - firstMonthProfit: First month profit (for IRU Resale)
 *   - firstMonthMargin: First month margin percentage (for IRU Resale)
 *   - recurringMonthlyProfit: Recurring monthly profit (for IRU Resale)
 *   - recurringMargin: Recurring margin percentage (for IRU Resale)
 */
function computeOrderFinancials(order) {
    const salesModel = order.salesModel || 'Lease';
    const salesType = order.salesType || 'Resale';
    const salesTerm = order.dates?.term || 12;
    const salesCapacity = order.capacity?.value || 1;

    // Get linked inventory for Inventory/Hybrid types
    const inventoryLink = order.inventoryLink;
    const linkedResource = inventoryLink ? window.Store?.getInventory()?.find(r => r.resourceId === inventoryLink) : null;
    const inventoryCapacity = linkedResource?.capacity?.value || 1;
    const capacityRatio = salesCapacity / inventoryCapacity;

    // Calculate Inventory Monthly Cost (if applicable)
    let inventoryMonthlyCost = 0;
    if (linkedResource && (salesType === 'Inventory' || salesType === 'Hybrid' || salesType === 'Swapped Out')) {
        inventoryMonthlyCost = computeInventoryMonthlyCost(order, linkedResource, capacityRatio);
    }

    // Swapped Out: revenue uses market price fields, cost uses linked inventory

    // Get Operating Costs (Backhaul, XC, Other)
    const costs = order.costs || {};
    const getBackhaulMonthlyCost = (backhaul) => {
        if (!backhaul) return 0;
        if (backhaul.model === 'IRU') {
            const termMonths = backhaul.termMonths || salesTerm;
            const monthlyOtc = termMonths > 0 ? (backhaul.otc || 0) / termMonths : 0;
            const monthlyOm = (backhaul.annualOm || 0) / 12;
            return monthlyOtc + monthlyOm;
        }
        return backhaul.monthly || 0;
    };
    const backhaulA = costs.backhaul?.aEnd || costs.backhaulA || null;
    const backhaulZ = costs.backhaul?.zEnd || costs.backhaulZ || null;
    const backhaulMRC = getBackhaulMonthlyCost(backhaulA) + getBackhaulMonthlyCost(backhaulZ);
    const xcMRC = (costs.crossConnect?.aEnd?.monthly || 0) + (costs.crossConnect?.zEnd?.monthly || 0);
    const otherMonthly = costs.otherCosts?.monthly || 0;
    const operatingCosts = backhaulMRC + xcMRC + otherMonthly;

    // Initialize results
    let monthlyRevenue = 0;
    let monthlyProfit = 0;
    let firstMonthProfit = 0;
    let firstMonthMargin = 0;
    let recurringMonthlyProfit = 0;
    let recurringMargin = 0;
    let isIruResale = false;

    if (salesModel === 'Lease') {
        // ========== LEASE MODEL ==========
        const mrcSales = order.financials?.mrcSales || 0;
        monthlyRevenue = mrcSales;

        // Get Cable MRC (for Resale and Hybrid)
        let cableMRC = 0;
        if (salesType === 'Resale' || salesType === 'Hybrid') {
            const cableModel = costs.cable?.model || 'Lease';
            if (cableModel === 'Lease') {
                cableMRC = costs.cable?.mrc || 0;
            } else {
                cableMRC = (costs.cable?.annualOm || 0) / 12;
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
        const otcRevenue = order.financials?.otc || 0;
        const annualOmRevenue = order.financials?.annualOm || 0;
        const monthlyOmRevenue = annualOmRevenue / 12;

        // Get Cable costs (for Resale and Hybrid)
        const cableOtc = costs.cable?.otc || 0;
        const cableAnnualOm = costs.cable?.annualOm || 0;
        const cableTerm = costs.cable?.termMonths || salesTerm;
        const cableMonthlyOtc = cableOtc / cableTerm;
        const cableMonthlyOm = cableAnnualOm / 12;

        switch (salesType) {
            case 'Resale':
                // IRU Resale: OTC profit captured in first month
                isIruResale = true;
                const otcProfit = otcRevenue - cableOtc;
                const monthlyOmProfit = monthlyOmRevenue - cableMonthlyOm;

                // First month: OTC profit + monthly O&M profit - operating costs
                firstMonthProfit = otcProfit + monthlyOmProfit - operatingCosts;
                // First month margin: based on total first month value (OTC + O&M)
                const firstMonthRevenue = otcRevenue + monthlyOmRevenue;
                firstMonthMargin = firstMonthRevenue > 0 ? (firstMonthProfit / firstMonthRevenue) * 100 : 0;

                // Recurring months: just O&M profit - operating costs
                recurringMonthlyProfit = monthlyOmProfit - operatingCosts;
                recurringMargin = monthlyOmRevenue > 0 ? (recurringMonthlyProfit / monthlyOmRevenue) * 100 : 0;

                // For general display, use recurring values
                monthlyRevenue = monthlyOmRevenue;
                monthlyProfit = recurringMonthlyProfit;
                break;

            case 'Inventory':
                // IRU Inventory: OTC revenue amortized monthly
                const monthlyOtcRevenue = otcRevenue / salesTerm;
                monthlyRevenue = monthlyOtcRevenue + monthlyOmRevenue;
                monthlyProfit = monthlyRevenue - inventoryMonthlyCost - operatingCosts;
                break;

            case 'Hybrid':
                // IRU Hybrid: OTC revenue amortized, both inventory and cable costs
                const monthlyOtcRev = otcRevenue / salesTerm;
                monthlyRevenue = monthlyOtcRev + monthlyOmRevenue;
                monthlyProfit = monthlyRevenue - inventoryMonthlyCost - cableMonthlyOtc - cableMonthlyOm - operatingCosts;
                break;

            case 'Swapped Out':
                // Swapped Out: revenue uses market price fields; cost from linked inventory
                const swapMonthlyOtcRevenue = otcRevenue / salesTerm;
                monthlyRevenue = swapMonthlyOtcRevenue + monthlyOmRevenue;
                monthlyProfit = monthlyRevenue - inventoryMonthlyCost - operatingCosts;
                break;

            default:
                monthlyProfit = 0;
        }
    }

    // Calculate general margin
    const marginPercent = monthlyRevenue > 0 ? (monthlyProfit / monthlyRevenue) * 100 : 0;

    return {
        monthlyRevenue,
        monthlyProfit,
        marginPercent,
        isIruResale,
        firstMonthProfit,
        firstMonthMargin,
        recurringMonthlyProfit,
        recurringMargin
    };
}

// Export to global scope for use by App
window.computeOrderFinancials = computeOrderFinancials;
window.computeInventoryMonthlyCost = computeInventoryMonthlyCost;

function computeInventoryMonthlyCost(order, linkedResource, capacityRatioOverride = null) {
    if (!linkedResource) return 0;

    const salesCapacity = order.capacity?.value || 1;
    const inventoryCapacity = linkedResource.capacity?.value || 1;
    const capacityRatio = capacityRatioOverride !== null
        ? capacityRatioOverride
        : (inventoryCapacity > 0 ? (salesCapacity / inventoryCapacity) : 0);

    if (linkedResource.costMode === 'batches') {
        let totalCost = 0;
        const baseCost = linkedResource.baseCost || {};
        const baseModel = baseCost.model || 'IRU';
        let baseMonthly = 0;
        if (baseModel === 'IRU') {
            const baseTerm = baseCost.termMonths || 1;
            const baseOtc = baseCost.otc || 0;
            const baseAnnualOm = (baseCost.annualOm || 0) || (baseOtc * (baseCost.omRate || 0) / 100);
            baseMonthly = (baseOtc / baseTerm) + (baseAnnualOm / 12);
        } else {
            baseMonthly = baseCost.mrc || 0;
        }
        totalCost += baseMonthly * capacityRatio;

        const allocations = order.batchAllocations?.length
            ? order.batchAllocations
            : (window.Store?.getSalesOrderBatches(order.salesOrderId) || []);

        const batches = linkedResource.batches || (window.Store?.getInventoryBatches(linkedResource.resourceId) || []);
        const refDate = (() => {
            if (order.dates?.start) {
                const parsed = new Date(order.dates.start);
                if (!Number.isNaN(parsed.getTime())) return parsed;
            }
            return new Date();
        })();

        allocations.forEach(allocation => {
            const batch = batches.find(b => b.batchId === allocation.batchId);
            if (!batch) return;
            if (batch.status === 'Planned' || batch.status === 'Ended') return;
            if (batch.startDate) {
                const start = new Date(batch.startDate);
                if (!Number.isNaN(start.getTime()) && start > refDate) return;
            }
            const batchCapacity = batch.capacity?.value || 0;
            if (batchCapacity <= 0) return;
            const ratio = (allocation.capacityAllocated || 0) / batchCapacity;
            let batchMonthly = 0;
            if ((batch.model || 'IRU') === 'IRU') {
                const term = batch.financials?.termMonths || 1;
                const batchOtc = batch.financials?.otc || 0;
                const batchAnnualOm = (batch.financials?.annualOm || 0) || (batchOtc * (batch.financials?.omRate || 0) / 100);
                batchMonthly = (batchOtc / term) + (batchAnnualOm / 12);
            } else {
                batchMonthly = batch.financials?.mrc || 0;
            }
            totalCost += batchMonthly * ratio;
        });
        return totalCost;
    }

    const invOwnership = linkedResource.acquisition?.ownership || 'Leased';
    if (invOwnership === 'IRU') {
        const invOtc = linkedResource.financials?.otc || 0;
        const invTerm = linkedResource.financials?.term || 1;
        const invAnnualOm = linkedResource.financials?.annualOmCost || 0;
        return ((invOtc / invTerm) + (invAnnualOm / 12)) * capacityRatio;
    }
    return (linkedResource.financials?.mrc || 0) * capacityRatio;
}
