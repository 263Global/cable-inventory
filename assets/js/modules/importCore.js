/**
 * CSV/Excel import core helpers:
 * schema, parsing, validation, transform, and persistence.
 */

const SCHEMAS = {
    customers: {
        columns: [
            { name: 'short_name', required: true, type: 'string', label: '简称' },
            { name: 'full_name', required: true, type: 'string', label: '全称' },
            { name: 'company_type', required: false, type: 'enum', options: ['Enterprise', 'Carrier', 'OTT', 'Other'], label: '公司类型' },
            { name: 'contact_name', required: false, type: 'string', label: '联系人' },
            { name: 'contact_email', required: false, type: 'email', label: '邮箱' },
            { name: 'contact_phone', required: false, type: 'string', label: '电话' },
            { name: 'website', required: false, type: 'url', label: '网站' },
            { name: 'notes', required: false, type: 'string', label: '备注' }
        ],
        entityName: 'customers',
        displayName: 'Customers',
        displayNameZh: '客户'
    },
    suppliers: {
        columns: [
            { name: 'short_name', required: true, type: 'string', label: '简称' },
            { name: 'full_name', required: true, type: 'string', label: '全称' },
            { name: 'contact_name', required: false, type: 'string', label: '联系人' },
            { name: 'contact_email', required: false, type: 'email', label: '邮箱' },
            { name: 'contact_phone', required: false, type: 'string', label: '电话' },
            { name: 'portal_url', required: false, type: 'url', label: '门户网站' },
            { name: 'notes', required: false, type: 'string', label: '备注' }
        ],
        entityName: 'suppliers',
        displayName: 'Suppliers',
        displayNameZh: '供应商'
    },
    inventory: {
        columns: [
            { name: 'resource_id', required: true, type: 'string', label: 'Resource ID' },
            { name: 'supplier', required: true, type: 'fk_supplier', label: 'Supplier' },
            { name: 'acquisition_type', required: false, type: 'enum', options: ['Purchased', 'Swapped In'], label: 'Acquisition Type' },
            { name: 'ownership', required: false, type: 'enum', options: ['Leased', 'IRU'], label: 'Ownership' },
            { name: 'segment_type', required: false, type: 'enum', options: ['E2E', 'Segment', 'Backhaul', 'Spectrum'], label: 'Segment Type' },
            { name: 'cable_system', required: false, type: 'string', label: 'Cable System' },
            { name: 'capacity_value', required: true, type: 'number', label: 'Capacity' },
            { name: 'capacity_unit', required: false, type: 'enum', options: ['Gbps', 'Tbps', 'Fiber Pair', 'GHz'], label: 'Capacity Unit' },
            { name: 'protection', required: false, type: 'enum', options: ['Protected', 'Unprotected'], label: 'Protection' },
            { name: 'handoff_type', required: false, type: 'enum', options: ['OTU-4', '100GE', '400GE', 'Other'], label: 'Handoff Type' },
            { name: 'aend_country', required: false, type: 'string', label: 'A-End Country' },
            { name: 'aend_city', required: false, type: 'string', label: 'A-End City' },
            { name: 'aend_pop', required: false, type: 'string', label: 'A-End POP' },
            { name: 'zend_country', required: false, type: 'string', label: 'Z-End Country' },
            { name: 'zend_city', required: false, type: 'string', label: 'Z-End City' },
            { name: 'zend_pop', required: false, type: 'string', label: 'Z-End POP' },
            { name: 'cost_model', required: true, type: 'enum', options: ['Lease', 'IRU'], label: 'Cost Model' },
            { name: 'mrc', required: false, type: 'number', label: 'MRC' },
            { name: 'otc', required: false, type: 'number', label: 'OTC' },
            { name: 'nrc', required: false, type: 'number', label: 'NRC' },
            { name: 'om_rate', required: false, type: 'number', label: 'O&M Rate %' },
            { name: 'term_months', required: true, type: 'number', label: 'Term (Months)' },
            { name: 'start_date', required: true, type: 'date', label: 'Start Date' },
            { name: 'contract_ref', required: false, type: 'string', label: 'Contract Ref' },
            { name: 'notes', required: false, type: 'string', label: 'Notes' }
        ],
        entityName: 'inventory',
        displayName: 'Inventory',
        displayNameZh: '库存'
    },
    sales: {
        columns: [
            { name: 'sales_order_id', required: true, type: 'string', label: 'Sales Order ID' },
            { name: 'customer', required: true, type: 'fk_customer', label: 'Customer' },
            { name: 'salesperson', required: false, type: 'string', label: 'Salesperson' },
            { name: 'inventory_link', required: false, type: 'string', label: 'Linked Resource ID' },
            { name: 'sales_model', required: true, type: 'enum', options: ['Lease', 'IRU'], label: 'Sales Model' },
            { name: 'sales_type', required: true, type: 'enum', options: ['Resale', 'Inventory', 'Hybrid', 'Swapped Out'], label: 'Sales Type' },
            { name: 'capacity_value', required: true, type: 'number', label: 'Capacity' },
            { name: 'capacity_unit', required: false, type: 'enum', options: ['Gbps', 'Tbps', 'Wavelength', 'Fiber Pair'], label: 'Capacity Unit' },
            { name: 'aend_city', required: false, type: 'string', label: 'A-End City' },
            { name: 'aend_pop', required: false, type: 'string', label: 'A-End POP' },
            { name: 'zend_city', required: false, type: 'string', label: 'Z-End City' },
            { name: 'zend_pop', required: false, type: 'string', label: 'Z-End POP' },
            { name: 'mrc_sales', required: true, type: 'number', label: 'MRC Sales' },
            { name: 'nrc_sales', required: false, type: 'number', label: 'NRC Sales' },
            { name: 'otc', required: false, type: 'number', label: 'OTC' },
            { name: 'annual_om', required: false, type: 'number', label: 'Annual O&M' },
            { name: 'term_months', required: true, type: 'number', label: 'Term (Months)' },
            { name: 'start_date', required: true, type: 'date', label: 'Start Date' },
            { name: 'notes', required: false, type: 'string', label: 'Notes' }
        ],
        entityName: 'sales',
        displayName: 'Sales',
        displayNameZh: '销售'
    }
};

