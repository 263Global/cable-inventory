/**
 * Inventory supplier helper utilities.
 */

export function resolveSupplierName(supplierId, fallback = '') {
    if (!supplierId) return fallback || '';
    const supplier = window.Store.getSuppliers().find(s => s.id === supplierId);
    return supplier?.short_name || supplier?.full_name || fallback || supplierId;
}
