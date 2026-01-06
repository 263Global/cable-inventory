/**
 * Store.js
 * Handles data persistence using localStorage
 */

const DB_KEY = 'cable_inventory_db_v1';

const generateId = () => Math.random().toString(36).substr(2, 9).toUpperCase();

const defaultData = {
    inventory: [
        {
            resourceId: 'RES-001',
            status: 'In Use',
            cableSystem: 'SJC2',
            fiberPair: 'FP-01',
            capacity: { unit: 'Gbps', value: 100 },
            location: {
                aEnd: { country: 'Singapore', city: 'Singapore', pop: 'Equinix SG1' },
                zEnd: { country: 'Japan', city: 'Tokyo', pop: 'Equinix TY2' }
            },
            financials: {
                otc: 50000,
                mrc: 1200,
                omRate: 2
            },
            dates: {
                start: '2023-01-01',
                end: '2026-03-01' // Expiring soon (< 90 days from "now")
            },
            usage: {
                currentUser: 'ByteDance',
                orderLink: 'SO-2024-001'
            }
        },
        {
            resourceId: 'RES-002',
            status: 'Available',
            cableSystem: 'APRICOT',
            fiberPair: 'FP-04',
            capacity: { unit: 'Gbps', value: 400 },
            location: {
                aEnd: { country: 'Hong Kong', city: 'Hong Kong', pop: 'Mega-i' },
                zEnd: { country: 'Philippines', city: 'Manila', pop: 'Globe MK2' }
            },
            financials: {
                otc: 120000,
                mrc: 2500,
                omRate: 2
            },
            dates: {
                start: '2024-01-01',
                end: '2030-01-01'
            },
            usage: {
                currentUser: null,
                orderLink: null
            }
        }
    ],
    sales: [
        {
            salesOrderId: 'SO-2024-001',
            customerName: 'ByteDance',
            status: 'Active',
            salesType: 'Lease',
            inventoryLink: 'RES-001',
            capacity: {
                value: 100,
                unit: 'Gbps'
            },
            dates: {
                start: '2024-01-01',
                end: '2026-02-15' // Expiring very soon
            },
            financials: {
                nrcSales: 80000,
                mrcSales: 3500,
                totalMrr: 3500
            },
            costs: {
                cableCost: { nrc: 50000, mrc: 1200 },
                backhaulA: { nrc: 1000, mrc: 200 },
                backhaulZ: { nrc: 1000, mrc: 200 },
                crossConnectA: { nrc: 500, mrc: 100 },
                crossConnectZ: { nrc: 500, mrc: 100 }
            }
        }
    ]
};

class Store {
    constructor() {
        this.init();
    }

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
        const allSales = this.salesOrders;
        const today = new Date();

        return this.inventory.filter(item => {
            // Check if contract is expired
            const endDate = item.dates?.end ? new Date(item.dates.end) : null;
            if (endDate && today > endDate) return false; // Expired

            // Check if contract hasn't started yet
            const startDate = item.dates?.start ? new Date(item.dates.start) : null;
            if (startDate && today < startDate) return false; // Draft

            // Calculate used capacity
            const linkedSales = allSales.filter(s => s.inventoryLink === item.resourceId);
            let totalSoldCapacity = 0;
            linkedSales.forEach(sale => {
                totalSoldCapacity += (sale.capacity?.value || 0);
            });

            // Check if there's remaining capacity
            const totalCapacity = item.capacity?.value || 0;
            return totalSoldCapacity < totalCapacity; // Has remaining capacity
        });
    }

    addInventory(item) {
        // Ensure ID
        if (!item.resourceId) item.resourceId = generateId();

        // Ensure structure
        const newItem = {
            resourceId: item.resourceId,
            status: item.status || 'Available',
            acquisition: item.acquisition || {},
            technical: item.technical || {},
            location: {
                aEnd: item.location?.aEnd || {},
                zEnd: item.location?.zEnd || {}
            },
            financials: item.financials || {},
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

        // 2. Update Inventory Link
        if (order.inventoryLink) {
            const resourceIndex = this.inventory.findIndex(r => r.resourceId === order.inventoryLink);
            if (resourceIndex !== -1) {
                // Lock inventory
                this.inventory[resourceIndex].status = 'Sold Out';
                this.inventory[resourceIndex].usage = {
                    currentUser: order.customerName,
                    orderLink: order.salesOrderId
                };
            }
        }

        this.save();
        return order;
    }

    deleteSalesOrder(id) {
        this.salesOrders = this.salesOrders.filter(s => s.salesOrderId !== id);
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
