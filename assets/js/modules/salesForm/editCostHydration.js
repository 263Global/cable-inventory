/**
 * Hydration logic for edit-mode cost cards in sales modal.
 */

import { extractEditCostData, syncEditCostHiddenInputs } from './editCostHydrationData.js';
import { hydrateEditModeCostCards } from './editCostHydrationCards.js';

function attachEditCostsHandler(context, enableCostEditing) {
    const editCostsBtn = document.getElementById('btn-edit-costs');

    if (editCostsBtn) {
        editCostsBtn.addEventListener('click', (event) => {
            event.preventDefault();
            enableCostEditing();
        });
        return;
    }

    if (!context.modalContainer) return;

    if (context._editCostsDelegateHandler) {
        context.modalContainer.removeEventListener('click', context._editCostsDelegateHandler);
    }

    context._editCostsDelegateHandler = (event) => {
        const target = event.target.closest('#btn-edit-costs');
        if (!target) return;

        event.preventDefault();
        enableCostEditing();
    };

    context.modalContainer.addEventListener('click', context._editCostsDelegateHandler);
}

export function setupEditModeCostHydration(context, existingOrder, cableSegments) {
    const costData = extractEditCostData(existingOrder, cableSegments);

    syncEditCostHiddenInputs(costData);
    setTimeout(() => context.calculateSalesFinancials(), 100);

    const enableCostEditing = () => {
        hydrateEditModeCostCards(context, costData);
    };

    context.__enableEditCosts = enableCostEditing;
    attachEditCostsHandler(context, enableCostEditing);
}
