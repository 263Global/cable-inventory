const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const rootDir = path.resolve(__dirname, '..');

// Minimal browser-like globals for the scripts under test.
global.window = global;
global.document = {};

const loadScript = (relativePath) => {
    const fullPath = path.join(rootDir, relativePath);
    const code = fs.readFileSync(fullPath, 'utf8');
    vm.runInThisContext(code, { filename: fullPath });
};

loadScript('assets/js/inventoryStatus.js');
loadScript('assets/js/salesStatus.js');
loadScript('assets/js/modules/financials.js');
loadScript('assets/js/store.js');
loadScript('assets/js/modules/importCore/schemas.js');
loadScript('assets/js/modules/importCore/parsers.js');
loadScript('assets/js/modules/importCore/validation.js');
loadScript('assets/js/modules/importCore/transform.js');
loadScript('assets/js/modules/importCore/persistence.js');
const realStore = window.Store;

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

const nearlyEqual = (actual, expected, epsilon = 1e-6) => {
    assert.ok(Math.abs(actual - expected) <= epsilon, `Expected ${actual} to be within ${epsilon} of ${expected}`);
};

const withSilencedConsoleError = async (fn) => {
    const previousConsoleError = console.error;
    console.error = () => { };
    try {
        await fn();
    } finally {
        console.error = previousConsoleError;
    }
};

test('InventoryStatus.computeInventoryStatus handles expired', () => {
    const item = { dates: { end: '2023-12-01' }, capacity: { value: 10 } };
    const now = new Date('2024-01-10');
    const result = window.InventoryStatus.computeInventoryStatus(item, 0, now);
    assert.strictEqual(result.calculatedStatus, 'Expired');
});

test('InventoryStatus.computeInventoryStatus handles draft', () => {
    const item = { dates: { start: '2024-02-01', end: '2024-12-01' }, capacity: { value: 10 } };
    const now = new Date('2024-01-10');
    const result = window.InventoryStatus.computeInventoryStatus(item, 0, now);
    assert.strictEqual(result.calculatedStatus, 'Draft');
});

test('InventoryStatus.computeInventoryStatus handles sold out', () => {
    const item = { dates: { start: '2024-01-01', end: '2024-12-01' }, capacity: { value: 10 } };
    const now = new Date('2024-01-10');
    const result = window.InventoryStatus.computeInventoryStatus(item, 10, now);
    assert.strictEqual(result.calculatedStatus, 'Sold Out');
});

test('InventoryStatus.buildSalesIndex aggregates by resource', () => {
    const sales = [
        { inventoryLink: 'INV-1', capacity: { value: 2 } },
        { inventoryLink: 'INV-1', capacity: { value: 3 } },
        { inventoryLink: 'INV-2', capacity: { value: 4 } }
    ];
    const { byResourceId, soldByResourceId } = window.InventoryStatus.buildSalesIndex(sales);
    assert.strictEqual(byResourceId.get('INV-1').length, 2);
    assert.strictEqual(soldByResourceId.get('INV-1'), 5);
    assert.strictEqual(soldByResourceId.get('INV-2'), 4);
});

test('InventoryStatus.buildSalesIndex excludes expired sales', () => {
    const now = new Date('2024-06-15');
    const realDate = Date;
    global.Date = class extends realDate {
        constructor(value) {
            if (value !== undefined) return super(value);
            return new realDate(now);
        }
        static now() {
            return now.getTime();
        }
        static parse(value) {
            return realDate.parse(value);
        }
        static UTC(...args) {
            return realDate.UTC(...args);
        }
    };

    try {
        const sales = [
            { inventoryLink: 'INV-1', capacity: { value: 2 }, dates: { start: '2024-01-01', end: '2024-06-01' } }, // expired
            { inventoryLink: 'INV-1', capacity: { value: 3 }, dates: { start: '2024-06-10', end: '2024-12-31' } }, // active
            { inventoryLink: 'INV-2', capacity: { value: 4 } } // no dates => active fallback
        ];
        const { byResourceId, soldByResourceId } = window.InventoryStatus.buildSalesIndex(sales);
        assert.strictEqual(byResourceId.get('INV-1').length, 1);
        assert.strictEqual(soldByResourceId.get('INV-1'), 3);
        assert.strictEqual(soldByResourceId.get('INV-2'), 4);
    } finally {
        global.Date = realDate;
    }
});

