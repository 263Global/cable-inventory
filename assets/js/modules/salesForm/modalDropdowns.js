import { renderSearchableDropdown, initSearchableDropdown, renderSimpleDropdown, initSimpleDropdown } from '../searchableDropdown.js';

export function initSalesModalDropdowns({ customerDropdownOptions, resourceOptions }) {
    const salesModelPlaceholder = document.getElementById('sales-model-dropdown-placeholder');
    if (salesModelPlaceholder) {
        const selectedModel = salesModelPlaceholder.dataset.selected || 'Lease';
        salesModelPlaceholder.outerHTML = renderSimpleDropdown({
            name: 'salesModel',
            id: 'sales-model-select',
            options: [
                { value: 'Lease', label: 'Lease (月租模式)' },
                { value: 'IRU', label: 'IRU (买断模式)' }
            ],
            selectedValue: selectedModel,
            placeholder: 'Select...'
        });
        initSimpleDropdown('sales-model-select-container');
    }

    const salesTypePlaceholder = document.getElementById('sales-type-dropdown-placeholder');
    if (salesTypePlaceholder) {
        const selectedType = salesTypePlaceholder.dataset.selected || 'Resale';
        salesTypePlaceholder.outerHTML = renderSimpleDropdown({
            name: 'salesType',
            id: 'sales-type-select',
            options: [
                { value: 'Resale', label: 'Resale (外部资源)' },
                { value: 'Hybrid', label: 'Hybrid (混合资源)' },
                { value: 'Inventory', label: 'Inventory (自有资源)' },
                { value: 'Swapped Out', label: 'Swapped Out (置换出去)' }
            ],
            selectedValue: selectedType,
            placeholder: 'Select...'
        });
        initSimpleDropdown('sales-type-select-container');
    }

    const customerPlaceholder = document.getElementById('customer-dropdown-placeholder');
    if (customerPlaceholder) {
        const selectedCustomerId = customerPlaceholder.dataset.selected || '';
        const dropdownId = 'sales-customer-dropdown';
        customerPlaceholder.outerHTML = renderSearchableDropdown({
            name: 'customerId',
            id: dropdownId,
            options: customerDropdownOptions,
            selectedValue: selectedCustomerId,
            placeholder: '搜索客户...'
        });
        initSearchableDropdown(`${dropdownId}-container`);
    }

    const capacityUnitPlaceholder = document.getElementById('capacity-unit-dropdown-placeholder');
    if (capacityUnitPlaceholder) {
        const selectedUnit = capacityUnitPlaceholder.dataset.selected || 'Gbps';
        capacityUnitPlaceholder.outerHTML = renderSimpleDropdown({
            name: 'capacity.unit',
            id: 'capacity-unit-select',
            options: [
                { value: 'Gbps', label: 'Gbps' },
                { value: 'Wavelength', label: 'Wavelength' },
                { value: 'Fiber Pair', label: 'Fiber Pair' }
            ],
            selectedValue: selectedUnit,
            placeholder: 'Select...'
        });
        initSimpleDropdown('capacity-unit-select-container');
    }

    const linkedResourcePlaceholder = document.getElementById('linked-resource-dropdown-placeholder');
    if (linkedResourcePlaceholder) {
        const selectedResource = linkedResourcePlaceholder.dataset.selected || '';
        linkedResourcePlaceholder.outerHTML = renderSimpleDropdown({
            name: 'inventoryLink',
            id: 'inventory-link-select',
            options: [{ value: '', label: 'Select Resource...' }, ...resourceOptions],
            selectedValue: selectedResource,
            placeholder: 'Select Resource...'
        });
        initSimpleDropdown('inventory-link-select-container');
    }

    const salespersonPlaceholder = document.getElementById('salesperson-dropdown-placeholder');
    if (salespersonPlaceholder) {
        const selectedPerson = salespersonPlaceholder.dataset.selected || '';
        salespersonPlaceholder.outerHTML = renderSimpleDropdown({
            name: 'salesperson',
            id: 'salesperson-select',
            options: [
                { value: '', label: 'Select...' },
                { value: 'Janna Dai', label: 'Janna Dai' },
                { value: 'Miki Chen', label: 'Miki Chen' },
                { value: 'Wayne Jiang', label: 'Wayne Jiang' },
                { value: 'Kristen Gan', label: 'Kristen Gan' },
                { value: 'Becky Hai', label: 'Becky Hai' },
                { value: 'Wolf Yuan', label: 'Wolf Yuan' },
                { value: 'Yifeng Jiang', label: 'Yifeng Jiang' },
                { value: 'Procurement Team', label: 'Procurement Team' }
            ],
            selectedValue: selectedPerson,
            placeholder: 'Select...'
        });
        initSimpleDropdown('salesperson-select-container');
    }
}
