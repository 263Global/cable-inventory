/**
 * Import persistence to Store.
 */

async function importRows(entityType, rows) {
    const results = { success: 0, failed: [] };
    const transformRowForStore = window.CsvImportTransform?.transformRowForStore;

    if (typeof transformRowForStore !== 'function') {
        throw new Error('CsvImportTransform not loaded');
    }

    for (const row of rows) {
        try {
            const data = transformRowForStore(row, entityType);

            if (entityType === 'customers') {
                await window.Store.addCustomer(data);
            } else if (entityType === 'suppliers') {
                await window.Store.addSupplier(data);
            } else if (entityType === 'inventory') {
                await window.Store.addInventory(data);
            } else if (entityType === 'sales') {
                await window.Store.addSalesOrder(data);
            }

            results.success += 1;
        } catch (error) {
            results.failed.push({ row: row._rowIndex, error: error.message });
        }
    }

    return results;
}

window.CsvImportPersistence = {
    importRows
};
