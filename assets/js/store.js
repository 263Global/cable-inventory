/**
 * Store.js
 * Handles data persistence using localStorage
 */

const DB_KEY = 'cable_inventory_db_v1';

const generateId = () => Math.random().toString(36).substr(2, 9).toUpperCase();

const defaultData = {
    inventory: [
        {
            resourceId: 'INV-HKG-TYO-01',
            status: 'Available',
            cableSystem: 'APG',
            segmentType: 'Trunk',
            protection: 'Protected',
            acquisition: { type: 'Purchased', ownership: 'Leased', supplier: 'SubCom' },
            capacity: { unit: 'Gbps', value: 100 },
            location: {
                aEnd: { country: 'Hong Kong', city: 'Hong Kong', pop: 'Equinix HK1' },
                zEnd: { country: 'Japan', city: 'Tokyo', pop: 'Equinix TY2' }
            },
            financials: { mrc: 5000, nrc: 10000, term: 60 },
            dates: { start: '2024-01-01', end: '2028-12-31' },
            usage: { currentUser: null, orderLink: null }
        },
        {
            resourceId: 'INV-TYO-LAX-01',
            status: 'Available',
            cableSystem: 'SJC2',
            segmentType: 'Trunk',
            protection: 'Protected',
            acquisition: { type: 'Purchased', ownership: 'IRU', supplier: 'NTT Communications' },
            capacity: { unit: 'Gbps', value: 200 },
            location: {
                aEnd: { country: 'Japan', city: 'Tokyo', pop: 'Equinix TY2' },
                zEnd: { country: 'USA', city: 'Los Angeles', pop: 'CoreSite LA1' }
            },
            financials: { otc: 120000, term: 180, omRate: 3, annualOmCost: 3600 },
            dates: { start: '2024-01-01', end: '2039-12-31' },
            usage: { currentUser: null, orderLink: null }
        },
        {
            resourceId: 'INV-SGP-HKG-01',
            status: 'Available',
            cableSystem: 'SEA-ME-WE 6',
            segmentType: 'Trunk',
            protection: 'Unprotected',
            acquisition: { type: 'Purchased', ownership: 'Leased', supplier: 'Telia' },
            capacity: { unit: 'Gbps', value: 400 },
            location: {
                aEnd: { country: 'Singapore', city: 'Singapore', pop: 'Equinix SG3' },
                zEnd: { country: 'Hong Kong', city: 'Hong Kong', pop: 'MEGA-i' }
            },
            financials: { mrc: 12000, nrc: 25000, term: 36 },
            dates: { start: '2024-06-01', end: '2027-05-31' },
            usage: { currentUser: null, orderLink: null }
        }
    ],
    sales: [
        {
            salesOrderId: 'SO-2024-001',
            customerName: 'ByteDance',
            salesperson: 'Janna Dai',
            status: 'Active',
            salesModel: 'Lease',
            salesType: 'Resale',
            inventoryLink: '',
            capacity: { value: 10, unit: 'Gbps' },
            dates: { start: '2024-01-01', end: '2025-12-31', term: 24 },
            financials: { mrcSales: 3000, nrcSales: 5000, totalMrr: 3000 },
            costs: {
                cable: { model: 'Lease', mrc: 2000, nrc: 3000 },
                backhaulA: { mrc: 100 },
                backhaulZ: { mrc: 100 },
                crossConnectA: { mrc: 50 },
                crossConnectZ: { mrc: 50 }
            }
        },
        {
            salesOrderId: 'SO-2024-002',
            customerName: 'Tencent Cloud',
            salesperson: 'Miki Chen',
            status: 'Active',
            salesModel: 'Lease',
            salesType: 'Inventory',
            inventoryLink: 'INV-HKG-TYO-01',
            capacity: { value: 10, unit: 'Gbps' },
            dates: { start: '2024-03-01', end: '2025-02-28', term: 12 },
            financials: { mrcSales: 1000, nrcSales: 0, totalMrr: 1000 },
            costs: {}
        },
        {
            salesOrderId: 'SO-2024-003',
            customerName: 'Alibaba Cloud',
            salesperson: 'Wayne Jiang',
            status: 'Active',
            salesModel: 'Lease',
            salesType: 'Inventory',
            inventoryLink: 'INV-TYO-LAX-01',
            capacity: { value: 20, unit: 'Gbps' },
            dates: { start: '2024-04-01', end: '2026-03-31', term: 24 },
            financials: { mrcSales: 2500, nrcSales: 0, totalMrr: 2500 },
            costs: {}
        },
        {
            salesOrderId: 'SO-2024-004',
            customerName: 'Microsoft Azure',
            salesperson: 'Kristen Gan',
            status: 'Active',
            salesModel: 'IRU',
            salesType: 'Resale',
            inventoryLink: '',
            capacity: { value: 10, unit: 'Gbps' },
            dates: { start: '2024-01-01', end: '2028-12-31', term: 60 },
            financials: { otc: 50000, annualOm: 1500, totalMrr: 0 },
            costs: {
                cable: { model: 'IRU', otc: 30000, annualOm: 900 }
            }
        },
        {
            salesOrderId: 'SO-2024-005',
            customerName: 'AWS',
            salesperson: 'Becky Hai',
            status: 'Active',
            salesModel: 'IRU',
            salesType: 'Inventory',
            inventoryLink: 'INV-TYO-LAX-01',
            capacity: { value: 50, unit: 'Gbps' },
            dates: { start: '2024-02-01', end: '2029-01-31', term: 60 },
            financials: { otc: 80000, annualOm: 2400, totalMrr: 0 },
            costs: {}
        },
        {
            salesOrderId: 'SO-2024-006',
            customerName: 'Swap Partner - PCCW',
            salesperson: 'Procurement Team',
            status: 'Active',
            salesModel: 'IRU',
            salesType: 'Swapped Out',
            inventoryLink: 'INV-SGP-HKG-01',
            capacity: { value: 100, unit: 'Gbps' },
            dates: { start: '2024-06-01', end: '2027-05-31', term: 36 },
            financials: { otc: 0, annualOm: 0, totalMrr: 0 },
            costs: {}
        }
    ]
};

