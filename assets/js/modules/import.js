/**
 * CSV/Excel Import Module
 * Bulk import functionality for Customers, Suppliers, Inventory, and Sales
 */

// ==================== Schema Definitions ====================

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

// ==================== Parsing Functions ====================

/**
 * Parse CSV file using PapaParse
 * @param {File} file - The CSV file
 * @returns {Promise<{data: Array, errors: Array}>}
 */
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
            complete: (results) => {
                resolve({
                    data: results.data,
                    errors: results.errors
                });
            },
            error: (error) => reject(error)
        });
    });
}

/**
 * Parse Excel file using SheetJS
 * @param {File} file - The Excel file
 * @returns {Promise<{data: Array, errors: Array}>}
 */
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
                // Normalize headers
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

/**
 * Parse file based on extension
 * @param {File} file
 * @returns {Promise<{data: Array, errors: Array}>}
 */
async function parseFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'csv') {
        return parseCSV(file);
    } else if (ext === 'xlsx' || ext === 'xls') {
        return parseExcel(file);
    } else {
        throw new Error(`Unsupported file format: .${ext}. Please use CSV or Excel (.xlsx) files.`);
    }
}

// ==================== Validation ====================

/**
 * Validate email format
 */
function isValidEmail(str) {
    if (!str) return true; // Empty is OK for optional fields
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
}

/**
 * Validate URL format
 */
function isValidUrl(str) {
    if (!str) return true;
    try {
        new URL(str.startsWith('http') ? str : `https://${str}`);
        return true;
    } catch {
        return false;
    }
}

/**
 * Validate rows against schema
 * @param {Array} data - Parsed data rows
 * @param {Object} schema - Schema definition
 * @returns {{valid: Array, invalid: Array}}
 */