test('SalesStatus.computeSalesStatus returns pending/active/expired', () => {
    const now = new Date('2024-06-15');
    assert.strictEqual(window.SalesStatus.computeSalesStatus('2024-06-20', '2024-12-01', now), 'Pending');
    assert.strictEqual(window.SalesStatus.computeSalesStatus('2024-06-01', '2024-12-01', now), 'Active');
    assert.strictEqual(window.SalesStatus.computeSalesStatus('2024-01-01', '2024-06-01', now), 'Expired');
});

test('SalesStatus.computeSalesStatus returns Terminated when terminatedAt is set', () => {
    const now = new Date('2024-06-15');
    // Even if dates say Active, terminatedAt takes priority
    assert.strictEqual(window.SalesStatus.computeSalesStatus('2024-01-01', '2024-12-31', now, '2024-06-10'), 'Terminated');
    // Also works with null terminatedAt (should not affect normal status)
    assert.strictEqual(window.SalesStatus.computeSalesStatus('2024-01-01', '2024-12-31', now, null), 'Active');
});

test('SalesStatus.getSalesStatusBadgeClass returns correct class for Terminated', () => {
    assert.strictEqual(window.SalesStatus.getSalesStatusBadgeClass('Terminated'), 'badge-terminated');
    assert.strictEqual(window.SalesStatus.getSalesStatusBadgeClass('Active'), 'badge-success');
});

test('InventoryStatus.buildSalesIndex excludes terminated sales', () => {
    const now = new Date('2024-06-15');
    const realDate = Date;
    global.Date = class extends realDate {
        constructor(value) {
            if (value !== undefined) return super(value);
            return new realDate(now);
        }
        static now() { return now.getTime(); }
        static parse(value) { return realDate.parse(value); }
        static UTC(...args) { return realDate.UTC(...args); }
    };

    try {
        const sales = [
            { inventoryLink: 'INV-1', capacity: { value: 5 }, terminatedAt: '2024-06-10' }, // terminated
            { inventoryLink: 'INV-1', capacity: { value: 3 } }, // active (no dates, no terminated)
        ];
        const { byResourceId, soldByResourceId } = window.InventoryStatus.buildSalesIndex(sales);
        assert.strictEqual(byResourceId.get('INV-1').length, 1);
        assert.strictEqual(soldByResourceId.get('INV-1'), 3);
    } finally {
        global.Date = realDate;
    }
});

test('computeCapacityRatio converts Tbps to Gbps', () => {
    const ratio = window.computeCapacityRatio(1000, 'Gbps', 10, 'Tbps');
    nearlyEqual(ratio, 0.1);
});

test('computeOrderFinancials allocates batch + base costs by capacity', () => {
    const inventory = [{
        resourceId: 'INV-BATCH',
        acquisition: { ownership: 'IRU' },
        capacity: { value: 10000, unit: 'Gbps' },
        costMode: 'batches',
        baseCost: {
            model: 'IRU',
            otc: 120000,
            termMonths: 120,
            annualOm: 12000
        },
        batches: [{
            batchId: 'BAT-1',
            status: 'Active',
            startDate: '2023-12-01',
            capacity: { value: 1000, unit: 'Gbps' },
            model: 'IRU',
            financials: {
                otc: 60000,
                termMonths: 120,
                annualOm: 6000
            }
        }]
    }];
    window.Store = { getInventory: () => inventory };

    const order = {
        salesModel: 'Lease',
        salesType: 'Inventory',
        inventoryLink: 'INV-BATCH',
        capacity: { value: 1000, unit: 'Gbps' },
        dates: { term: 12, start: '2024-01-01' },
        financials: { mrcSales: 2000 },
        batchAllocations: [{ batchId: 'BAT-1', capacityAllocated: 1000 }],
        costs: {}
    };

    const result = window.computeOrderFinancials(order);
    nearlyEqual(result.monthlyProfit, 800);
});