class Store {
    constructor() {
        this.init();
    }

    // ============ Helper Methods ============

    /**
     * Calculate total sold capacity for a given resource
     * @param {string} resourceId - The resource ID to check
     * @returns {number} Total sold capacity
     */
    getSoldCapacity(resourceId) {
        return this.salesOrders
            .filter(s => s.inventoryLink === resourceId)
            .reduce((total, sale) => total + (sale.capacity?.value || 0), 0);
    }

    /**
     * Update inventory status based on sold vs total capacity
     * @param {string} resourceId - The resource ID to update
     * @param {object} options - Optional: { latestCustomer, latestOrderId } for usage info
     */
    updateResourceStatus(resourceId, options = {}) {
        const resourceIndex = this.inventory.findIndex(r => r.resourceId === resourceId);
        if (resourceIndex === -1) return;

        const resource = this.inventory[resourceIndex];
        const totalCapacity = resource.capacity?.value || 0;
        const soldCapacity = this.getSoldCapacity(resourceId);

        // Update status
        this.inventory[resourceIndex].status = soldCapacity >= totalCapacity ? 'Sold Out' : 'Available';

        // Update usage info
        if (options.latestCustomer !== undefined) {
            this.inventory[resourceIndex].usage = {
                currentUser: options.latestCustomer,
                orderLink: options.latestOrderId || null
            };
        }
    }

    // ============ Core Methods ============

