/**
 * Sales module facade.
 * Keeps existing public API while delegating to focused submodules.
 */

import { renderSalesList } from './sales/listView.js';
import { viewSalesDetailsModal } from './sales/detailsView.js';

export function renderSales(context, filters = {}) {
    return renderSalesList(context, filters);
}

export function viewSalesDetails(context, salesOrderId) {
    return viewSalesDetailsModal(context, salesOrderId);
}

export function editSalesOrder(context, salesOrderId) {
    // Use the full form modal with edit mode support.
    context.openAddSalesModal(salesOrderId);
}