test('computeOrderFinancials sums cable segments', () => {
    window.Store = { getInventory: () => [] };
    const order = {
        salesModel: 'Lease',
        salesType: 'Resale',
        financials: { mrcSales: 1000 },
        costs: {
            cableSegments: [
                { model: 'Lease', mrc: 100 },
                { model: 'IRU', annualOm: 2400 }
            ]
        }
    };

    const result = window.computeOrderFinancials(order);
    nearlyEqual(result.monthlyProfit, 700);
});

test('computeOrderFinancials handles Lease Inventory with operating costs', () => {
    const inventory = [{
        resourceId: 'INV-1',
        acquisition: { ownership: 'Lease' },
        capacity: { value: 10 },
        financials: { mrc: 200 }
    }];
    window.Store = { getInventory: () => inventory };

    const order = {
        salesModel: 'Lease',
        salesType: 'Inventory',
        inventoryLink: 'INV-1',
        capacity: { value: 10 },
        dates: { term: 12 },
        financials: { mrcSales: 1000 },
        costs: { otherCosts: { monthly: 50 } }
    };

    const result = window.computeOrderFinancials(order);
    assert.strictEqual(result.monthlyRevenue, 1000);
    assert.strictEqual(result.monthlyProfit, 750);
    nearlyEqual(result.marginPercent, 75);
});

test('computeOrderFinancials handles IRU Resale recurring margin', () => {
    window.Store = { getInventory: () => [] };
    const order = {
        salesModel: 'IRU',
        salesType: 'Resale',
        dates: { term: 12 },
        financials: { otc: 12000, annualOm: 1200 },
        costs: { cable: { otc: 6000, annualOm: 600 } }
    };

    const result = window.computeOrderFinancials(order);
    assert.strictEqual(result.isIruResale, true);
    nearlyEqual(result.monthlyRevenue, 100);
    nearlyEqual(result.monthlyProfit, 50);
    nearlyEqual(result.marginPercent, 50);
});

test('Store.replaceInventoryBatches aborts when delete fails', async () => {
    const store = realStore;
    const previousWindowStore = window.Store;
    const previousSupabase = window.SupabaseClient;
    const previousInventory = store.inventory;
    const previousBatches = store.inventoryBatches;

    const existing = [{
        batchId: 'BAT-OLD-1',
        resourceId: 'INV-ROLLBACK-1',
        orderId: 'PO-1',
        model: 'IRU',
        capacity: { value: 10, unit: 'Gbps' },
        financials: { mrc: 0, otc: 1000, omRate: 3, annualOm: 30, termMonths: 12 },
        startDate: '2024-01-01',
        status: 'Active'
    }];

    try {
        window.Store = store;
        store.inventory = [{ resourceId: 'INV-ROLLBACK-1' }];
        store.inventoryBatches = existing.map((row) => ({ ...row }));
        window.SupabaseClient = {
            from(table) {
                assert.strictEqual(table, 'inventory_batches');
                return {
                    delete() {
                        return {
                            async eq() {
                                return { error: new Error('delete failed') };
                            }
                        };
                    }
                };
            }
        };

        await withSilencedConsoleError(async () => {
            await assert.rejects(() => store.replaceInventoryBatches('INV-ROLLBACK-1', []), /delete failed/);
        });
        assert.deepStrictEqual(store.inventoryBatches, existing);
    } finally {
        window.Store = previousWindowStore;
        window.SupabaseClient = previousSupabase;
        store.inventory = previousInventory;
        store.inventoryBatches = previousBatches;
    }
});

