/**
 * Import row to Store payload transforms.
 */

function computeEndDate(startDate, termMonths) {
    if (!startDate) return '';

    const start = new Date(startDate);
    const term = Number(termMonths) || 0;
    if (Number.isNaN(start.getTime()) || term <= 0) return '';

    const end = new Date(start);
    end.setMonth(end.getMonth() + term);
    end.setDate(end.getDate() - 1);
    return end.toISOString().split('T')[0];
}

function normalizeOwnership(ownership, costModel) {
    const rawOwnership = String(ownership || '').trim();
    const normalizedOwnership = rawOwnership.toLowerCase();

    if (normalizedOwnership === 'iru') return 'IRU';
    if (normalizedOwnership === 'leased' || normalizedOwnership === 'lease') return 'Leased';
    if (rawOwnership) return rawOwnership;

    const model = String(costModel || '').trim().toUpperCase();
    return model === 'IRU' ? 'IRU' : 'Leased';
}

function transformCustomerRow(row) {
    return {
        shortName: row.short_name,
        fullName: row.full_name,
        companyType: row.company_type || '',
        contactName: row.contact_name || '',
        contactEmail: row.contact_email || '',
        contactPhone: row.contact_phone || '',
        website: row.website || '',
        notes: row.notes || ''
    };
}

function transformSupplierRow(row) {
    return {
        shortName: row.short_name,
        fullName: row.full_name,
        contactName: row.contact_name || '',
        contactEmail: row.contact_email || '',
        contactPhone: row.contact_phone || '',
        portalUrl: row.portal_url || '',
        notes: row.notes || ''
    };
}

function transformInventoryRow(row) {
    const termMonths = Number(row.term_months) || 12;
    const ownership = normalizeOwnership(row.ownership, row.cost_model);
    const omRate = Number(row.om_rate) || 0;
    const otcValue = Number(row.otc) || 0;
    const nrcValue = Number(row.nrc) || 0;
    const startDate = row.start_date || '';
    const endDate = computeEndDate(startDate, termMonths);

    const item = {
        resourceId: row.resource_id,
        status: 'Available',
        cableSystem: row.cable_system || '',
        segmentType: row.segment_type || 'E2E',
        protection: row.protection || 'Unprotected',
        handoffType: row.handoff_type || 'OTU-4',
        routeDescription: row.notes || '',
        acquisition: {
            type: row.acquisition_type || 'Purchased',
            ownership,
            supplierId: row._resolved_supplier_id || null,
            supplierName: row.supplier || '',
            contractRef: row.contract_ref || ''
        },
        capacity: {
            value: Number(row.capacity_value) || 0,
            unit: row.capacity_unit || 'Gbps'
        },
        location: {
            aEnd: {
                country: row.aend_country || '',
                city: row.aend_city || '',
                pop: row.aend_pop || '',
                device: '',
                port: ''
            },
            zEnd: {
                country: row.zend_country || '',
                city: row.zend_city || '',
                pop: row.zend_pop || '',
                device: '',
                port: ''
            }
        },
        financials: {
            mrc: Number(row.mrc) || 0,
            nrc: ownership === 'IRU' ? 0 : nrcValue,
            otc: ownership === 'IRU' ? otcValue : 0,
            omRate,
            annualOmCost: ownership === 'IRU' ? (otcValue * omRate / 100) : 0,
            term: termMonths
        },
        costMode: 'single',
        dates: {
            start: startDate,
            end: endDate
        }
    };

    const computedStatus = window.InventoryStatus?.computeInventoryStatus(item, 0, new Date())?.calculatedStatus;
    if (computedStatus) item.status = computedStatus;

    return item;
}

function transformSalesRow(row) {
    const termMonths = Number(row.term_months) || 12;
    const startDate = row.start_date || '';
    const endDate = computeEndDate(startDate, termMonths);
    const customerId = row._resolved_customer_id || null;
    const customerRecord = customerId ? window.Store.getCustomerById(customerId) : null;
    const customerName = customerRecord?.short_name || row.customer || '';
    const salesStatus = window.SalesStatus?.computeSalesStatus(startDate, endDate) || 'Pending';

    return {
        salesOrderId: row.sales_order_id,
        customerId,
        customerName,
        salesperson: row.salesperson || '',
        inventoryLink: row.inventory_link || '',
        status: salesStatus,
        salesModel: row.sales_model || 'Lease',
        salesType: row.sales_type || 'Resale',
        capacity: {
            value: Number(row.capacity_value) || 0,
            unit: row.capacity_unit || 'Gbps'
        },
        location: {
            aEnd: { city: row.aend_city || '', pop: row.aend_pop || '' },
            zEnd: { city: row.zend_city || '', pop: row.zend_pop || '' }
        },
        dates: {
            start: startDate,
            end: endDate,
            term: termMonths
        },
        financials: {
            mrcSales: Number(row.mrc_sales) || 0,
            nrcSales: Number(row.nrc_sales) || 0,
            otc: Number(row.otc) || 0,
            omRate: 0,
            annualOm: Number(row.annual_om) || 0
        },
        costs: {},
        notes: row.notes || ''
    };
}

function transformRowForStore(row, entityType) {
    if (entityType === 'customers') return transformCustomerRow(row);
    if (entityType === 'suppliers') return transformSupplierRow(row);
    if (entityType === 'inventory') return transformInventoryRow(row);
    if (entityType === 'sales') return transformSalesRow(row);
    return row;
}

window.CsvImportTransform = {
    transformRowForStore
};