function validateRows(data, schema) {
    const valid = [];
    const invalid = [];

    // Build lookup maps for FK resolution
    const suppliers = window.Store?.getSuppliers() || [];
    const customers = window.Store?.getCustomers() || [];
    const supplierMap = new Map(suppliers.map(s => [s.short_name?.toLowerCase(), s.id]));
    const customerMap = new Map(customers.map(c => [c.short_name?.toLowerCase(), c.id]));

    data.forEach((row, index) => {
        const errors = [];
        const validatedRow = { _rowIndex: index + 2 }; // +2 for 1-indexed and header row

        schema.columns.forEach(col => {
            const value = (row[col.name] ?? '').toString().trim();
            validatedRow[col.name] = value;

            // Required check
            if (col.required && !value) {
                errors.push(`${col.label || col.name} is required`);
                return;
            }

            // Type-specific validation
            if (value) {
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
                        if (isNaN(Number(value))) {
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

// ==================== Data Import ====================

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

/**
 * Transform row data to match Store API format
 */
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
    } else if (entityType === 'suppliers') {
        return {
            shortName: row.short_name,
            fullName: row.full_name,
            contactName: row.contact_name || '',
            contactEmail: row.contact_email || '',
            contactPhone: row.contact_phone || '',
            portalUrl: row.portal_url || '',
            notes: row.notes || ''
        };
    } else if (entityType === 'inventory') {
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
    } else if (entityType === 'sales') {
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
                aEnd: {
                    city: row.aend_city || '',
                    pop: row.aend_pop || ''
                },
                zEnd: {
                    city: row.zend_city || '',
                    pop: row.zend_pop || ''
                }
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

/**
 * Import validated rows to Supabase
 * @param {string} entityType - 'customers', 'suppliers', 'inventory', or 'sales'
 * @param {Array} rows - Validated rows
 * @returns {Promise<{success: number, failed: Array}>}
 */
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
            results.failed.push({
                row: row._rowIndex,
                error: err.message
            });
        }
    }

    return results;
}

// ==================== Template Generation ====================

/**
 * Generate CSV template content
 */
function generateTemplateCSV(entityType) {
    const schema = SCHEMAS[entityType];
    if (!schema) throw new Error(`Unknown entity type: ${entityType}`);

    const headers = schema.columns.map(c => c.name);
    return headers.join(',');
}

/**
 * Generate Excel template and trigger download
 */
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

/**
 * Download CSV template
 */
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

// ==================== Import Modal UI ====================

const escapeHtml = (str) => {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

let currentImportState = {
    entityType: null,
    file: null,
    parsedData: null,
    validationResult: null
};

/**
 * Open import modal for entity type
 */
function openImportModal(entityType) {
    const schema = SCHEMAS[entityType];
    if (!schema) {
        alert(`Import not supported for: ${entityType}`);
        return;
    }

    currentImportState = {
        entityType,
        file: null,
        parsedData: null,
        validationResult: null
    };

    const modalHtml = `
        <div class="modal-backdrop" onclick="CsvImport.closeImportModal(event)">
            <div class="modal modal-lg" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h3>Import ${schema.displayName}</h3>
                    <button class="btn btn-icon" onclick="CsvImport.closeImportModal()"><ion-icon name="close-outline"></ion-icon></button>
                </div>
                <div class="modal-body" id="import-modal-body">
                    ${renderStep1(entityType)}
                </div>
                <div class="modal-footer" id="import-modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="CsvImport.closeImportModal()">Cancel</button>
                </div>
            </div>
        </div>
    `;
    document.getElementById('modal-container').innerHTML = modalHtml;
}

/**
 * Close import modal
 */
function closeImportModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('modal-container').innerHTML = '';
    currentImportState = { entityType: null, file: null, parsedData: null, validationResult: null };
}

/**
 * Render Step 1: Download Template
 */
function renderStep1(entityType) {
    return `
        <div class="import-step">
            <div class="step-header">
                <span class="step-number active">1</span>
                <span class="step-title">Download Template</span>
                <span class="step-number">2</span>
                <span class="step-title">Upload File</span>
                <span class="step-number">3</span>
                <span class="step-title">Preview & Validate</span>
            </div>
            <div class="step-content" style="text-align: center; padding: 2rem;">
                <p style="margin-bottom: 1.5rem; color: var(--text-muted);">
                    Download a template file, fill it with your data, then upload it in the next step.
                </p>
                <div style="display: flex; gap: 1rem; justify-content: center;">
                    <button class="btn btn-secondary" onclick="CsvImport.downloadTemplateCSV('${entityType}')">
                        <ion-icon name="document-text-outline"></ion-icon> Download CSV
                    </button>
                    <button class="btn btn-secondary" onclick="CsvImport.downloadTemplateExcel('${entityType}')">
                        <ion-icon name="grid-outline"></ion-icon> Download Excel
                    </button>
                </div>
                <div style="margin-top: 2rem;">
                    <button class="btn btn-primary" onclick="CsvImport.goToStep2()">
                        Next: Upload File <ion-icon name="arrow-forward-outline"></ion-icon>
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Go to Step 2: Upload File
 */
function goToStep2() {
    document.getElementById('import-modal-body').innerHTML = renderStep2();
}

/**
 * Render Step 2: Upload File
 */
function renderStep2() {
    return `
        <div class="import-step">
            <div class="step-header">
                <span class="step-number done">1</span>
                <span class="step-title">Download Template</span>
                <span class="step-number active">2</span>
                <span class="step-title">Upload File</span>
                <span class="step-number">3</span>
                <span class="step-title">Preview & Validate</span>
            </div>
            <div class="step-content">
                <div class="file-drop-zone" id="import-drop-zone" 
                    ondragover="CsvImport.handleDragOver(event)" 
                    ondragleave="CsvImport.handleDragLeave(event)"
                    ondrop="CsvImport.handleDrop(event)"
                    onclick="document.getElementById('import-file-input').click()">
                    <ion-icon name="cloud-upload-outline" style="font-size: 3rem; color: var(--accent-primary);"></ion-icon>
                    <p style="margin: 1rem 0 0.5rem; font-weight: 500;">Drag & drop your file here</p>
                    <p style="color: var(--text-muted); font-size: 0.875rem;">or click to browse</p>
                    <p style="color: var(--text-muted); font-size: 0.75rem; margin-top: 0.5rem;">Supports CSV and Excel (.xlsx)</p>
                    <input type="file" id="import-file-input" accept=".csv,.xlsx,.xls" style="display: none;" onchange="CsvImport.handleFileSelect(event)">
                </div>
                <div id="import-file-info" style="display: none; margin-top: 1rem; padding: 1rem; background: var(--bg-tertiary); border-radius: 8px;">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <ion-icon name="document-attach-outline"></ion-icon>
                        <span id="import-file-name"></span>
                        <button class="btn btn-icon" onclick="CsvImport.clearFile()" style="margin-left: auto;">
                            <ion-icon name="close-outline"></ion-icon>
                        </button>
                    </div>
                </div>
                <div style="margin-top: 2rem; display: flex; gap: 1rem; justify-content: space-between;">
                    <button class="btn btn-secondary" onclick="CsvImport.goToStep1()">
                        <ion-icon name="arrow-back-outline"></ion-icon> Back
                    </button>
                    <button class="btn btn-primary" id="import-validate-btn" onclick="CsvImport.validateAndPreview()" disabled>
                        Validate & Preview <ion-icon name="arrow-forward-outline"></ion-icon>
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Go back to Step 1
 */
function goToStep1() {
    document.getElementById('import-modal-body').innerHTML = renderStep1(currentImportState.entityType);
}

// File handling
function handleDragOver(event) {
    event.preventDefault();
    event.currentTarget.classList.add('drag-over');
}

function handleDragLeave(event) {
    event.currentTarget.classList.remove('drag-over');
}

function handleDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('drag-over');
    const files = event.dataTransfer.files;
    if (files.length > 0) {
        setFile(files[0]);
    }
}

function handleFileSelect(event) {
    const files = event.target.files;
    if (files.length > 0) {
        setFile(files[0]);
    }
}

function setFile(file) {
    currentImportState.file = file;
    document.getElementById('import-file-info').style.display = 'block';
    document.getElementById('import-file-name').textContent = file.name;
    document.getElementById('import-validate-btn').disabled = false;
}

function clearFile() {
    currentImportState.file = null;
    currentImportState.parsedData = null;
    document.getElementById('import-file-info').style.display = 'none';
    document.getElementById('import-file-input').value = '';
    document.getElementById('import-validate-btn').disabled = true;
}

/**
 * Validate file and show preview
 */
async function validateAndPreview() {
    if (!currentImportState.file) return;

    const schema = SCHEMAS[currentImportState.entityType];
    const btn = document.getElementById('import-validate-btn');
    btn.disabled = true;
    btn.innerHTML = '<ion-icon name="hourglass-outline"></ion-icon> Validating...';

    try {
        const { data, errors } = await parseFile(currentImportState.file);
        if (errors.length > 0) {
            alert('Parse errors: ' + errors.map(e => e.message).join(', '));
            btn.disabled = false;
            btn.innerHTML = 'Validate & Preview <ion-icon name="arrow-forward-outline"></ion-icon>';
            return;
        }

        currentImportState.parsedData = data;
        const result = validateRows(data, schema);
        currentImportState.validationResult = result;

        // Render Step 3
        document.getElementById('import-modal-body').innerHTML = renderStep3(result, schema);
        document.getElementById('import-modal-footer').innerHTML = `
            <button type="button" class="btn btn-secondary" onclick="CsvImport.goToStep2()">Back</button>
            <button type="button" class="btn btn-primary" onclick="CsvImport.executeImport()" ${result.valid.length === 0 ? 'disabled' : ''}>
                <ion-icon name="checkmark-outline"></ion-icon> Import ${result.valid.length} Row${result.valid.length !== 1 ? 's' : ''}
            </button>
        `;
    } catch (err) {
        alert('Error parsing file: ' + err.message);
        btn.disabled = false;
        btn.innerHTML = 'Validate & Preview <ion-icon name="arrow-forward-outline"></ion-icon>';
    }
}

/**
 * Render Step 3: Preview & Validate
 */
function renderStep3(result, schema) {
    const { valid, invalid } = result;
    const allRows = [...invalid, ...valid].sort((a, b) => a._rowIndex - b._rowIndex);
    const displayRows = allRows.slice(0, 10); // Show first 10

    const headers = schema.columns.slice(0, 4); // Show first 4 columns

    return `
        <div class="import-step">
            <div class="step-header">
                <span class="step-number done">1</span>
                <span class="step-title">Download Template</span>
                <span class="step-number done">2</span>
                <span class="step-title">Upload File</span>
                <span class="step-number active">3</span>
                <span class="step-title">Preview & Validate</span>
            </div>
            <div class="step-content">
                <div class="validation-summary" style="display: flex; gap: 1rem; margin-bottom: 1rem;">
                    <div style="padding: 0.75rem 1rem; background: var(--status-active-bg); border-radius: 8px; flex: 1;">
                        <ion-icon name="checkmark-circle" style="color: var(--status-active);"></ion-icon>
                        <strong>${valid.length}</strong> valid row${valid.length !== 1 ? 's' : ''}
                    </div>
                    ${invalid.length > 0 ? `
                        <div style="padding: 0.75rem 1rem; background: var(--status-expired-bg); border-radius: 8px; flex: 1;">
                            <ion-icon name="alert-circle" style="color: var(--status-expired);"></ion-icon>
                            <strong>${invalid.length}</strong> error${invalid.length !== 1 ? 's' : ''}
                        </div>
                    ` : ''}
                </div>

                <div class="table-container" style="max-height: 300px; overflow: auto;">
                    <table class="import-preview-table">
                        <thead>
                            <tr>
                                <th style="width: 40px;">Row</th>
                                <th style="width: 40px;"></th>
                                ${headers.map(h => `<th>${escapeHtml(h.label || h.name)}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${displayRows.map(row => {
        const hasError = row._errors && row._errors.length > 0;
        return `
                                    <tr class="${hasError ? 'row-error' : 'row-valid'}">
                                        <td>${row._rowIndex}</td>
                                        <td>
                                            ${hasError
                ? `<ion-icon name="alert-circle" style="color: var(--status-expired);" title="${escapeHtml(row._errors.join('; '))}"></ion-icon>`
                : `<ion-icon name="checkmark-circle" style="color: var(--status-active);"></ion-icon>`
            }
                                        </td>
                                        ${headers.map(h => `<td>${escapeHtml(row[h.name] || '')}</td>`).join('')}
                                    </tr>
                                    ${hasError ? `<tr class="error-detail"><td colspan="${headers.length + 2}" style="color: var(--status-expired); font-size: 0.8rem; padding: 0.25rem 0.5rem;">${escapeHtml(row._errors.join('; '))}</td></tr>` : ''}
                                `;
    }).join('')}
                        </tbody>
                    </table>
                </div>
                ${allRows.length > 10 ? `<p style="color: var(--text-muted); font-size: 0.875rem; margin-top: 0.5rem;">Showing first 10 of ${allRows.length} rows</p>` : ''}
            </div>
        </div>
    `;
}

/**
 * Execute the import
 */
async function executeImport() {
    const { valid } = currentImportState.validationResult;
    if (valid.length === 0) return;

    const btn = document.querySelector('#import-modal-footer .btn-primary');
    btn.disabled = true;
    btn.innerHTML = '<ion-icon name="hourglass-outline"></ion-icon> Importing...';

    try {
        const result = await importRows(currentImportState.entityType, valid);

        // Show result
        document.getElementById('import-modal-body').innerHTML = `
            <div class="import-result" style="text-align: center; padding: 2rem;">
                <ion-icon name="checkmark-circle" style="font-size: 4rem; color: var(--status-active);"></ion-icon>
                <h3 style="margin: 1rem 0;">Import Complete!</h3>
                <p style="color: var(--text-muted);">${result.success} record${result.success !== 1 ? 's' : ''} imported successfully.</p>
                ${result.failed.length > 0 ? `
                    <p style="color: var(--status-expired); margin-top: 1rem;">${result.failed.length} failed to import.</p>
                    <ul style="text-align: left; max-height: 150px; overflow: auto; margin-top: 0.5rem;">
                        ${result.failed.map(f => `<li>Row ${f.row}: ${escapeHtml(f.error)}</li>`).join('')}
                    </ul>
                ` : ''}
            </div>
        `;
        document.getElementById('import-modal-footer').innerHTML = `
            <button type="button" class="btn btn-primary" onclick="CsvImport.closeImportModal(); App.render${currentImportState.entityType.charAt(0).toUpperCase() + currentImportState.entityType.slice(1)}();">Done</button>
        `;
    } catch (err) {
        alert('Import failed: ' + err.message);
        btn.disabled = false;
        btn.innerHTML = `<ion-icon name="checkmark-outline"></ion-icon> Import ${valid.length} Rows`;
    }
}

// ==================== CSS Styles ====================

const importStyles = `
<style id="import-module-styles">
.file-drop-zone {
    border: 2px dashed var(--border-color);
    border-radius: 12px;
    padding: 3rem 2rem;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s ease;
}
.file-drop-zone:hover, .file-drop-zone.drag-over {
    border-color: var(--accent-primary);
    background: var(--bg-tertiary);
}
.step-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border-color);
}
.step-number {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--bg-tertiary);
    color: var(--text-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 600;
}
.step-number.active {
    background: var(--accent-primary);
    color: white;
}
.step-number.done {
    background: var(--status-active);
    color: white;
}
.step-title {
    font-size: 0.875rem;
    color: var(--text-muted);
    margin-right: 1rem;
}
.import-preview-table {
    width: 100%;
    font-size: 0.875rem;
}
.import-preview-table th, .import-preview-table td {
    padding: 0.5rem;
    border-bottom: 1px solid var(--border-color);
}
.row-error {
    background: rgba(239, 68, 68, 0.1);
}
.row-valid {
    background: transparent;
}
.error-detail {
    background: rgba(239, 68, 68, 0.05);
}
.modal-lg {
    max-width: 700px;
    width: 90%;
}
</style>
`;

// Inject styles on load
if (!document.getElementById('import-module-styles')) {
    document.head.insertAdjacentHTML('beforeend', importStyles);
}

// ==================== Export ====================

window.CsvImport = {
    openImportModal,
    closeImportModal,
    downloadTemplateCSV,
    downloadTemplateExcel,
    goToStep1,
    goToStep2,
    validateAndPreview,
    executeImport,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileSelect,
    clearFile,
    // For testing
    parseCSV,
    parseExcel,
    parseFile,
    validateRows,
    SCHEMAS
};