test('Store.replaceInventoryBatches attempts rollback when insert fails', async () => {
    const store = realStore;
    const previousWindowStore = window.Store;
    const previousSupabase = window.SupabaseClient;
    const previousInventory = store.inventory;
    const previousBatches = store.inventoryBatches;

    const existing = [{
        batchId: 'BAT-OLD-2',
        resourceId: 'INV-ROLLBACK-2',
        orderId: 'PO-2',
        model: 'Lease',
        capacity: { value: 20, unit: 'Gbps' },
        financials: { mrc: 200, otc: 0, omRate: 0, annualOm: 0, termMonths: 24 },
        startDate: '2024-02-01',
        status: 'Planned'
    }];
    const replacement = [{
        batchId: 'BAT-NEW-1',
        resourceId: 'INV-ROLLBACK-2',
        orderId: 'PO-NEW',
        model: 'IRU',
        capacity: { value: 5, unit: 'Gbps' },
        financials: { mrc: 0, otc: 500, omRate: 3, annualOm: 15, termMonths: 12 },
        startDate: '2024-03-01',
        status: 'Planned'
    }];

    let insertCallCount = 0;
    let rollbackPayload = null;

    try {
        window.Store = store;
        store.inventory = [{ resourceId: 'INV-ROLLBACK-2' }];
        store.inventoryBatches = existing.map((row) => ({ ...row }));
        window.SupabaseClient = {
            from(table) {
                assert.strictEqual(table, 'inventory_batches');
                return {
                    delete() {
                        return {
                            async eq() {
                                return { error: null };
                            }
                        };
                    },
                    insert(payload) {
                        insertCallCount += 1;
                        if (insertCallCount === 1) {
                            assert.deepStrictEqual(payload, replacement.map((b) => store.inventoryBatchToDb(b)));
                            return {
                                error: null,
                                async select() {
                                    return { data: null, error: new Error('insert failed') };
                                }
                            };
                        }
                        rollbackPayload = payload;
                        return { error: null };
                    }
                };
            }
        };

        await withSilencedConsoleError(async () => {
            await assert.rejects(() => store.replaceInventoryBatches('INV-ROLLBACK-2', replacement), /insert failed/);
        });
        assert.strictEqual(insertCallCount, 2);
        assert.deepStrictEqual(rollbackPayload, existing.map((b) => store.inventoryBatchToDb(b)));
        assert.deepStrictEqual(store.inventoryBatches, existing);
    } finally {
        window.Store = previousWindowStore;
        window.SupabaseClient = previousSupabase;
        store.inventory = previousInventory;
        store.inventoryBatches = previousBatches;
    }
});

test('Store.replaceSalesOrderBatches aborts when delete fails', async () => {
    const store = realStore;
    const previousWindowStore = window.Store;
    const previousSupabase = window.SupabaseClient;
    const previousAllocations = store.salesOrderBatches;

    const existing = [{
        salesOrderId: 'SO-ROLLBACK-1',
        batchId: 'BAT-1',
        capacityAllocated: 3
    }];

    try {
        window.Store = store;
        store.salesOrderBatches = existing.map((row) => ({ ...row }));
        window.SupabaseClient = {
            from(table) {
                assert.strictEqual(table, 'sales_order_batches');
                return {
                    delete() {
                        return {
                            async eq() {
                                return { error: new Error('delete failed') };
                            }
                        };
                    }
                };
            }
        };

        await withSilencedConsoleError(async () => {
            await assert.rejects(() => store.replaceSalesOrderBatches('SO-ROLLBACK-1', []), /delete failed/);
        });
        assert.deepStrictEqual(store.salesOrderBatches, existing);
    } finally {
        window.Store = previousWindowStore;
        window.SupabaseClient = previousSupabase;
        store.salesOrderBatches = previousAllocations;
    }
});