function parseCSV(file) {
    return new Promise((resolve, reject) => {
        if (typeof Papa === 'undefined') {
            reject(new Error('PapaParse library not loaded'));
            return;
        }
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (header) => header.trim().toLowerCase().replace(/\s+/g, '_'),
            complete: (results) => resolve({ data: results.data, errors: results.errors }),
            error: (error) => reject(error)
        });
    });
}

function parseExcel(file) {
    return new Promise((resolve, reject) => {
        if (typeof XLSX === 'undefined') {
            reject(new Error('SheetJS library not loaded'));
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
                const normalized = jsonData.map(row => {
                    const newRow = {};
                    Object.keys(row).forEach(key => {
                        const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, '_');
                        newRow[normalizedKey] = row[key];
                    });
                    return newRow;
                });
                resolve({ data: normalized, errors: [] });
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsArrayBuffer(file);
    });
}

async function parseFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'csv') return parseCSV(file);
    if (ext === 'xlsx' || ext === 'xls') return parseExcel(file);
    throw new Error(`Unsupported file format: .${ext}. Please use CSV or Excel (.xlsx) files.`);
}

function isValidEmail(str) {
    if (!str) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
}

function isValidUrl(str) {
    if (!str) return true;
    try {
        new URL(str.startsWith('http') ? str : `https://${str}`);
        return true;
    } catch {
        return false;
    }
}

