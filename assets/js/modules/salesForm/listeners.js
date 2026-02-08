/**
 * Sales form event wiring entrypoint.
 */

import { renderSearchableDropdown } from '../searchableDropdown.js';
import { initCostCardsController } from './costCardsController.js';
import { initSalesModelAndTypeHints } from './modelTypeHints.js';
import { initSalesFormMetaListeners } from './formMetaListeners.js';

export function attachSalesFormListeners(context) {
    const suppliers = window.Store.getSuppliers();
    const supplierOptions = suppliers.map(s => ({
        value: s.id,
        label: s.short_name,
        subtitle: s.full_name || ''
    }));

    const createSupplierDropdown = (fieldName, id) => {
        return renderSearchableDropdown({
            name: fieldName,
            id,
            options: supplierOptions,
            selectedValue: '',
            placeholder: '搜索供应商...'
        });
    };

    const costCards = initCostCardsController(context, { createSupplierDropdown });

    initSalesModelAndTypeHints(context, {
        cardsContainer: costCards.cardsContainer,
        addCostCard: costCards.addCostCard,
        syncCostInputs: costCards.syncCostInputs,
        updateCostTotals: costCards.updateCostTotals
    });

    initSalesFormMetaListeners(context, {
        updateCostTotals: costCards.updateCostTotals
    });
}
