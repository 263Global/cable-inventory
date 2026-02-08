/**
 * Data normalization and hidden-input sync for edit-mode cost hydration.
 */

export function extractEditCostData(existingOrder, cableSegments) {
    return {
        cableSegments: cableSegments || [],
        cableCost: cableSegments?.[0] || {},
        bhA: existingOrder.costs?.backhaulA || existingOrder.costs?.backhaul?.aEnd || {},
        bhZ: existingOrder.costs?.backhaulZ || existingOrder.costs?.backhaul?.zEnd || {},
        xcA: existingOrder.costs?.crossConnectA || existingOrder.costs?.xcA || existingOrder.costs?.crossConnect?.aEnd || {},
        xcZ: existingOrder.costs?.crossConnectZ || existingOrder.costs?.xcZ || existingOrder.costs?.crossConnect?.zEnd || {},
        otherCosts: existingOrder.costs?.otherCosts || {}
    };
}

function syncHiddenInput(name, value) {
    const input = document.querySelector(`input[name="${name}"]`);
    if (input && value !== undefined && value !== null) {
        input.value = value;
    }
}

export function syncEditCostHiddenInputs(costData) {
    const {
        cableSegments,
        cableCost,
        bhA,
        bhZ,
        xcA,
        xcZ,
        otherCosts
    } = costData;

    syncHiddenInput('costs.cableSegments', JSON.stringify(cableSegments));
    syncHiddenInput('costs.cable.mrc', cableCost.mrc || 0);
    syncHiddenInput('costs.cable.nrc', cableCost.nrc || 0);
    syncHiddenInput('costs.cable.otc', cableCost.otc || 0);
    syncHiddenInput('costs.cable.supplier', cableCost.supplier || '');

    syncHiddenInput('costs.backhaulA.supplier', bhA.supplier || '');
    syncHiddenInput('costs.backhaul.aEnd.monthly', bhA.mrc || bhA.monthly || 0);
    syncHiddenInput('costs.backhaul.aEnd.nrc', bhA.nrc || 0);
    syncHiddenInput('costs.backhaulA.model', bhA.model || 'Lease');
    syncHiddenInput('costs.backhaulA.otc', bhA.otc || 0);
    syncHiddenInput('costs.backhaulA.omRate', bhA.omRate || 0);
    syncHiddenInput('costs.backhaulA.annualOm', bhA.annualOm || 0);
    syncHiddenInput('costs.backhaulA.startDate', bhA.startDate || '');
    syncHiddenInput('costs.backhaulA.termMonths', bhA.termMonths || 12);
    syncHiddenInput('costs.backhaulA.endDate', bhA.endDate || '');

    syncHiddenInput('costs.backhaulZ.supplier', bhZ.supplier || '');
    syncHiddenInput('costs.backhaul.zEnd.monthly', bhZ.mrc || bhZ.monthly || 0);
    syncHiddenInput('costs.backhaul.zEnd.nrc', bhZ.nrc || 0);
    syncHiddenInput('costs.backhaulZ.model', bhZ.model || 'Lease');
    syncHiddenInput('costs.backhaulZ.otc', bhZ.otc || 0);
    syncHiddenInput('costs.backhaulZ.omRate', bhZ.omRate || 0);
    syncHiddenInput('costs.backhaulZ.annualOm', bhZ.annualOm || 0);
    syncHiddenInput('costs.backhaulZ.startDate', bhZ.startDate || '');
    syncHiddenInput('costs.backhaulZ.termMonths', bhZ.termMonths || 12);
    syncHiddenInput('costs.backhaulZ.endDate', bhZ.endDate || '');

    syncHiddenInput('costs.xcA.supplier', xcA.supplier || '');
    syncHiddenInput('costs.crossConnect.aEnd.monthly', xcA.mrc || xcA.monthly || 0);
    syncHiddenInput('costs.crossConnect.aEnd.nrc', xcA.nrc || 0);

    syncHiddenInput('costs.xcZ.supplier', xcZ.supplier || '');
    syncHiddenInput('costs.crossConnect.zEnd.monthly', xcZ.mrc || xcZ.monthly || 0);
    syncHiddenInput('costs.crossConnect.zEnd.nrc', xcZ.nrc || 0);

    syncHiddenInput('costs.other.supplier', otherCosts.supplier || '');
}
