/**
 * Inventory module facade.
 * Keeps existing public API while delegating to focused submodules.
 */

import { renderInventoryList } from './inventory/listView.js';
import { viewInventoryDetailsModal } from './inventory/detailsView.js';
import { openInventoryFormModal } from './inventory/resourceModal.js';
import { openInventoryTerminateModal } from './inventoryForm/terminateModal.js';
import { openInventoryRenewModal } from './inventoryForm/renewModal.js';

export { attachInventoryFormListeners } from './inventory/formListeners.js';

export function renderInventory(context, searchQuery = '', page = 1, statusFilter = '') {
    return renderInventoryList(context, searchQuery, page, statusFilter);
}

export function viewInventoryDetails(context, resourceId) {
    return viewInventoryDetailsModal(context, resourceId);
}

export function openInventoryModal(context, resourceId = null) {
    return openInventoryFormModal(context, resourceId);
}

export function openTerminateModal(context, resourceId) {
    return openInventoryTerminateModal(context, resourceId);
}

export function openRenewModal(context, resourceId) {
    return openInventoryRenewModal(context, resourceId);
}
