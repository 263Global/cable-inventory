/**
 * Card-type specific behavior hooks.
 */

function bindEndDateCalculation({ startDateInput, termInput, endDateInput, onSync }) {
    const calculateEndDate = () => {
        if (!startDateInput || !termInput || !endDateInput || !startDateInput.value) return;

        const end = new Date(startDateInput.value);
        end.setMonth(end.getMonth() + (parseInt(termInput.value, 10) || 0));
        end.setDate(end.getDate() - 1);
        endDateInput.value = end.toISOString().split('T')[0];
        onSync();
    };

    startDateInput?.addEventListener('change', calculateEndDate);
    termInput?.addEventListener('input', calculateEndDate);
}

function bindAnnualOmCalculation({ otcInput, omRateInput, annualOmDisplay, onSync }) {
    const calculateAnnualOm = () => {
        if (!otcInput || !omRateInput || !annualOmDisplay) return;

        const otc = Number(otcInput.value) || 0;
        const rate = Number(omRateInput.value) || 0;
        annualOmDisplay.value = ((otc * rate) / 100).toFixed(2);
        onSync();
    };

    otcInput?.addEventListener('input', calculateAnnualOm);
    omRateInput?.addEventListener('input', calculateAnnualOm);
}

function attachCableHandlers(card, { onSync, onRecalculate }) {
    const leaseFields = card.querySelector('.cable-lease-fields');
    const iruFields = card.querySelector('.cable-iru-fields');
    const protectionSystemContainer = card.querySelector('.cable-protection-system-container');

    setTimeout(() => {
        const modelInput = card.querySelector('input[name="costs.cable.model"]');
        if (modelInput && leaseFields && iruFields) {
            modelInput.addEventListener('change', () => {
                const isIRU = modelInput.value === 'IRU';
                leaseFields.style.display = isIRU ? 'none' : 'block';
                iruFields.style.display = isIRU ? 'block' : 'none';
                onSync();
                onRecalculate();
            });
        }

        const protectionInput = card.querySelector('input[name="costs.cable.protection"]');
        if (protectionInput && protectionSystemContainer) {
            protectionInput.addEventListener('change', () => {
                protectionSystemContainer.style.display = protectionInput.value === 'Protected' ? 'block' : 'none';
                onSync();
            });
        }
    }, 50);

    bindAnnualOmCalculation({
        otcInput: card.querySelector('.cable-otc-input'),
        omRateInput: card.querySelector('.cable-om-rate-input'),
        annualOmDisplay: card.querySelector('.cable-annual-om-display'),
        onSync
    });

    bindEndDateCalculation({
        startDateInput: card.querySelector('.cable-start-date'),
        termInput: card.querySelector('.cable-term-months'),
        endDateInput: card.querySelector('.cable-end-date'),
        onSync
    });
}

function attachBackhaulHandlers(type, card, { onSync, onRecalculate }) {
    const isA = type === 'backhaulA';
    const modelSelect = card.querySelector(isA ? '.bh-a-cost-model-select' : '.bh-z-cost-model-select');
    const leaseFields = card.querySelector(isA ? '.bh-a-lease-fields' : '.bh-z-lease-fields');
    const iruFields = card.querySelector(isA ? '.bh-a-iru-fields' : '.bh-z-iru-fields');

    if (modelSelect && leaseFields && iruFields) {
        modelSelect.addEventListener('change', (event) => {
            const isIRU = event.target.value === 'IRU';
            leaseFields.style.display = isIRU ? 'none' : 'block';
            iruFields.style.display = isIRU ? 'block' : 'none';
            onSync();
            onRecalculate();
        });
    }

    bindAnnualOmCalculation({
        otcInput: card.querySelector(isA ? '.bh-a-otc' : '.bh-z-otc'),
        omRateInput: card.querySelector(isA ? '.bh-a-om-rate' : '.bh-z-om-rate'),
        annualOmDisplay: card.querySelector(isA ? '.bh-a-annual-om' : '.bh-z-annual-om'),
        onSync
    });

    bindEndDateCalculation({
        startDateInput: card.querySelector(isA ? '.bh-a-start-date' : '.bh-z-start-date'),
        termInput: card.querySelector(isA ? '.bh-a-term' : '.bh-z-term'),
        endDateInput: card.querySelector(isA ? '.bh-a-end-date' : '.bh-z-end-date'),
        onSync
    });
}

export function attachCostCardSpecialHandlers(type, card, { syncCostInputs, calculateSalesFinancials }) {
    const options = {
        onSync: syncCostInputs,
        onRecalculate: calculateSalesFinancials
    };

    if (type === 'cable') {
        attachCableHandlers(card, options);
    }

    if (type === 'backhaulA' || type === 'backhaulZ') {
        attachBackhaulHandlers(type, card, options);
    }

    if (type === 'xcA') {
        bindEndDateCalculation({
            startDateInput: card.querySelector('.xc-a-start-date'),
            termInput: card.querySelector('.xc-a-term'),
            endDateInput: card.querySelector('.xc-a-end-date'),
            onSync: syncCostInputs
        });
    }

    if (type === 'xcZ') {
        bindEndDateCalculation({
            startDateInput: card.querySelector('.xc-z-start-date'),
            termInput: card.querySelector('.xc-z-term'),
            endDateInput: card.querySelector('.xc-z-end-date'),
            onSync: syncCostInputs
        });
    }

    if (type === 'other') {
        bindEndDateCalculation({
            startDateInput: card.querySelector('.other-start-date'),
            termInput: card.querySelector('.other-term'),
            endDateInput: card.querySelector('.other-end-date'),
            onSync: syncCostInputs
        });
    }
}
