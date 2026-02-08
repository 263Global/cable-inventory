/**
 * UI hydration for existing cost cards in edit mode.
 */

function populateCardField(selector, value, allowZero = false) {
    const field = document.querySelector(selector);
    if (!field || value === undefined || value === null || value === '') return;
    if (!allowZero && value === 0) return;

    field.value = value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
}

function populateSearchableDropdown(containerOrId, value) {
    if (!value) return;

    const container = typeof containerOrId === 'string'
        ? document.getElementById(containerOrId)
        : containerOrId;

    if (!container) return;

    const hiddenInput = container.querySelector('input[type="hidden"]');
    const selectedDisplay = container.querySelector('.searchable-dropdown-input');
    const options = container.querySelectorAll('.searchable-dropdown-option');

    if (hiddenInput) hiddenInput.value = value;

    options.forEach((option) => {
        if (option.dataset.value === value) {
            option.classList.add('selected');
            if (selectedDisplay) {
                const label = option.querySelector('.option-label')?.textContent || option.textContent;
                selectedDisplay.textContent = label;
                selectedDisplay.value = label;
                selectedDisplay.dataset.selectedValue = value;
            }
        } else {
            option.classList.remove('selected');
        }
    });
}

function showEditCostPanels() {
    const summary = document.getElementById('cost-summary-readonly');
    if (summary) summary.style.display = 'none';

    const costButtons = document.getElementById('cost-buttons');
    const cardsContainer = document.getElementById('cost-cards-container');
    const costTotals = document.getElementById('cost-totals');

    if (costButtons) costButtons.style.display = 'flex';
    if (cardsContainer) cardsContainer.style.display = 'block';
    if (costTotals) costTotals.style.display = 'block';
}

function hydrateCableCards(context, cableSegments) {
    if (!Array.isArray(cableSegments) || cableSegments.length === 0) return;

    const hydrateCableCard = (cableCard, segment) => {
        if (!cableCard || !segment) return;

        const populateField = (dataField, value, allowZero = false) => {
            if (value === undefined || value === null || value === '') return;
            if (!allowZero && value === 0) return;

            const field = cableCard.querySelector(`[data-field="${dataField}"]`);
            if (field) {
                field.value = value;
                field.dispatchEvent(new Event('input', { bubbles: true }));
            }
        };

        const populateSimpleDropdown = (fieldName, value) => {
            if (!value) return;

            const hiddenInput = cableCard.querySelector(`input[type="hidden"][name="${fieldName}"]`);
            if (!hiddenInput) return;

            hiddenInput.value = value;
            const container = hiddenInput.closest('.simple-dropdown');
            if (!container) return;

            const selectedDisplay = container.querySelector('.simple-dropdown-selected');
            const options = container.querySelectorAll('.simple-dropdown-option');

            options.forEach((option) => {
                if (option.dataset.value === value) {
                    option.classList.add('selected');
                    if (selectedDisplay) selectedDisplay.textContent = option.textContent;
                } else {
                    option.classList.remove('selected');
                }
            });
        };

        populateField('costs.cable.orderNo', segment.orderNo);
        populateField('costs.cable.cableSystem', segment.cableSystem);
        populateField('costs.cable.capacity', segment.capacity, true);
        populateField('costs.cable.notes', segment.notes);

        const capacityUnitSelect = cableCard.querySelector('[data-field="costs.cable.capacityUnit"]');
        if (capacityUnitSelect && segment.capacityUnit) {
            capacityUnitSelect.value = segment.capacityUnit;
        }

        populateSimpleDropdown('costs.cable.model', segment.model);
        populateSimpleDropdown('costs.cable.protection', segment.protection);

        if (segment.protection && segment.protection !== 'Unprotected') {
            const protectionSystemContainer = cableCard.querySelector('.cable-protection-system-container');
            if (protectionSystemContainer) protectionSystemContainer.style.display = 'block';
            populateField('costs.cable.protectionCableSystem', segment.protectionCableSystem);
        }

        const supplierContainer = cableCard.querySelector('.searchable-dropdown');
        if (supplierContainer && segment.supplier) {
            populateSearchableDropdown(supplierContainer, segment.supplier);
        }

        const model = segment.model || 'Lease';
        const leaseFields = cableCard.querySelector('.cable-lease-fields');
        const iruFields = cableCard.querySelector('.cable-iru-fields');

        if (model === 'IRU') {
            if (leaseFields) leaseFields.style.display = 'none';
            if (iruFields) iruFields.style.display = 'block';
            populateField('costs.cable.otc', segment.otc, true);
            populateField('costs.cable.omRate', segment.omRate, true);
            populateField('costs.cable.annualOm', segment.annualOm, true);
        } else {
            if (leaseFields) leaseFields.style.display = 'block';
            if (iruFields) iruFields.style.display = 'none';
            populateField('costs.cable.mrc', segment.mrc, true);
            populateField('costs.cable.nrc', segment.nrc, true);
        }

        populateField('costs.cable.startDate', segment.startDate);
        populateField('costs.cable.termMonths', segment.termMonths || 12, true);
        populateField('costs.cable.endDate', segment.endDate);

        context.calculateSalesFinancials();
    };

    const addCableBtn = document.querySelector('.cost-add-btn[data-cost-type="cable"]');

    const ensureCableCards = () => {
        const existingCards = Array.from(document.querySelectorAll('.cost-card[data-cost-type="cable"]'));
        const needed = Math.max(0, cableSegments.length - existingCards.length);

        for (let index = 0; index < needed; index += 1) {
            addCableBtn?.click();
        }

        const cards = Array.from(document.querySelectorAll('.cost-card[data-cost-type="cable"]'));
        cableSegments.forEach((segment, index) => {
            const card = cards[index];
            if (card) hydrateCableCard(card, segment);
        });
    };

    setTimeout(ensureCableCards, 100);
}

