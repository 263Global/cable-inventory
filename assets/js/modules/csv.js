/**
 * CSV Export Module
 * Utilities for exporting data to CSV format
 */

/**
 * Downloads content as a CSV file
 * Uses Blob approach for better browser compatibility (including Safari)
 * @param {string} csvContent - The CSV content string
 * @param {string} filename - The filename for download
 */
function downloadCSV(csvContent, filename) {
    // Add BOM for Excel UTF-8 compatibility
    const BOM = '\uFEFF';
    const csvData = BOM + csvContent;

    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();

    // Cleanup
    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 100);
}

/**
 * Exports all sales orders to CSV
 */
function exportSalesToCSV() {
    const sales = window.Store.getSales();
    if (sales.length === 0) {
        alert('No sales data to export.');
        return;
    }

    // Get customers for lookup
    const customers = window.Store.getCustomers();
    const customerMap = {};
    customers.forEach(c => { customerMap[c.id] = c.short_name; });

    const headers = [
        'Sales Order ID', 'Customer', 'Salesperson', 'Status',
        'Sales Model', 'Sales Type', 'Route', 'Capacity',
        'Contract Start', 'Contract End', 'Term (Months)',
        'Monthly Revenue (Unified)', 'MRC Sales', 'OTC', 'Annual O&M', 'Legacy Customer Name'
    ];

    const rows = sales.map(s => {
        // Resolve customer name from ID, fallback to legacy customerName
        const customerName = s.customerId ? (customerMap[s.customerId] || s.customerName || '') : (s.customerName || '');
        const computed = computeOrderFinancials(s);
        const aEndCity = s.location?.aEnd?.city || s.locationAEnd?.city || '';
        const zEndCity = s.location?.zEnd?.city || s.locationZEnd?.city || '';
        const route = [aEndCity, zEndCity].filter(Boolean).join(' -> ');

        return [
            s.salesOrderId || '',
            customerName,
            s.salesperson || '',
            s.status || '',
            s.salesModel || '',
            s.salesType || '',
            route,
            s.capacity?.value || '',
            s.dates?.start || '',
            s.dates?.end || '',
            s.dates?.term || '',
            computed.monthlyRevenue || '',
            s.financials?.mrcSales || '',
            s.financials?.otc || '',
            s.financials?.annualOm || '',
            s.customerName || '' // Legacy field for reference
        ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    downloadCSV(csv, `sales_export_${new Date().toISOString().split('T')[0]}.csv`);
}

/**
 * Exports all inventory resources to CSV
 */
function exportInventoryToCSV() {
    const inventory = window.Store.getInventory();
    if (inventory.length === 0) {
        alert('No inventory data to export.');
        return;
    }

    // Get suppliers for lookup
    const suppliers = window.Store.getSuppliers();
    const supplierMap = {};
    suppliers.forEach(s => { supplierMap[s.id] = s.short_name; });

    const headers = [
        'Resource ID', 'Cable System', 'Segment Type', 'Route',
        'Status', 'Capacity', 'A-End', 'Z-End',
        'Ownership', 'Supplier', 'Contract Start', 'Contract End', 'Term (Months)',
        'OTC/NRC', 'MRC', 'Annual O&M Cost', 'Legacy Supplier Name'
    ];

    const formatEndpoint = (endpoint) => {
        if (!endpoint) return '';
        const pop = endpoint.pop || '';
        const city = endpoint.city || '';
        if (!pop && !city) return '';
        if (!city) return pop;
        if (!pop) return city;
        return `${pop} (${city})`;
    };

    const rows = inventory.map(i => {
        // Resolve supplier name from ID, fallback to legacy supplierName
        const supplierId = i.acquisition?.supplierId;
        const supplierName = supplierId
            ? (supplierMap[supplierId] || i.acquisition?.supplierName || '')
            : (i.acquisition?.supplierName || '');

        return [
            i.resourceId || '',
            i.cableSystem || '',
            i.segmentType || '',
            i.routeDescription || '',
            i.status || '',
            i.capacity?.value || '',
            formatEndpoint(i.location?.aEnd),
            formatEndpoint(i.location?.zEnd),
            i.acquisition?.ownership || '',
            supplierName,
            i.dates?.start || '',
            i.dates?.end || '',
            i.financials?.term || '',
            (i.acquisition?.ownership === 'IRU' ? i.financials?.otc : i.financials?.nrc) || '',
            i.financials?.mrc || '',
            i.financials?.annualOmCost || '',
            i.acquisition?.supplierName || '' // Legacy field for reference
        ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    downloadCSV(csv, `inventory_export_${new Date().toISOString().split('T')[0]}.csv`);
}

// Export to global scope
window.CsvExport = {
    downloadCSV,
    exportSalesToCSV,
    exportInventoryToCSV
};
