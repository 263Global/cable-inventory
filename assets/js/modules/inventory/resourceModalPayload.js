/**
 * Helpers to read inventory form values and build payloads.
 */

function getFieldValue(form, name, fallback = '') {
    return form.querySelector(`[name="${name}"]`)?.value ?? fallback;
}

function getNumericField(form, name, fallback = 0) {
    return Number(getFieldValue(form, name, fallback));
}

export function buildInventoryPayloadFromForm(form, { resolveSupplierName }) {
    const handoffTypeValue = getFieldValue(form, 'handoffType');
    const handoffTypeCustomValue = getFieldValue(form, 'handoffTypeCustom');
    const finalHandoffType = handoffTypeValue === 'Other' ? handoffTypeCustomValue : handoffTypeValue;
    const ownership = getFieldValue(form, 'acquisition.ownership');
    const oneTimeCost = getNumericField(form, 'financials.otc');
    const supplierId = getFieldValue(form, 'acquisition.supplierId');

    return {
        resourceId: getFieldValue(form, 'resourceId'),
        status: getFieldValue(form, 'status'),
        acquisition: {
            type: getFieldValue(form, 'acquisition.type'),
            ownership,
            supplierId,
            supplierName: resolveSupplierName(supplierId),
            contractRef: getFieldValue(form, 'acquisition.contractRef')
        },
        cableSystem: getFieldValue(form, 'cableSystem'),
        segmentType: getFieldValue(form, 'segmentType'),
        handoffType: finalHandoffType,
        routeDescription: getFieldValue(form, 'routeDescription'),
        protection: getFieldValue(form, 'protection'),
        protectionCableSystem: getFieldValue(form, 'protectionCableSystem'),
        capacity: {
            value: getNumericField(form, 'capacity.value'),
            unit: getFieldValue(form, 'capacity.unit')
        },
        location: {
            aEnd: {
                country: getFieldValue(form, 'location.aEnd.country'),
                city: getFieldValue(form, 'location.aEnd.city'),
                pop: getFieldValue(form, 'location.aEnd.pop'),
                port: getFieldValue(form, 'location.aEnd.port'),
                device: getFieldValue(form, 'location.aEnd.device')
            },
            zEnd: {
                country: getFieldValue(form, 'location.zEnd.country'),
                city: getFieldValue(form, 'location.zEnd.city'),
                pop: getFieldValue(form, 'location.zEnd.pop'),
                port: getFieldValue(form, 'location.zEnd.port'),
                device: getFieldValue(form, 'location.zEnd.device')
            }
        },
        financials: {
            mrc: getNumericField(form, 'financials.mrc'),
            nrc: ownership === 'IRU' ? 0 : oneTimeCost,
            otc: ownership === 'IRU' ? oneTimeCost : 0,
            term: getNumericField(form, 'financials.term'),
            omRate: getNumericField(form, 'financials.omRate'),
            annualOmCost: getNumericField(form, 'financials.annualOmCost')
        },
        costMode: getFieldValue(form, 'costMode', 'single') || 'single',
        baseCost: {
            orderId: getFieldValue(form, 'baseCost.orderId'),
            model: getFieldValue(form, 'baseCost.model', 'IRU') || 'IRU',
            mrc: getNumericField(form, 'baseCost.mrc'),
            otc: getNumericField(form, 'baseCost.otc'),
            omRate: getNumericField(form, 'baseCost.omRate'),
            annualOm: getNumericField(form, 'baseCost.annualOm'),
            termMonths: getNumericField(form, 'baseCost.termMonths')
        },
        dates: {
            start: getFieldValue(form, 'dates.start'),
            end: getFieldValue(form, 'dates.end')
        }
    };
}

export function buildInventoryBatchesFromForm(form, inventoryItem) {
    const batchRows = Array.from(form.querySelectorAll('.batch-row'));

    return batchRows.map((row) => {
        const getBatchField = (field) => row.querySelector(`[data-field="${field}"]`)?.value || '';
        const model = getBatchField('model') || 'IRU';

        return {
            batchId: row.dataset.batchId || `BAT-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
            resourceId: inventoryItem.resourceId,
            orderId: getBatchField('orderId'),
            model,
            capacity: {
                value: Number(getBatchField('capacity') || 0),
                unit: inventoryItem.capacity.unit
            },
            financials: {
                mrc: Number(getBatchField('mrc') || 0),
                otc: Number(getBatchField('otc') || 0),
                omRate: Number(getBatchField('omRate') || 0),
                annualOm: Number(getBatchField('annualOm') || 0),
                termMonths: Number(getBatchField('termMonths') || 0)
            },
            startDate: getBatchField('startDate'),
            status: getBatchField('status') || 'Planned'
        };
    }).filter((batch) => batch.capacity.value > 0);
}

export function validateInventoryBatchCapacity(inventoryItem, batches) {
    if (inventoryItem.costMode !== 'batches') return '';

    const baseCapacity = inventoryItem.capacity?.value || 0;
    const batchTotal = batches.reduce((sum, batch) => sum + (batch.capacity?.value || 0), 0);

    if (batchTotal > baseCapacity) {
        return `Total batch capacity (${batchTotal} ${inventoryItem.capacity?.unit || 'Gbps'}) exceeds base capacity (${baseCapacity} ${inventoryItem.capacity?.unit || 'Gbps'}).`;
    }

    return '';
}
