/**
 * Import row validation helpers.
 */

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
    const supplierMap = new Map(suppliers.map((supplier) => [supplier.short_name?.toLowerCase(), supplier.id]));
    const customerMap = new Map(customers.map((customer) => [customer.short_name?.toLowerCase(), customer.id]));

    data.forEach((row, index) => {
        const errors = [];
        const validatedRow = { _rowIndex: index + 2 };

        schema.columns.forEach((column) => {
            const value = (row[column.name] ?? '').toString().trim();
            validatedRow[column.name] = value;

            if (column.required && !value) {
                errors.push(`${column.label || column.name} is required`);
                return;
            }

            if (!value) return;

            switch (column.type) {
                case 'email':
                    if (!isValidEmail(value)) {
                        errors.push(`${column.label || column.name}: invalid email format`);
                    }
                    break;
                case 'url':
                    if (!isValidUrl(value)) {
                        errors.push(`${column.label || column.name}: invalid URL format`);
                    }
                    break;
                case 'enum':
                    if (column.options && !column.options.includes(value)) {
                        errors.push(`${column.label || column.name}: must be one of ${column.options.join(', ')}`);
                    }
                    break;
                case 'number':
                    if (Number.isNaN(Number(value))) {
                        errors.push(`${column.label || column.name}: must be a number`);
                    } else {
                        validatedRow[column.name] = Number(value);
                    }
                    break;
                case 'date':
                    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                        errors.push(`${column.label || column.name}: must be YYYY-MM-DD format`);
                    }
                    break;
                case 'fk_supplier': {
                    const supplierId = supplierMap.get(value.toLowerCase());
                    if (!supplierId) {
                        errors.push(`${column.label || column.name}: supplier "${value}" not found`);
                    } else {
                        validatedRow._resolved_supplier_id = supplierId;
                    }
                    break;
                }
                case 'fk_customer': {
                    const customerId = customerMap.get(value.toLowerCase());
                    if (!customerId) {
                        errors.push(`${column.label || column.name}: customer "${value}" not found`);
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

window.CsvImportValidation = {
    validateRows
};
