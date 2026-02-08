/**
 * Sync visible cost card inputs into hidden form fields.
 */

const COST_FIELD_MAPPINGS = {
    cable: [
        'costs.cable.supplier', 'costs.cable.orderNo', 'costs.cable.cableSystem',
        'costs.cable.capacity', 'costs.cable.capacityUnit', 'costs.cable.model',
        'costs.cable.protection', 'costs.cable.protectionCableSystem',
        'costs.cable.mrc', 'costs.cable.nrc', 'costs.cable.otc',
        'costs.cable.omRate', 'costs.cable.annualOm',
        'costs.cable.startDate', 'costs.cable.termMonths', 'costs.cable.endDate'
    ],
    backhaulA: [
        'costs.backhaul.aEnd.monthly', 'costs.backhaul.aEnd.nrc',
        'costs.backhaulA.model', 'costs.backhaulA.otc', 'costs.backhaulA.omRate',
        'costs.backhaulA.annualOm', 'costs.backhaulA.startDate',
        'costs.backhaulA.termMonths', 'costs.backhaulA.endDate'
    ],
    backhaulZ: [
        'costs.backhaul.zEnd.monthly', 'costs.backhaul.zEnd.nrc',
        'costs.backhaulZ.model', 'costs.backhaulZ.otc', 'costs.backhaulZ.omRate',
        'costs.backhaulZ.annualOm', 'costs.backhaulZ.startDate',
        'costs.backhaulZ.termMonths', 'costs.backhaulZ.endDate'
    ],
    xcA: ['costs.crossConnect.aEnd.monthly', 'costs.crossConnect.aEnd.nrc'],
    xcZ: ['costs.crossConnect.zEnd.monthly', 'costs.crossConnect.zEnd.nrc'],
    other: ['costs.otherCosts.description', 'costs.otherCosts.oneOff', 'costs.otherCosts.monthly']
};

function getDefaultFieldValue(field) {
    if (field.includes('model')) return 'Lease';
    if (field.includes('protection') && !field.includes('System')) return 'Unprotected';
    if (field.includes('capacityUnit')) return 'Gbps';
    if (field.includes('termMonths')) return '12';
    if (
        field.includes('description')
        || field.includes('supplier')
        || field.includes('orderNo')
        || field.includes('cableSystem')
        || field.includes('protectionCableSystem')
        || field.includes('Date')
    ) {
        return '';
    }
    return '0';
}

function hasCableSegmentData(segment) {
    const numericFields = [
        segment.capacity,
        segment.mrc,
        segment.nrc,
        segment.otc,
        segment.omRate,
        segment.annualOm,
        segment.termMonths
    ];
    const stringFields = [
        segment.supplier,
        segment.orderNo,
        segment.cableSystem,
        segment.protectionCableSystem,
        segment.startDate,
        segment.endDate,
        segment.notes
    ];

    return numericFields.some((value) => Number(value) > 0)
        || stringFields.some((value) => value)
        || segment.model !== 'Lease'
        || segment.protection !== 'Unprotected';
}

export function createCostSyncController({ cardsContainer, updateCostDisplays }) {
    const syncCableSegments = () => {
        const cableSegmentsInput = document.querySelector('input[name="costs.cableSegments"]');
        if (!cableSegmentsInput) return;

        const cards = Array.from(cardsContainer.querySelectorAll('.cost-card[data-cost-type="cable"]'));
        const segments = cards.map((card) => {
            const getValue = (selector) => card.querySelector(selector)?.value || '';
            const getNumber = (selector) => Number(getValue(selector) || 0);
            const supplier = card.querySelector('input[name="costs.cable.supplier"]')?.value || '';
            const model = card.querySelector('input[name="costs.cable.model"]')?.value || 'Lease';
            const protection = card.querySelector('input[name="costs.cable.protection"]')?.value || 'Unprotected';

            return {
                supplier,
                orderNo: getValue('[data-field="costs.cable.orderNo"]'),
                cableSystem: getValue('[data-field="costs.cable.cableSystem"]'),
                capacity: getNumber('[data-field="costs.cable.capacity"]'),
                capacityUnit: getValue('[data-field="costs.cable.capacityUnit"]') || 'Gbps',
                model,
                protection,
                protectionCableSystem: getValue('[data-field="costs.cable.protectionCableSystem"]'),
                mrc: getNumber('[data-field="costs.cable.mrc"]'),
                nrc: getNumber('[data-field="costs.cable.nrc"]'),
                otc: getNumber('[data-field="costs.cable.otc"]'),
                omRate: getNumber('[data-field="costs.cable.omRate"]'),
                annualOm: getNumber('[data-field="costs.cable.annualOm"]'),
                startDate: getValue('[data-field="costs.cable.startDate"]'),
                termMonths: getNumber('[data-field="costs.cable.termMonths"]'),
                endDate: getValue('[data-field="costs.cable.endDate"]'),
                notes: getValue('[data-field="costs.cable.notes"]')
            };
        }).filter(hasCableSegmentData);

        cableSegmentsInput.value = JSON.stringify(segments);
    };

    const syncCostInputs = () => {
        cardsContainer.querySelectorAll('.cost-input').forEach((input) => {
            const field = input.dataset.field;
            if (!field) return;

            const card = input.closest('.cost-card');
            if (card?.dataset.costType === 'cable') return;

            const hiddenInput = document.querySelector(`[name="${field}"]`);
            if (hiddenInput) {
                hiddenInput.value = input.value;
            }
        });

        syncCableSegments();
        updateCostDisplays();
    };

    const resetCostInputs = (type) => {
        const fields = COST_FIELD_MAPPINGS[type] || [];

        fields.forEach((field) => {
            const input = document.querySelector(`[name="${field}"]`);
            if (input) {
                input.value = getDefaultFieldValue(field);
            }
        });
    };

    return {
        syncCostInputs,
        syncCableSegments,
        resetCostInputs
    };
}