function hydrateSingleCard({
    hasData,
    cardSelector,
    addButtonSelector,
    hydrateCard,
    newCardDelay
}) {
    if (!hasData) return;

    const existingCard = document.querySelector(cardSelector);
    if (existingCard) {
        setTimeout(hydrateCard, 50);
        return;
    }

    const addButton = document.querySelector(addButtonSelector);
    if (addButton) {
        addButton.click();
        setTimeout(hydrateCard, newCardDelay);
    }
}

function hydrateBackhaulCard(context, type, data) {
    const isA = type === 'backhaulA';
    const monthly = data.mrc || data.monthly || 0;
    const nrc = data.nrc || 0;
    const hasData = monthly > 0 || nrc > 0 || data.supplier || data.otc > 0;

    const hydrateCard = () => {
        const card = document.querySelector(`.cost-card[data-cost-type="${type}"]`);
        if (!card) return;

        populateSearchableDropdown(card.querySelector('.searchable-dropdown'), data.supplier);
        populateCardField(`[data-field="costs.${type}.orderNo"]`, data.orderNo);

        const modelClass = isA ? '.bh-a-cost-model-select' : '.bh-z-cost-model-select';
        const leaseClass = isA ? '.bh-a-lease-fields' : '.bh-z-lease-fields';
        const iruClass = isA ? '.bh-a-iru-fields' : '.bh-z-iru-fields';
        const modelSelect = card.querySelector(modelClass);

        if (modelSelect && data.model) {
            modelSelect.value = data.model;
            if (data.model === 'IRU') {
                card.querySelector(leaseClass)?.style.setProperty('display', 'none');
                card.querySelector(iruClass)?.style.setProperty('display', 'block');
            }
        }

        const monthlyField = isA ? 'costs.backhaul.aEnd.monthly' : 'costs.backhaul.zEnd.monthly';
        const nrcField = isA ? 'costs.backhaul.aEnd.nrc' : 'costs.backhaul.zEnd.nrc';

        populateCardField(`[data-field="${monthlyField}"]`, monthly, true);
        populateCardField(`[data-field="${nrcField}"]`, nrc, true);
        populateCardField(`[data-field="costs.${type}.otc"]`, data.otc, true);
        populateCardField(`[data-field="costs.${type}.omRate"]`, data.omRate, true);
        populateCardField(`[data-field="costs.${type}.annualOm"]`, data.annualOm, true);
        populateCardField(`[data-field="costs.${type}.startDate"]`, data.startDate);
        populateCardField(`[data-field="costs.${type}.termMonths"]`, data.termMonths || 12, true);
        populateCardField(`[data-field="costs.${type}.endDate"]`, data.endDate);
        populateCardField(`[data-field="costs.${type}.notes"]`, data.notes);

        context.calculateSalesFinancials();
    };

    hydrateSingleCard({
        hasData,
        cardSelector: `.cost-card[data-cost-type="${type}"]`,
        addButtonSelector: `.cost-toggle-btn[data-cost-type="${type}"]`,
        hydrateCard,
        newCardDelay: isA ? 150 : 200
    });
}