    init() {
        const stored = localStorage.getItem(DB_KEY);
        let dataToLoad;
        if (!stored) {
            dataToLoad = defaultData;
            localStorage.setItem(DB_KEY, JSON.stringify(defaultData)); // Save default data initially
        } else {
            dataToLoad = JSON.parse(stored);
        }
        this.inventory = dataToLoad.inventory || [];
        this.salesOrders = dataToLoad.sales || []; // Renamed from 'sales' to 'salesOrders' for consistency
    }

    save() {
        const data = {
            inventory: this.inventory,
            sales: this.salesOrders // Save as 'sales' for backward compatibility with defaultData structure
        };
        localStorage.setItem(DB_KEY, JSON.stringify(data));
    }

    // Inventory Methods
    getInventory() {
        return this.inventory;
    }

    getAvailableResources() {
        const today = new Date();

        return this.inventory.filter(item => {
            // Check if contract is expired
            const endDate = item.dates?.end ? new Date(item.dates.end) : null;
            if (endDate && today > endDate) return false;

            // Check if contract hasn't started yet
            const startDate = item.dates?.start ? new Date(item.dates.start) : null;
            if (startDate && today < startDate) return false;

            // Check if there's remaining capacity
            const totalCapacity = item.capacity?.value || 0;
            const soldCapacity = this.getSoldCapacity(item.resourceId);
            return soldCapacity < totalCapacity;
        });
    }

    addInventory(item) {
        // Ensure ID
        if (!item.resourceId) item.resourceId = generateId();

        // Preserve all item properties, only set defaults for missing fields
        const newItem = {
            ...item,
            resourceId: item.resourceId,
            status: item.status || 'Available',
            acquisition: item.acquisition || {},
            location: {
                aEnd: item.location?.aEnd || {},
                zEnd: item.location?.zEnd || {}
            },
            financials: item.financials || {},
            dates: item.dates || {},
            capacity: item.capacity || {},
            usage: item.usage || { currentUser: null, orderLink: null }
        };

        this.inventory.push(newItem);
        this.save();
        return newItem;
    }

    updateInventory(id, updates) {
        const index = this.inventory.findIndex(i => i.resourceId === id);
        if (index === -1) return null;

        this.inventory[index] = { ...this.inventory[index], ...updates };
        this.save();
        return this.inventory[index];
    }

    deleteInventory(id) {
        this.inventory = this.inventory.filter(i => i.resourceId !== id);
        this.save();
    }

    // Sales Methods
    getSalesOrders() {
        return this.salesOrders;
    }

    getSales() {
        return this.salesOrders;
    }

    addSalesOrder(order) {
        if (!order.salesOrderId) order.salesOrderId = 'SO-' + generateId();

        // 1. Add Sales Order
        this.salesOrders.push(order);

        // 2. Update linked inventory status
        if (order.inventoryLink) {
            this.updateResourceStatus(order.inventoryLink, {
                latestCustomer: order.customerName,
                latestOrderId: order.salesOrderId
            });
        }

        this.save();
        return order;
    }

    deleteSalesOrder(id) {
        // Find the order to be deleted to get its inventory link
        const orderToDelete = this.salesOrders.find(s => s.salesOrderId === id);

        // Remove the order first
        this.salesOrders = this.salesOrders.filter(s => s.salesOrderId !== id);

        // Update linked inventory status
        if (orderToDelete && orderToDelete.inventoryLink) {
            const remainingSales = this.salesOrders.filter(s => s.inventoryLink === orderToDelete.inventoryLink);
            const latestSale = remainingSales[remainingSales.length - 1];

            this.updateResourceStatus(orderToDelete.inventoryLink, {
                latestCustomer: latestSale?.customerName || null,
                latestOrderId: latestSale?.salesOrderId || null
            });
        }

        this.save();
    }

    // Backup
    exportParams() {
        const data = {
            inventory: this.inventory,
            sales: this.salesOrders
        };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "cable_inventory_backup_" + new Date().toISOString().slice(0, 10) + ".json");
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }
}

// Global instance for console access if needed
window.Store = new Store();
