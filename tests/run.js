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

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

const nearlyEqual = (actual, expected, epsilon = 1e-6) => {
    assert.ok(Math.abs(actual - expected) <= epsilon, `Expected ${actual} to be within ${epsilon} of ${expected}`);
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

test('SalesStatus.computeSalesStatus returns pending/active/expired', () => {
    const now = new Date('2024-06-15');
    assert.strictEqual(window.SalesStatus.computeSalesStatus('2024-06-20', '2024-12-01', now), 'Pending');
    assert.strictEqual(window.SalesStatus.computeSalesStatus('2024-06-01', '2024-12-01', now), 'Active');
    assert.strictEqual(window.SalesStatus.computeSalesStatus('2024-01-01', '2024-06-01', now), 'Expired');
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

let failed = 0;
for (const t of tests) {
    try {
        t.fn();
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