test('Store.replaceSalesOrderBatches attempts rollback when insert fails', async () => {
    const store = realStore;
    const previousWindowStore = window.Store;
    const previousSupabase = window.SupabaseClient;
    const previousAllocations = store.salesOrderBatches;

    const existing = [{
        salesOrderId: 'SO-ROLLBACK-2',
        batchId: 'BAT-OLD',
        capacityAllocated: 8
    }];
    const replacement = [{
        batchId: 'BAT-NEW',
        capacityAllocated: 5
    }];

    let insertCallCount = 0;
    let rollbackPayload = null;

    try {
        window.Store = store;
        store.salesOrderBatches = existing.map((row) => ({ ...row }));
        window.SupabaseClient = {
            from(table) {
                assert.strictEqual(table, 'sales_order_batches');
                return {
                    delete() {
                        return {
                            async eq() {
                                return { error: null };
                            }
                        };
                    },
                    insert(payload) {
                        insertCallCount += 1;
                        if (insertCallCount === 1) {
                            assert.deepStrictEqual(payload, [{
                                sales_order_id: 'SO-ROLLBACK-2',
                                batch_id: 'BAT-NEW',
                                capacity_allocated: 5
                            }]);
                            return {
                                error: null,
                                async select() {
                                    return { data: null, error: new Error('insert failed') };
                                }
                            };
                        }
                        rollbackPayload = payload;
                        return { error: null };
                    }
                };
            }
        };

        await withSilencedConsoleError(async () => {
            await assert.rejects(() => store.replaceSalesOrderBatches('SO-ROLLBACK-2', replacement), /insert failed/);
        });
        assert.strictEqual(insertCallCount, 2);
        assert.deepStrictEqual(rollbackPayload, [{
            sales_order_id: 'SO-ROLLBACK-2',
            batch_id: 'BAT-OLD',
            capacity_allocated: 8
        }]);
        assert.deepStrictEqual(store.salesOrderBatches, existing);
    } finally {
        window.Store = previousWindowStore;
        window.SupabaseClient = previousSupabase;
        store.salesOrderBatches = previousAllocations;
    }
});

test('CsvImportParsers.parseExcel normalizes date-like values to YYYY-MM-DD', async () => {
    const previousXlsx = global.XLSX;
    const previousFileReader = global.FileReader;

    class MockFileReader {
        readAsArrayBuffer() {
            if (typeof this.onload === 'function') {
                this.onload({ target: { result: new ArrayBuffer(8) } });
            }
        }
    }

    global.FileReader = MockFileReader;
    global.XLSX = {
        read() {
            return {
                SheetNames: ['Sheet1'],
                Sheets: { Sheet1: {} }
            };
        },
        utils: {
            sheet_to_json() {
                return [
                    {
                        'Start Date': new Date(2026, 1, 9),
                        'Created At': 45292,
                        Customer: 'ACME'
                    }
                ];
            }
        },
        SSF: {
            parse_date_code(value) {
                if (value === 45292) return { y: 2024, m: 1, d: 1 };
                return null;
            }
        }
    };

    try {
        const result = await window.CsvImportParsers.parseExcel({ name: 'sample.xlsx' });
        assert.deepStrictEqual(result.errors, []);
        assert.strictEqual(result.data.length, 1);
        assert.strictEqual(result.data[0].start_date, '2026-02-09');
        assert.strictEqual(result.data[0].created_at, '2024-01-01');
        assert.strictEqual(result.data[0].customer, 'ACME');
    } finally {
        global.XLSX = previousXlsx;
        global.FileReader = previousFileReader;
    }
});

test('CsvImportParsers.parseFile rejects unsupported extensions', async () => {
    await assert.rejects(
        () => window.CsvImportParsers.parseFile({ name: 'input.txt' }),
        /Unsupported file format/
    );
});