function hydrateCrossConnectCard(context, type, data) {
    const isA = type === 'xcA';
    const monthly = data.mrc || data.monthly || 0;
    const nrc = data.nrc || 0;
    const hasData = monthly > 0 || nrc > 0 || data.supplier;

    const hydrateCard = () => {
        const card = document.querySelector(`.cost-card[data-cost-type="${type}"]`);
        if (!card) return;

        populateSearchableDropdown(card.querySelector('.searchable-dropdown'), data.supplier);
        populateCardField(`[data-field="costs.${type}.orderNo"]`, data.orderNo);

        const monthlyField = isA ? 'costs.crossConnect.aEnd.monthly' : 'costs.crossConnect.zEnd.monthly';
        const nrcField = isA ? 'costs.crossConnect.aEnd.nrc' : 'costs.crossConnect.zEnd.nrc';

        populateCardField(`[data-field="${monthlyField}"]`, monthly, true);
        populateCardField(`[data-field="${nrcField}"]`, nrc, true);
        populateCardField(`[data-field="costs.${type}.startDate"]`, data.startDate);
        populateCardField(`[data-field="costs.${type}.termMonths"]`, data.termMonths || 12, true);
        populateCardField(`[data-field="costs.${type}.endDate"]`, data.endDate);
        populateCardField(`[data-field="costs.${type}.notes"]`, data.notes);

        context.calculateSalesFinancials();
    };

    hydrateSingleCard({
        hasData,
        cardSelector: `.cost-card[data-cost-type="${type}"]`,
        addButtonSelector: `.cost-toggle-btn[data-cost-type="${type}"]`,
        hydrateCard,
        newCardDelay: isA ? 250 : 300
    });
}

function hydrateOtherCard(context, otherCosts) {
    const hasData = otherCosts.monthly > 0
        || otherCosts.oneOff > 0
        || otherCosts.description
        || otherCosts.supplier;

    const hydrateCard = () => {
        const card = document.querySelector('.cost-card[data-cost-type="other"]');
        if (!card) return;

        populateCardField('[data-field="costs.otherCosts.description"]', otherCosts.description);
        populateCardField('[data-field="costs.otherCosts.oneOff"]', otherCosts.oneOff, true);
        populateCardField('[data-field="costs.otherCosts.monthly"]', otherCosts.monthly, true);
        populateSearchableDropdown(card.querySelector('.searchable-dropdown'), otherCosts.supplier);

        context.calculateSalesFinancials();
    };

    hydrateSingleCard({
        hasData,
        cardSelector: '.cost-card[data-cost-type="other"]',
        addButtonSelector: '.cost-add-btn[data-cost-type="other"]',
        hydrateCard,
        newCardDelay: 150
    });
}

export function hydrateEditModeCostCards(context, costData) {
    showEditCostPanels();

    setTimeout(() => {
        hydrateCableCards(context, costData.cableSegments);
        hydrateBackhaulCard(context, 'backhaulA', costData.bhA);
        hydrateBackhaulCard(context, 'backhaulZ', costData.bhZ);
        hydrateCrossConnectCard(context, 'xcA', costData.xcA);
        hydrateCrossConnectCard(context, 'xcZ', costData.xcZ);
        hydrateOtherCard(context, costData.otherCosts);
    }, 100);
}
