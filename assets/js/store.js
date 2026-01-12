/**
 * Store.js
 * Handles data persistence using Supabase
 */

const generateId = () => Math.random().toString(36).substr(2, 9).toUpperCase();

class Store {
    constructor() {
        this.inventory = [];
        this.salesOrders = [];
        this.initialized = false;
    }

    // ============ Initialization ============

    async init() {
        if (this.initialized) return;

        try {
            // Fetch all data from Supabase
            const [invResult, salesResult] = await Promise.all([
                window.SupabaseClient.from('inventory').select('*').order('created_at', { ascending: false }),
                window.SupabaseClient.from('sales_orders').select('*').order('created_at', { ascending: false })
            ]);

            if (invResult.error) throw invResult.error;
            if (salesResult.error) throw salesResult.error;

            // Transform flat DB rows to nested JS objects
            this.inventory = (invResult.data || []).map(row => this.dbToInventory(row));
            this.salesOrders = (salesResult.data || []).map(row => this.dbToSalesOrder(row));

            this.initialized = true;
            console.log('Store initialized with Supabase data');
        } catch (err) {
            console.error('Failed to initialize store:', err);
            this.inventory = [];
            this.salesOrders = [];
        }
    }

    // ============ Data Transformers ============

    // DB row -> JS object (inventory)
    dbToInventory(row) {
        return {
            resourceId: row.resource_id,
            status: row.status,
            cableSystem: row.cable_system,
            segmentType: row.segment_type,
            protection: row.protection,
            acquisition: {
                type: row.acquisition_type,
                ownership: row.ownership,
                supplier: row.supplier,
                contractRef: row.contract_ref
            },
            capacity: {
                value: parseFloat(row.capacity_value) || 0,
                unit: row.capacity_unit
            },
            location: {
                aEnd: {
                    country: row.a_end_country,
                    city: row.a_end_city,
                    pop: row.a_end_pop,
                    device: row.a_end_device,
                    port: row.a_end_port
                },
                zEnd: {
                    country: row.z_end_country,
                    city: row.z_end_city,
                    pop: row.z_end_pop,
                    device: row.z_end_device,
                    port: row.z_end_port
                }
            },
            financials: {
                mrc: parseFloat(row.mrc) || 0,
                nrc: parseFloat(row.nrc) || 0,
                otc: parseFloat(row.otc) || 0,
                omRate: parseFloat(row.om_rate) || 0,
                annualOmCost: parseFloat(row.annual_om_cost) || 0,
                term: row.term_months
            },
            dates: {
                start: row.start_date,
                end: row.end_date
            },
            usage: {
                currentUser: row.current_user_name,
                orderLink: row.order_link
            }
        };
    }

    // JS object -> DB row (inventory)
    inventoryToDb(item) {
        return {
            resource_id: item.resourceId,
            status: item.status || 'Available',
            cable_system: item.cableSystem,
            segment_type: item.segmentType,
            protection: item.protection,
            acquisition_type: item.acquisition?.type,
            ownership: item.acquisition?.ownership,
            supplier: item.acquisition?.supplier,
            contract_ref: item.acquisition?.contractRef,
            capacity_value: item.capacity?.value,
            capacity_unit: item.capacity?.unit,
            a_end_country: item.location?.aEnd?.country,
            a_end_city: item.location?.aEnd?.city,
            a_end_pop: item.location?.aEnd?.pop,
            a_end_device: item.location?.aEnd?.device,
            a_end_port: item.location?.aEnd?.port,
            z_end_country: item.location?.zEnd?.country,
            z_end_city: item.location?.zEnd?.city,
            z_end_pop: item.location?.zEnd?.pop,
            z_end_device: item.location?.zEnd?.device,
            z_end_port: item.location?.zEnd?.port,
            mrc: item.financials?.mrc,
            nrc: item.financials?.nrc,
            otc: item.financials?.otc,
            om_rate: item.financials?.omRate,
            annual_om_cost: item.financials?.annualOmCost,
            term_months: item.financials?.term,
            start_date: item.dates?.start,
            end_date: item.dates?.end,
            current_user_name: item.usage?.currentUser,
            order_link: item.usage?.orderLink
        };
    }