test('CsvImportValidation.validateRows resolves foreign keys', () => {
    const previousStore = window.Store;
    window.Store = {
        getSuppliers: () => [{ id: 'sup-1', short_name: 'SUPA' }],
        getCustomers: () => [{ id: 'cus-1', short_name: 'ACME' }]
    };

    try {
        const inventoryRows = [
            {
                resource_id: 'INV-100',
                supplier: 'supa',
                capacity_value: '10',
                cost_model: 'Lease',
                term_months: '12',
                start_date: '2026-01-01'
            }
        ];
        const inventoryResult = window.CsvImportValidation.validateRows(
            inventoryRows,
            window.CsvImportSchemas.inventory
        );
        assert.strictEqual(inventoryResult.valid.length, 1);
        assert.strictEqual(inventoryResult.invalid.length, 0);
        assert.strictEqual(inventoryResult.valid[0]._resolved_supplier_id, 'sup-1');

        const salesRows = [
            {
                sales_order_id: 'SO-100',
                customer: 'acme',
                sales_model: 'Lease',
                sales_type: 'Resale',
                capacity_value: '20',
                mrc_sales: '1000',
                term_months: '12',
                start_date: '2026-01-01'
            }
        ];
        const salesResult = window.CsvImportValidation.validateRows(
            salesRows,
            window.CsvImportSchemas.sales
        );
        assert.strictEqual(salesResult.valid.length, 1);
        assert.strictEqual(salesResult.invalid.length, 0);
        assert.strictEqual(salesResult.valid[0]._resolved_customer_id, 'cus-1');
    } finally {
        window.Store = previousStore;
    }
});

test('CsvImportTransform.transformRowForStore computes sales end date', () => {
    const previousStore = window.Store;
    window.Store = {
        getCustomerById: (id) => (id === 'cus-1' ? { short_name: 'ACME' } : null)
    };

    try {
        const transformed = window.CsvImportTransform.transformRowForStore({
            sales_order_id: 'SO-200',
            _resolved_customer_id: 'cus-1',
            sales_model: 'Lease',
            sales_type: 'Resale',
            capacity_value: 10,
            mrc_sales: 500,
            term_months: 2,
            start_date: '2026-01-15'
        }, 'sales');

        assert.strictEqual(transformed.customerName, 'ACME');
        assert.strictEqual(transformed.dates.end, '2026-03-14');
        assert.strictEqual(transformed.dates.term, 2);
    } finally {
        window.Store = previousStore;
    }
});

test('CsvImportPersistence.importRows continues after per-row failures', async () => {
    const previousStore = window.Store;
    const previousTransform = window.CsvImportTransform;

    window.CsvImportTransform = {
        transformRowForStore: (row) => ({ shortName: row.short_name })
    };
    window.Store = {
        async addCustomer(payload) {
            if (payload.shortName === 'BAD') {
                throw new Error('duplicate customer');
            }
            return payload;
        }
    };

    try {
        const result = await window.CsvImportPersistence.importRows('customers', [
            { _rowIndex: 2, short_name: 'GOOD' },
            { _rowIndex: 3, short_name: 'BAD' }
        ]);

        assert.strictEqual(result.success, 1);
        assert.deepStrictEqual(result.failed, [{ row: 3, error: 'duplicate customer' }]);
    } finally {
        window.Store = previousStore;
        window.CsvImportTransform = previousTransform;
    }
});

test('UI modules should not contain inline HTML event handlers', () => {
    const modulesDir = path.join(rootDir, 'assets/js/modules');
    const stack = [modulesDir];
    while (stack.length > 0) {
        const currentDir = stack.pop();
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);
            if (entry.isDirectory()) {
                stack.push(fullPath);
                continue;
            }
            if (!entry.isFile() || !entry.name.endsWith('.js')) continue;
            const content = fs.readFileSync(fullPath, 'utf8');
            assert.strictEqual(
                /<[^>]*\bon[a-z]+\s*=\s*['"]/i.test(content),
                false,
                `${path.relative(modulesDir, fullPath)} still contains inline HTML event handlers`
            );
        }
    }
});

let failed = 0;
const run = async () => {
    for (const t of tests) {
        try {
            await t.fn();
            console.log(`PASS: ${t.name}`);
        } catch (err) {
            failed += 1;
            console.error(`FAIL: ${t.name}`);
            console.error(err.stack || err.message || err);
        }
    }

    if (failed > 0) {
        process.exitCode = 1;
    }
};

run();
