import { renderSearchableDropdown, initSearchableDropdown, renderSimpleDropdown, initSimpleDropdown } from '../searchableDropdown.js';

const initSimpleSelect = ({ placeholderId, containerId, name, id, options, defaultValue, selectedValue }) => {
    const placeholder = document.getElementById(placeholderId);
    if (!placeholder) return;

    placeholder.outerHTML = renderSimpleDropdown({
        name,
        id,
        options,
        selectedValue: selectedValue || placeholder.dataset.selected || defaultValue,
        placeholder: 'Select...'
    });
    initSimpleDropdown(containerId);
};

export function initInventoryFormDropdowns({ supplierOptions = [], existingSupplier = '' } = {}) {
    const supplierDropdownPlaceholder = document.getElementById('inventory-supplier-dropdown-placeholder');
    if (supplierDropdownPlaceholder) {
        supplierDropdownPlaceholder.outerHTML = renderSearchableDropdown({
            name: 'acquisition.supplierId',
            id: 'inventory-supplier-dropdown',
            options: supplierOptions,
            selectedValue: existingSupplier,
            placeholder: '搜索供应商...'
        });
        initSearchableDropdown('inventory-supplier-dropdown-container');
    }

    initSimpleSelect({
        placeholderId: 'inventory-status-dropdown-placeholder',
        containerId: 'inventory-status-container',
        name: 'status',
        id: 'inventory-status',
        defaultValue: 'Available',
        options: [
            { value: 'Draft', label: 'Draft' },
            { value: 'Available', label: 'Available' },
            { value: 'Sold Out', label: 'Sold Out' },
            { value: 'Expired', label: 'Expired' }
        ]
    });

    initSimpleSelect({
        placeholderId: 'inventory-acquisition-type-dropdown-placeholder',
        containerId: 'inventory-acquisition-type-container',
        name: 'acquisition.type',
        id: 'inventory-acquisition-type',
        defaultValue: 'Purchased',
        options: [
            { value: 'Purchased', label: 'Purchased' },
            { value: 'Swapped In', label: 'Swapped In' }
        ]
    });

    initSimpleSelect({
        placeholderId: 'inventory-ownership-dropdown-placeholder',
        containerId: 'inventory-ownership-container',
        name: 'acquisition.ownership',
        id: 'inventory-ownership',
        defaultValue: 'Leased',
        options: [
            { value: 'Leased', label: 'Leased' },
            { value: 'IRU', label: 'IRU' }
        ]
    });

    initSimpleSelect({
        placeholderId: 'inventory-cost-mode-dropdown-placeholder',
        containerId: 'inventory-cost-mode-container',
        name: 'costMode',
        id: 'inventory-cost-mode',
        defaultValue: 'single',
        options: [
            { value: 'single', label: 'Single Cost' },
            { value: 'batches', label: 'Batches + Base Cost' }
        ]
    });

    initSimpleSelect({
        placeholderId: 'inventory-base-model-dropdown-placeholder',
        containerId: 'inventory-base-model-container',
        name: 'baseCost.model',
        id: 'inventory-base-model',
        defaultValue: 'IRU',
        options: [
            { value: 'IRU', label: 'IRU' },
            { value: 'Lease', label: 'Lease' }
        ]
    });

    initSimpleSelect({
        placeholderId: 'inventory-segment-type-dropdown-placeholder',
        containerId: 'inventory-segment-type-container',
        name: 'segmentType',
        id: 'inventory-segment-type',
        defaultValue: 'Capacity',
        options: [
            { value: 'Capacity', label: 'Capacity' },
            { value: 'Fiber Pair', label: 'Fiber Pair' },
            { value: 'Spectrum', label: 'Spectrum' },
            { value: 'Backhaul', label: 'Backhaul' }
        ]
    });

    const handoffPlaceholder = document.getElementById('inventory-handoff-type-dropdown-placeholder');
    if (handoffPlaceholder) {
        let selectedHandoff = handoffPlaceholder.dataset.selected || 'OTU-4';
        const standardHandoffs = ['OTU-4', '100GE', '400GE', 'Other'];
        if (selectedHandoff && !standardHandoffs.includes(selectedHandoff)) {
            selectedHandoff = 'Other';
        }
        handoffPlaceholder.outerHTML = renderSimpleDropdown({
            name: 'handoffType',
            id: 'inventory-handoff-type',
            options: [
                { value: 'OTU-4', label: 'OTU-4' },
                { value: '100GE', label: '100GE' },
                { value: '400GE', label: '400GE' },
                { value: 'Other', label: 'Other' }
            ],
            selectedValue: selectedHandoff,
            placeholder: 'Select...'
        });
        initSimpleDropdown('inventory-handoff-type-container');
    }

    initSimpleSelect({
        placeholderId: 'inventory-capacity-unit-dropdown-placeholder',
        containerId: 'inventory-capacity-unit-container',
        name: 'capacity.unit',
        id: 'inventory-capacity-unit',
        defaultValue: 'Gbps',
        options: [
            { value: 'Gbps', label: 'Gbps' },
            { value: 'Tbps', label: 'Tbps' },
            { value: 'Fiber Pair', label: 'Fiber Pair' },
            { value: 'Half Fiber Pair', label: 'Half Fiber Pair' },
            { value: 'GHz', label: 'GHz' }
        ]
    });

    initSimpleSelect({
        placeholderId: 'inventory-protection-dropdown-placeholder',
        containerId: 'inventory-protection-container',
        name: 'protection',
        id: 'inventory-protection',
        defaultValue: 'Unprotected',
        options: [
            { value: 'Unprotected', label: 'Unprotected' },
            { value: 'Protected', label: 'Protected' }
        ]
    });
}