    // DB row -> JS object (sales order)
    dbToSalesOrder(row) {
        return {
            salesOrderId: row.sales_order_id,
            inventoryLink: row.inventory_link,
            status: row.status,
            customerName: row.customer_name,
            salesperson: row.salesperson,
            salesModel: row.sales_model,
            salesType: row.sales_type,
            capacity: {
                value: parseFloat(row.capacity_value) || 0,
                unit: row.capacity_unit
            },
            dates: {
                start: row.start_date,
                end: row.end_date,
                term: row.term_months
            },
            location: {
                aEnd: { city: row.a_end_city, pop: row.a_end_pop },
                zEnd: { city: row.z_end_city, pop: row.z_end_pop }
            },
            financials: {
                mrcSales: parseFloat(row.mrc_sales) || 0,
                nrcSales: parseFloat(row.nrc_sales) || 0,
                otc: parseFloat(row.otc) || 0,
                omRate: parseFloat(row.om_rate) || 0,
                annualOm: parseFloat(row.annual_om) || 0,
                totalMrr: parseFloat(row.total_mrr) || 0
            },
            costs: row.costs || {}
        };
    }

    // JS object -> DB row (sales order)
    salesOrderToDb(order) {
        return {
            sales_order_id: order.salesOrderId,
            inventory_link: order.inventoryLink,
            status: order.status || 'Pending',
            customer_name: order.customerName,
            salesperson: order.salesperson,
            sales_model: order.salesModel,
            sales_type: order.salesType,
            capacity_value: order.capacity?.value,
            capacity_unit: order.capacity?.unit,
            start_date: order.dates?.start,
            end_date: order.dates?.end,
            term_months: order.dates?.term,
            a_end_city: order.location?.aEnd?.city,
            a_end_pop: order.location?.aEnd?.pop,
            z_end_city: order.location?.zEnd?.city,
            z_end_pop: order.location?.zEnd?.pop,
            mrc_sales: order.financials?.mrcSales,
            nrc_sales: order.financials?.nrcSales,
            otc: order.financials?.otc,
            om_rate: order.financials?.omRate,
            annual_om: order.financials?.annualOm,
            total_mrr: order.financials?.totalMrr || order.financials?.mrcSales,
            costs: order.costs || {}
        };
    }

    // ============ Helper Methods ============

    getSoldCapacity(resourceId) {
        return this.salesOrders
            .filter(s => s.inventoryLink === resourceId)
            .reduce((total, sale) => total + (sale.capacity?.value || 0), 0);
    }

    async updateResourceStatus(resourceId, options = {}) {
        const resource = this.inventory.find(r => r.resourceId === resourceId);
        if (!resource) return;

        const totalCapacity = resource.capacity?.value || 0;
        const soldCapacity = this.getSoldCapacity(resourceId);
        const newStatus = soldCapacity >= totalCapacity ? 'Sold Out' : 'Available';

        const updates = {
            status: newStatus,
            usage: {
                currentUser: options.latestCustomer ?? resource.usage?.currentUser,
                orderLink: options.latestOrderId ?? resource.usage?.orderLink
            }
        };

        await this.updateInventory(resourceId, updates);
    }

    // ============ Inventory Methods ============

    getInventory() {
        return this.inventory;
    }

    getAvailableResources() {
        const today = new Date();
        return this.inventory.filter(item => {
            const endDate = item.dates?.end ? new Date(item.dates.end) : null;
            if (endDate && today > endDate) return false;

            const startDate = item.dates?.start ? new Date(item.dates.start) : null;
            if (startDate && today < startDate) return false;

            const totalCapacity = item.capacity?.value || 0;
            const soldCapacity = this.getSoldCapacity(item.resourceId);
            return soldCapacity < totalCapacity;
        });
    }

