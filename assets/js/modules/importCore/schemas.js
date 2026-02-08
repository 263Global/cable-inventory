/**
 * CSV/Excel import schemas.
 */

window.CsvImportSchemas = {
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