function validateRows(data, schema) {
    const valid = [];
    const invalid = [];

    const suppliers = window.Store?.getSuppliers() || [];
    const customers = window.Store?.getCustomers() || [];
    const supplierMap = new Map(suppliers.map(s => [s.short_name?.toLowerCase(), s.id]));
    const customerMap = new Map(customers.map(c => [c.short_name?.toLowerCase(), c.id]));

    data.forEach((row, index) => {
        const errors = [];
        const validatedRow = { _rowIndex: index + 2 };

        schema.columns.forEach(col => {
            const value = (row[col.name] ?? '').toString().trim();
            validatedRow[col.name] = value;

            if (col.required && !value) {
                errors.push(`${col.label || col.name} is required`);
                return;
            }

            if (!value) return;

            switch (col.type) {
                case 'email':
                    if (!isValidEmail(value)) {
                        errors.push(`${col.label || col.name}: invalid email format`);
                    }
                    break;
                case 'url':
                    if (!isValidUrl(value)) {
                        errors.push(`${col.label || col.name}: invalid URL format`);
                    }
                    break;
                case 'enum':
                    if (col.options && !col.options.includes(value)) {
                        errors.push(`${col.label || col.name}: must be one of ${col.options.join(', ')}`);
                    }
                    break;
                case 'number':
                    if (Number.isNaN(Number(value))) {
                        errors.push(`${col.label || col.name}: must be a number`);
                    } else {
                        validatedRow[col.name] = Number(value);
                    }
                    break;
                case 'date':
                    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                        errors.push(`${col.label || col.name}: must be YYYY-MM-DD format`);
                    }
                    break;
                case 'fk_supplier': {
                    const supplierId = supplierMap.get(value.toLowerCase());
                    if (!supplierId) {
                        errors.push(`${col.label || col.name}: supplier "${value}" not found`);
                    } else {
                        validatedRow._resolved_supplier_id = supplierId;
                    }
                    break;
                }
                case 'fk_customer': {
                    const customerId = customerMap.get(value.toLowerCase());
                    if (!customerId) {
                        errors.push(`${col.label || col.name}: customer "${value}" not found`);
                    } else {
                        validatedRow._resolved_customer_id = customerId;
                    }
                    break;
                }
            }
        });

        if (errors.length > 0) {
            invalid.push({ ...validatedRow, _errors: errors });
        } else {
            valid.push(validatedRow);
        }
    });

    return { valid, invalid };
}

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

function transformRowForStore(row, entityType) {
    if (entityType === 'customers') {
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
    if (entityType === 'suppliers') {
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
    if (entityType === 'inventory') {
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
    if (entityType === 'sales') {
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
    return row;
}

async function importRows(entityType, rows) {
    const results = { success: 0, failed: [] };

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
            results.success++;
        } catch (err) {
            results.failed.push({ row: row._rowIndex, error: err.message });
        }
    }

    return results;
}

function generateTemplateCSV(entityType) {
    const schema = SCHEMAS[entityType];
    if (!schema) throw new Error(`Unknown entity type: ${entityType}`);
    return schema.columns.map(c => c.name).join(',');
}

function downloadTemplateExcel(entityType) {
    if (typeof XLSX === 'undefined') {
        alert('Excel library not loaded. Please try CSV instead.');
        return;
    }
    const schema = SCHEMAS[entityType];
    if (!schema) throw new Error(`Unknown entity type: ${entityType}`);

    const headers = schema.columns.map(c => c.name);
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, schema.displayName);
    XLSX.writeFile(wb, `${entityType}_template.xlsx`);
}

function downloadTemplateCSV(entityType) {
    const csv = generateTemplateCSV(entityType);
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${entityType}_template.csv`;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 100);
}

window.CsvImportCore = {
    SCHEMAS,
    parseCSV,
    parseExcel,
    parseFile,
    validateRows,
    transformRowForStore,
    importRows,
    generateTemplateCSV,
    downloadTemplateExcel,
    downloadTemplateCSV
};