    async addInventory(item) {
        if (!item.resourceId) item.resourceId = 'INV-' + generateId();

        const dbRow = this.inventoryToDb(item);
        const { data, error } = await window.SupabaseClient
            .from('inventory')
            .insert(dbRow)
            .select()
            .single();

        if (error) {
            console.error('Failed to add inventory:', error);
            throw error;
        }

        const newItem = this.dbToInventory(data);
        this.inventory.unshift(newItem);
        return newItem;
    }

    async updateInventory(id, updates) {
        const index = this.inventory.findIndex(i => i.resourceId === id);
        if (index === -1) return null;

        const merged = { ...this.inventory[index], ...updates };
        const dbRow = this.inventoryToDb(merged);

        const { data, error } = await window.SupabaseClient
            .from('inventory')
            .update(dbRow)
            .eq('resource_id', id)
            .select()
            .single();

        if (error) {
            console.error('Failed to update inventory:', error);
            throw error;
        }

        const updated = this.dbToInventory(data);
        this.inventory[index] = updated;
        return updated;
    }

    async deleteInventory(id) {
        const { error } = await window.SupabaseClient
            .from('inventory')
            .delete()
            .eq('resource_id', id);

        if (error) {
            console.error('Failed to delete inventory:', error);
            throw error;
        }

        this.inventory = this.inventory.filter(i => i.resourceId !== id);
    }

    // ============ Sales Methods ============

    getSalesOrders() {
        return this.salesOrders;
    }

    getSales() {
        return this.salesOrders;
    }

    async addSalesOrder(order) {
        if (!order.salesOrderId) order.salesOrderId = 'SO-' + generateId();

        const dbRow = this.salesOrderToDb(order);
        const { data, error } = await window.SupabaseClient
            .from('sales_orders')
            .insert(dbRow)
            .select()
            .single();

        if (error) {
            console.error('Failed to add sales order:', error);
            throw error;
        }

        const newOrder = this.dbToSalesOrder(data);
        this.salesOrders.unshift(newOrder);

        // Update linked inventory status
        if (order.inventoryLink) {
            await this.updateResourceStatus(order.inventoryLink, {
                latestCustomer: order.customerName,
                latestOrderId: order.salesOrderId
            });
        }

        return newOrder;
    }

    async updateSalesOrder(id, updates) {
        const index = this.salesOrders.findIndex(s => s.salesOrderId === id);
        if (index === -1) return null;

        const merged = { ...this.salesOrders[index], ...updates };
        const dbRow = this.salesOrderToDb(merged);

        const { data, error } = await window.SupabaseClient
            .from('sales_orders')
            .update(dbRow)
            .eq('sales_order_id', id)
            .select()
            .single();

        if (error) {
            console.error('Failed to update sales order:', error);
            throw error;
        }

        const updated = this.dbToSalesOrder(data);
        this.salesOrders[index] = updated;
        return updated;
    }

    async deleteSalesOrder(id) {
        const orderToDelete = this.salesOrders.find(s => s.salesOrderId === id);

        const { error } = await window.SupabaseClient
            .from('sales_orders')
            .delete()
            .eq('sales_order_id', id);

        if (error) {
            console.error('Failed to delete sales order:', error);
            throw error;
        }

        this.salesOrders = this.salesOrders.filter(s => s.salesOrderId !== id);

        // Update linked inventory status
        if (orderToDelete?.inventoryLink) {
            const remainingSales = this.salesOrders.filter(s => s.inventoryLink === orderToDelete.inventoryLink);
            const latestSale = remainingSales[remainingSales.length - 1];

            await this.updateResourceStatus(orderToDelete.inventoryLink, {
                latestCustomer: latestSale?.customerName || null,
                latestOrderId: latestSale?.salesOrderId || null
            });
        }
    }

    // ============ Backup (JSON Export) ============

    exportParams() {
        const data = {
            inventory: this.inventory,
            sales: this.salesOrders
        };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "cable_inventory_backup_" + new Date().toISOString().slice(0, 10) + ".json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }
}

// Global instance
window.Store = new Store();
