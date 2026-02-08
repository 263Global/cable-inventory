/**
 * Cost card summary and total calculations.
 */

export function createCostSummaryController(cardsContainer) {
    const formatCurrency = (value) => {
        const amount = Number(value) || 0;
        return '$' + amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    };

    const getCardValue = (card, selector) => Number(card.querySelector(selector)?.value || 0);

    const getCableCostModel = (card) => card?.querySelector('input[name="costs.cable.model"]')?.value || 'Lease';

    const getCostSummaryForCard = (card) => {
        const type = card.dataset.costType;
        let monthly = 0;
        let onetime = 0;

        if (type === 'cable') {
            const model = getCableCostModel(card);
            if (model === 'IRU') {
                monthly = getCardValue(card, '[data-field="costs.cable.annualOm"]') / 12;
                onetime = getCardValue(card, '[data-field="costs.cable.otc"]');
            } else {
                monthly = getCardValue(card, '[data-field="costs.cable.mrc"]');
                onetime = getCardValue(card, '[data-field="costs.cable.nrc"]');
            }
        } else if (type === 'backhaulA') {
            const model = card.querySelector('.bh-a-cost-model-select')?.value || 'Lease';
            if (model === 'IRU') {
                monthly = getCardValue(card, '[data-field="costs.backhaulA.annualOm"]') / 12;
                onetime = getCardValue(card, '[data-field="costs.backhaulA.otc"]');
            } else {
                monthly = getCardValue(card, '[data-field="costs.backhaul.aEnd.monthly"]');
                onetime = getCardValue(card, '[data-field="costs.backhaul.aEnd.nrc"]');
            }
        } else if (type === 'backhaulZ') {
            const model = card.querySelector('.bh-z-cost-model-select')?.value || 'Lease';
            if (model === 'IRU') {
                monthly = getCardValue(card, '[data-field="costs.backhaulZ.annualOm"]') / 12;
                onetime = getCardValue(card, '[data-field="costs.backhaulZ.otc"]');
            } else {
                monthly = getCardValue(card, '[data-field="costs.backhaul.zEnd.monthly"]');
                onetime = getCardValue(card, '[data-field="costs.backhaul.zEnd.nrc"]');
            }
        } else if (type === 'xcA') {
            monthly = getCardValue(card, '[data-field="costs.crossConnect.aEnd.monthly"]');
            onetime = getCardValue(card, '[data-field="costs.crossConnect.aEnd.nrc"]');
        } else if (type === 'xcZ') {
            monthly = getCardValue(card, '[data-field="costs.crossConnect.zEnd.monthly"]');
            onetime = getCardValue(card, '[data-field="costs.crossConnect.zEnd.nrc"]');
        } else if (type === 'other') {
            monthly = getCardValue(card, '[data-field="costs.otherCosts.monthly"]');
            onetime = getCardValue(card, '[data-field="costs.otherCosts.oneOff"]');
        }

        return { monthly, onetime };
    };

    const updateCostSummary = (card) => {
        const summary = card.querySelector('[data-cost-summary]');
        if (!summary) return;

        const monthlyEl = summary.querySelector('[data-cost-summary-monthly]');
        const onetimeEl = summary.querySelector('[data-cost-summary-onetime]');
        const { monthly, onetime } = getCostSummaryForCard(card);

        if (monthlyEl) {
            monthlyEl.textContent = `${formatCurrency(monthly)} / mo`;
        }
        if (onetimeEl) {
            onetimeEl.textContent = `${formatCurrency(onetime)} one-time`;
        }
    };

    const updateCostTotals = () => {
        let totalMonthly = 0;
        let totalOnetime = 0;
        const cards = cardsContainer.querySelectorAll('.cost-card');

        cards.forEach((card) => {
            const { monthly, onetime } = getCostSummaryForCard(card);
            totalMonthly += monthly;
            totalOnetime += onetime;
        });

        const term = Number(document.querySelector('[name="dates.term"]')?.value || 0) || 12;
        const amortized = term > 0 ? totalMonthly + (totalOnetime / term) : totalMonthly;

        const recurringEl = document.getElementById('cost-total-recurring');
        const onetimeEl = document.getElementById('cost-total-onetime');
        const amortizedEl = document.getElementById('cost-total-amortized');

        if (recurringEl) recurringEl.textContent = `${formatCurrency(totalMonthly)} / mo`;
        if (onetimeEl) onetimeEl.textContent = formatCurrency(totalOnetime);
        if (amortizedEl) amortizedEl.textContent = `${formatCurrency(amortized)} / mo`;
    };

    const updateCostDisplays = (card = null) => {
        if (card) {
            updateCostSummary(card);
        } else {
            cardsContainer.querySelectorAll('.cost-card').forEach(updateCostSummary);
        }
        updateCostTotals();
    };

    return {
        updateCostDisplays,
        updateCostTotals
    };
}
