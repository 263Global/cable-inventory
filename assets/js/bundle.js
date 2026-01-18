/**
 * Supabase Client Configuration
 * Configure your Supabase project credentials here
 */

// ============================================
// ⚠️ CONFIGURE YOUR SUPABASE CREDENTIALS HERE
// ============================================
const SUPABASE_URL = 'https://rmvdwecxqkmotznekist.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_9XAT3z5abDwPHdtHeEVZ6g_-aWAWxmp';

// Initialize Supabase client (SDK v2 uses 'supabase' global from CDN)
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export for use in other modules
window.SupabaseClient = supabaseClient;

const setAppViewportHeight = () => {
    const viewport = window.visualViewport;
    const height = viewport ? viewport.height : window.innerHeight;
    document.documentElement.style.setProperty('--app-height', `${Math.round(height)}px`);
};

setAppViewportHeight();
window.addEventListener('resize', setAppViewportHeight);
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', setAppViewportHeight);
    window.visualViewport.addEventListener('scroll', setAppViewportHeight);
}
/**
 * Auth.js
 * Authentication logic using Supabase
 */

const Auth = {
    /**
     * Sign in with email and password
     * @param {string} email 
     * @param {string} password 
     * @returns {Promise<{user: object|null, error: object|null}>}
     */
    async signIn(email, password) {
        try {
            const { data, error } = await window.SupabaseClient.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                return { user: null, error };
            }

            return { user: data.user, error: null };
        } catch (err) {
            return { user: null, error: { message: err.message } };
        }
    },

    /**
     * Sign out current user
     * @returns {Promise<{error: object|null}>}
     */
    async signOut() {
        try {
            const { error } = await window.SupabaseClient.auth.signOut();
            return { error };
        } catch (err) {
            return { error: { message: err.message } };
        }
    },

    /**
     * Get current authenticated user
     * @returns {Promise<object|null>}
     */
    async getCurrentUser() {
        try {
            const { data: { user } } = await window.SupabaseClient.auth.getUser();
            return user;
        } catch (err) {
            console.error('Error getting current user:', err);
            return null;
        }
    },

    /**
     * Get current session
     * @returns {Promise<object|null>}
     */
    async getSession() {
        try {
            const { data: { session } } = await window.SupabaseClient.auth.getSession();
            return session;
        } catch (err) {
            console.error('Error getting session:', err);
            return null;
        }
    },

    /**
     * Subscribe to auth state changes
     * @param {function} callback - Callback function(event, session)
     * @returns {object} Subscription object with unsubscribe method
     */
    onAuthStateChange(callback) {
        return window.SupabaseClient.auth.onAuthStateChange(callback);
    },

    /**
     * Check if user is authenticated and redirect if not
     * Call this on protected pages
     */
    async requireAuth() {
        const session = await this.getSession();
        if (!session) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    },

    /**
     * Redirect to main app if already authenticated
     * Call this on login page
     */
    async redirectIfAuthenticated() {
        const session = await this.getSession();
        if (session) {
            window.location.href = 'index.html';
            return true;
        }
        return false;
    }
};

// Export for global access
window.Auth = Auth;
// Shared inventory status helpers for non-module and module scripts.
(() => {
    const buildSalesIndex = (sales) => {
        const byResourceId = new Map();
        const soldByResourceId = new Map();
        sales.forEach(sale => {
            const resourceId = sale.inventoryLink;
            if (!resourceId) return;
            const list = byResourceId.get(resourceId) || [];
            list.push(sale);
            byResourceId.set(resourceId, list);
            soldByResourceId.set(resourceId, (soldByResourceId.get(resourceId) || 0) + (sale.capacity?.value || 0));
        });
        return { byResourceId, soldByResourceId };
    };

    const computeInventoryStatus = (item, totalSoldCapacity, now) => {
        const totalCapacity = item.capacity?.value || 0;
        const startDate = item.dates?.start ? new Date(item.dates.start) : null;
        const endDate = item.dates?.end ? new Date(item.dates.end) : null;

        let calculatedStatus = 'Available';
        if (endDate && now > endDate) {
            calculatedStatus = 'Expired';
        } else if (startDate && now < startDate) {
            calculatedStatus = 'Draft';
        } else if (totalCapacity > 0 && totalSoldCapacity >= totalCapacity) {
            calculatedStatus = 'Sold Out';
        }

        return { calculatedStatus, startDate, endDate, totalCapacity };
    };

    const getInventoryStatusBadgeClass = (calculatedStatus) => {
        if (calculatedStatus === 'Available') return 'badge-success';
        if (calculatedStatus === 'Sold Out' || calculatedStatus === 'Expired') return 'badge-danger';
        return 'badge-warning';
    };

    const getInventoryProgressColor = (usagePercent, calculatedStatus) => {
        if (usagePercent >= 100) return 'var(--accent-danger)';
        if (usagePercent >= 50) return 'var(--accent-warning)';
        if (calculatedStatus === 'Expired') return 'var(--text-muted)';
        if (calculatedStatus === 'Draft') return 'var(--accent-warning)';
        return 'var(--accent-success)';
    };

    const getInventoryDisplayMetrics = (item, totalSoldCapacity, now) => {
        const { calculatedStatus, totalCapacity } = computeInventoryStatus(item, totalSoldCapacity, now);
        const usagePercent = totalCapacity > 0
            ? Math.min(100, Math.round((totalSoldCapacity / totalCapacity) * 100))
            : 0;
        const statusBadgeClass = getInventoryStatusBadgeClass(calculatedStatus);
        const progressColor = getInventoryProgressColor(usagePercent, calculatedStatus);
        return { calculatedStatus, totalCapacity, usagePercent, statusBadgeClass, progressColor };
    };

    window.InventoryStatus = {
        buildSalesIndex,
        computeInventoryStatus,
        getInventoryStatusBadgeClass,
        getInventoryProgressColor,
        getInventoryDisplayMetrics
    };
})();
// Shared sales status helpers for non-module and module scripts.
(() => {
    const computeSalesStatus = (startDate, endDate, now = new Date()) => {
        if (!startDate || !endDate) return 'Active';
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 'Active';

        if (now < start) return 'Pending';
        if (now > end) return 'Expired';
        return 'Active';
    };

    const getSalesStatusBadgeClass = (status) => {
        if (status === 'Active') return 'badge-success';
        if (status === 'Pending') return 'badge-warning';
        return 'badge-danger';
    };

    window.SalesStatus = {
        computeSalesStatus,
        getSalesStatusBadgeClass
    };
})();
// Shared UI helpers for status/alert styling.
(() => {
    const getAlertBadgeClass = (level) => {
        if (level === 'success') return 'badge-success';
        if (level === 'warning') return 'badge-warning';
        return 'badge-danger';
    };

    const getAlertAccentColor = (level) => {
        if (level === 'success') return 'var(--accent-success)';
        if (level === 'warning') return 'var(--accent-warning)';
        return 'var(--accent-danger)';
    };

    const isExpiringWithin = (endDate, windowDays, now = new Date(), startDate = null) => {
        if (!endDate) return false;
        const end = new Date(endDate);
        if (Number.isNaN(end.getTime())) return false;
        const start = startDate ? new Date(startDate) : null;
        if (start && Number.isNaN(start.getTime())) return false;
        if (start && now < start) return false;
        if (now > end) return false;
        const daysUntilExpiry = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
        return daysUntilExpiry >= 0 && daysUntilExpiry <= windowDays;
    };

    window.StatusUi = {
        getAlertBadgeClass,
        getAlertAccentColor,
        isExpiringWithin
    };
})();
/**
 * Store.js
 * Handles data persistence using Supabase
 */

const generateId = () => Math.random().toString(36).substr(2, 9).toUpperCase();

class Store {
    constructor() {
        this.inventory = [];
        this.salesOrders = [];
        this.customers = [];
        this.suppliers = [];
        this.initialized = false;
    }

    // ============ Initialization ============

    async init() {
        if (this.initialized) return;

        try {
            // Fetch all data from Supabase
            const [invResult, salesResult, custResult, suppResult] = await Promise.all([
                window.SupabaseClient.from('inventory').select('*').order('created_at', { ascending: false }),
                window.SupabaseClient.from('sales_orders').select('*').order('created_at', { ascending: false }),
                window.SupabaseClient.from('customers').select('*').order('short_name', { ascending: true }),
                window.SupabaseClient.from('suppliers').select('*').order('short_name', { ascending: true })
            ]);

            if (invResult.error) throw invResult.error;
            if (salesResult.error) throw salesResult.error;
            // Customers/Suppliers tables may not exist yet - handle gracefully
            if (custResult.error && !custResult.error.message.includes('does not exist')) throw custResult.error;
            if (suppResult.error && !suppResult.error.message.includes('does not exist')) throw suppResult.error;

            // Transform flat DB rows to nested JS objects
            this.inventory = (invResult.data || []).map(row => this.dbToInventory(row));
            this.salesOrders = (salesResult.data || []).map(row => this.dbToSalesOrder(row));
            this.customers = custResult.data || [];
            this.suppliers = suppResult.data || [];

            this.initialized = true;
            console.log('Store initialized with Supabase data');
        } catch (err) {
            console.error('Failed to initialize store:', err);
            this.inventory = [];
            this.salesOrders = [];
            this.customers = [];
            this.suppliers = [];
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
            protectionCableSystem: row.protection_cable_system,
            handoffType: row.handoff_type,
            routeDescription: row.route_description,
            acquisition: {
                type: row.acquisition_type,
                ownership: row.ownership,
                supplierId: row.supplier_id,
                supplierName: row.supplier,
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
            protection_cable_system: item.protectionCableSystem,
            handoff_type: item.handoffType,
            route_description: item.routeDescription,
            acquisition_type: item.acquisition?.type,
            ownership: item.acquisition?.ownership,
            supplier_id: item.acquisition?.supplierId,
            supplier: item.acquisition?.supplierName,
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
            customerId: row.customer_id,
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
            costs: row.costs || {},
            notes: row.notes || ''
        };
    }

    // JS object -> DB row (sales order)
    salesOrderToDb(order) {
        return {
            sales_order_id: order.salesOrderId,
            inventory_link: order.inventoryLink,
            status: order.status || 'Pending',
            customer_name: order.customerName,
            customer_id: order.customerId,
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
            costs: order.costs || {},
            notes: order.notes || ''
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

        const soldCapacity = this.getSoldCapacity(resourceId);
        const now = new Date();
        const newStatus = window.InventoryStatus
            .computeInventoryStatus(resource, soldCapacity, now)
            .calculatedStatus;

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
        const now = new Date();
        const { soldByResourceId } = window.InventoryStatus.buildSalesIndex(this.salesOrders);
        return this.inventory.filter(item => {
            const totalSoldCapacity = soldByResourceId.get(item.resourceId) || 0;
            const { calculatedStatus, totalCapacity } = window.InventoryStatus.computeInventoryStatus(item, totalSoldCapacity, now);
            if (calculatedStatus !== 'Available') return false;
            return totalCapacity > totalSoldCapacity;
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

    // ============ Customer Methods ============

    getCustomers() {
        return this.customers;
    }

    getCustomerById(id) {
        return this.customers.find(c => c.id === id);
    }

    async addCustomer(customer) {
        const { data, error } = await window.SupabaseClient
            .from('customers')
            .insert({
                short_name: customer.shortName,
                full_name: customer.fullName || null,
                company_type: customer.companyType || null,
                contact_name: customer.contactName || null,
                contact_email: customer.contactEmail || null,
                contact_phone: customer.contactPhone || null,
                website: customer.website || null,
                notes: customer.notes || null
            })
            .select()
            .single();

        if (error) {
            console.error('Failed to add customer:', error);
            throw error;
        }

        this.customers.unshift(data);
        // Re-sort by short_name
        this.customers.sort((a, b) => (a.short_name || '').localeCompare(b.short_name || ''));
        return data;
    }

    async updateCustomer(id, updates) {
        const dbUpdates = {};
        if (updates.shortName !== undefined) dbUpdates.short_name = updates.shortName;
        if (updates.fullName !== undefined) dbUpdates.full_name = updates.fullName;
        if (updates.companyType !== undefined) dbUpdates.company_type = updates.companyType;
        if (updates.contactName !== undefined) dbUpdates.contact_name = updates.contactName;
        if (updates.contactEmail !== undefined) dbUpdates.contact_email = updates.contactEmail;
        if (updates.contactPhone !== undefined) dbUpdates.contact_phone = updates.contactPhone;
        if (updates.website !== undefined) dbUpdates.website = updates.website;
        if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

        const { data, error } = await window.SupabaseClient
            .from('customers')
            .update(dbUpdates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Failed to update customer:', error);
            throw error;
        }

        const index = this.customers.findIndex(c => c.id === id);
        if (index !== -1) {
            this.customers[index] = data;
            this.customers.sort((a, b) => (a.short_name || '').localeCompare(b.short_name || ''));
        }
        return data;
    }

    async deleteCustomer(id) {
        const { error } = await window.SupabaseClient
            .from('customers')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Failed to delete customer:', error);
            throw error;
        }

        this.customers = this.customers.filter(c => c.id !== id);
    }

    // ============ Supplier Methods ============

    getSuppliers() {
        return this.suppliers;
    }

    getSupplierById(id) {
        return this.suppliers.find(s => s.id === id);
    }

    async addSupplier(supplier) {
        const { data, error } = await window.SupabaseClient
            .from('suppliers')
            .insert({
                short_name: supplier.shortName,
                full_name: supplier.fullName || null,
                service_type: supplier.serviceType || null,
                contact_name: supplier.contactName || null,
                contact_email: supplier.contactEmail || null,
                contact_phone: supplier.contactPhone || null,
                portal_url: supplier.portalUrl || null,
                notes: supplier.notes || null
            })
            .select()
            .single();

        if (error) {
            console.error('Failed to add supplier:', error);
            throw error;
        }

        this.suppliers.unshift(data);
        this.suppliers.sort((a, b) => (a.short_name || '').localeCompare(b.short_name || ''));
        return data;
    }

    async updateSupplier(id, updates) {
        const dbUpdates = {};
        if (updates.shortName !== undefined) dbUpdates.short_name = updates.shortName;
        if (updates.fullName !== undefined) dbUpdates.full_name = updates.fullName;
        if (updates.serviceType !== undefined) dbUpdates.service_type = updates.serviceType;
        if (updates.contactName !== undefined) dbUpdates.contact_name = updates.contactName;
        if (updates.contactEmail !== undefined) dbUpdates.contact_email = updates.contactEmail;
        if (updates.contactPhone !== undefined) dbUpdates.contact_phone = updates.contactPhone;
        if (updates.portalUrl !== undefined) dbUpdates.portal_url = updates.portalUrl;
        if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

        const { data, error } = await window.SupabaseClient
            .from('suppliers')
            .update(dbUpdates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Failed to update supplier:', error);
            throw error;
        }

        const index = this.suppliers.findIndex(s => s.id === id);
        if (index !== -1) {
            this.suppliers[index] = data;
            this.suppliers.sort((a, b) => (a.short_name || '').localeCompare(b.short_name || ''));
        }
        return data;
    }

    async deleteSupplier(id) {
        const { error } = await window.SupabaseClient
            .from('suppliers')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Failed to delete supplier:', error);
            throw error;
        }

        this.suppliers = this.suppliers.filter(s => s.id !== id);
    }
}

// Global instance
window.Store = new Store();
/**
 * Financial Calculations Module
 * Unified profit calculation engine for sales orders
 * 
 * This module provides financial calculation utilities that are used
 * throughout the application for computing order profitability metrics.
 */

/**
 * Computes financial metrics for a sales order based on Mixed Recognition Model
 * @param {object} order - Sales order object
 * @returns {object} Financial metrics including:
 *   - monthlyRevenue: Monthly revenue amount
 *   - monthlyProfit: Monthly profit amount
 *   - marginPercent: Profit margin percentage
 *   - isIruResale: Boolean indicating if this is an IRU Resale type
 *   - firstMonthProfit: First month profit (for IRU Resale)
 *   - firstMonthMargin: First month margin percentage (for IRU Resale)
 *   - recurringMonthlyProfit: Recurring monthly profit (for IRU Resale)
 *   - recurringMargin: Recurring margin percentage (for IRU Resale)
 */
function computeOrderFinancials(order) {
    const salesModel = order.salesModel || 'Lease';
    const salesType = order.salesType || 'Resale';
    const salesTerm = order.dates?.term || 12;
    const salesCapacity = order.capacity?.value || 1;

    if (salesType === 'Swapped Out') {
        return {
            monthlyRevenue: 0,
            monthlyProfit: 0,
            marginPercent: 0,
            isIruResale: false,
            firstMonthProfit: 0,
            firstMonthMargin: 0,
            recurringMonthlyProfit: 0,
            recurringMargin: 0
        };
    }

    // Get linked inventory for Inventory/Hybrid types
    const inventoryLink = order.inventoryLink;
    const linkedResource = inventoryLink ? window.Store?.getInventory()?.find(r => r.resourceId === inventoryLink) : null;
    const inventoryCapacity = linkedResource?.capacity?.value || 1;
    const capacityRatio = salesCapacity / inventoryCapacity;

    // Calculate Inventory Monthly Cost (if applicable)
    let inventoryMonthlyCost = 0;
    if (linkedResource && (salesType === 'Inventory' || salesType === 'Hybrid')) {
        const invOwnership = linkedResource.acquisition?.ownership || 'Leased';
        if (invOwnership === 'IRU') {
            const invOtc = linkedResource.financials?.otc || 0;
            const invTerm = linkedResource.financials?.term || 1;
            const invAnnualOm = linkedResource.financials?.annualOmCost || 0;
            inventoryMonthlyCost = ((invOtc / invTerm) + (invAnnualOm / 12)) * capacityRatio;
        } else {
            inventoryMonthlyCost = (linkedResource.financials?.mrc || 0) * capacityRatio;
        }
    }

    // Get Operating Costs (Backhaul, XC, Other)
    const costs = order.costs || {};
    const getBackhaulMonthlyCost = (backhaul) => {
        if (!backhaul) return 0;
        if (backhaul.model === 'IRU') {
            const termMonths = backhaul.termMonths || salesTerm;
            const monthlyOtc = termMonths > 0 ? (backhaul.otc || 0) / termMonths : 0;
            const monthlyOm = (backhaul.annualOm || 0) / 12;
            return monthlyOtc + monthlyOm;
        }
        return backhaul.monthly || 0;
    };
    const backhaulA = costs.backhaul?.aEnd || costs.backhaulA || null;
    const backhaulZ = costs.backhaul?.zEnd || costs.backhaulZ || null;
    const backhaulMRC = getBackhaulMonthlyCost(backhaulA) + getBackhaulMonthlyCost(backhaulZ);
    const xcMRC = (costs.crossConnect?.aEnd?.monthly || 0) + (costs.crossConnect?.zEnd?.monthly || 0);
    const otherMonthly = costs.otherCosts?.monthly || 0;
    const operatingCosts = backhaulMRC + xcMRC + otherMonthly;

    // Initialize results
    let monthlyRevenue = 0;
    let monthlyProfit = 0;
    let firstMonthProfit = 0;
    let firstMonthMargin = 0;
    let recurringMonthlyProfit = 0;
    let recurringMargin = 0;
    let isIruResale = false;

    if (salesModel === 'Lease') {
        // ========== LEASE MODEL ==========
        const mrcSales = order.financials?.mrcSales || 0;
        monthlyRevenue = mrcSales;

        // Get Cable MRC (for Resale and Hybrid)
        let cableMRC = 0;
        if (salesType === 'Resale' || salesType === 'Hybrid') {
            const cableModel = costs.cable?.model || 'Lease';
            if (cableModel === 'Lease') {
                cableMRC = costs.cable?.mrc || 0;
            } else {
                cableMRC = (costs.cable?.annualOm || 0) / 12;
            }
        }

        switch (salesType) {
            case 'Resale':
                monthlyProfit = mrcSales - cableMRC - operatingCosts;
                break;
            case 'Inventory':
                monthlyProfit = mrcSales - inventoryMonthlyCost - operatingCosts;
                break;
            case 'Hybrid':
                monthlyProfit = mrcSales - inventoryMonthlyCost - cableMRC - operatingCosts;
                break;
            default:
                monthlyProfit = mrcSales - operatingCosts;
        }

    } else if (salesModel === 'IRU') {
        // ========== IRU MODEL ==========
        const otcRevenue = order.financials?.otc || 0;
        const annualOmRevenue = order.financials?.annualOm || 0;
        const monthlyOmRevenue = annualOmRevenue / 12;

        // Get Cable costs (for Resale and Hybrid)
        const cableOtc = costs.cable?.otc || 0;
        const cableAnnualOm = costs.cable?.annualOm || 0;
        const cableTerm = costs.cable?.termMonths || salesTerm;
        const cableMonthlyOtc = cableOtc / cableTerm;
        const cableMonthlyOm = cableAnnualOm / 12;

        switch (salesType) {
            case 'Resale':
                // IRU Resale: OTC profit captured in first month
                isIruResale = true;
                const otcProfit = otcRevenue - cableOtc;
                const monthlyOmProfit = monthlyOmRevenue - cableMonthlyOm;

                // First month: OTC profit + monthly O&M profit - operating costs
                firstMonthProfit = otcProfit + monthlyOmProfit - operatingCosts;
                // First month margin: based on total first month value (OTC + O&M)
                const firstMonthRevenue = otcRevenue + monthlyOmRevenue;
                firstMonthMargin = firstMonthRevenue > 0 ? (firstMonthProfit / firstMonthRevenue) * 100 : 0;

                // Recurring months: just O&M profit - operating costs
                recurringMonthlyProfit = monthlyOmProfit - operatingCosts;
                recurringMargin = monthlyOmRevenue > 0 ? (recurringMonthlyProfit / monthlyOmRevenue) * 100 : 0;

                // For general display, use recurring values
                monthlyRevenue = monthlyOmRevenue;
                monthlyProfit = recurringMonthlyProfit;
                break;

            case 'Inventory':
                // IRU Inventory: OTC revenue amortized monthly
                const monthlyOtcRevenue = otcRevenue / salesTerm;
                monthlyRevenue = monthlyOtcRevenue + monthlyOmRevenue;
                monthlyProfit = monthlyRevenue - inventoryMonthlyCost - operatingCosts;
                break;

            case 'Hybrid':
                // IRU Hybrid: OTC revenue amortized, both inventory and cable costs
                const monthlyOtcRev = otcRevenue / salesTerm;
                monthlyRevenue = monthlyOtcRev + monthlyOmRevenue;
                monthlyProfit = monthlyRevenue - inventoryMonthlyCost - cableMonthlyOtc - cableMonthlyOm - operatingCosts;
                break;

            case 'Swapped Out':
                // Swapped Out: No profit
                monthlyRevenue = 0;
                monthlyProfit = 0;
                break;

            default:
                monthlyProfit = 0;
        }
    }

    // Calculate general margin
    const marginPercent = monthlyRevenue > 0 ? (monthlyProfit / monthlyRevenue) * 100 : 0;

    return {
        monthlyRevenue,
        monthlyProfit,
        marginPercent,
        isIruResale,
        firstMonthProfit,
        firstMonthMargin,
        recurringMonthlyProfit,
        recurringMargin
    };
}

// Export to global scope for use by App
window.computeOrderFinancials = computeOrderFinancials;
/**
 * Form Validation Module
 * Validation utilities for forms throughout the application
 */

/**
 * Validates sales order form and displays errors
 * @param {HTMLFormElement} form - The form to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function validateSalesForm(form) {
    // Clear previous errors
    form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid', 'shake'));
    form.querySelectorAll('.validation-error').forEach(el => el.remove());

    let isValid = true;
    const errors = [];

    // Helper to show error
    const showError = (fieldName, message) => {
        const field = form.querySelector(`[name="${fieldName}"]`);
        if (field) {
            field.classList.add('is-invalid', 'shake');
            // Remove shake after animation
            setTimeout(() => field.classList.remove('shake'), 400);
            // Add error message
            const errorEl = document.createElement('div');
            errorEl.className = 'validation-error';
            errorEl.innerHTML = `<ion-icon name="alert-circle-outline"></ion-icon> ${message}`;
            field.parentNode.appendChild(errorEl);
        }
        errors.push(message);
        isValid = false;
    };

    // Helper to get field value
    const getVal = (name) => form.querySelector(`[name="${name}"]`)?.value?.trim();
    const getNum = (name) => Number(form.querySelector(`[name="${name}"]`)?.value || 0);

    // Required field validation
    if (!getVal('customerId')) {
        showError('customerId', 'Customer is required');
    }

    if (!getVal('salesperson')) {
        showError('salesperson', 'Salesperson is required');
    }

    // Only validate inventoryLink for non-Resale types
    const salesType = getVal('salesType');
    if (salesType !== 'Resale' && !getVal('inventoryLink')) {
        showError('inventoryLink', 'Linked Resource is required');
    }

    if (!getVal('dates.start')) {
        showError('dates.start', 'Contract Start date is required');
    }

    // Number validation (non-negative)
    const capacityValue = getNum('capacity.value');
    if (capacityValue <= 0) {
        showError('capacity.value', 'Capacity must be greater than 0');
    }

    const term = getNum('dates.term');
    if (term <= 0) {
        showError('dates.term', 'Term must be greater than 0');
    }

    // Date logic validation
    const startDate = getVal('dates.start');
    const endDate = getVal('dates.end');
    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (end < start) {
            showError('dates.end', 'End date must be after start date');
        }
    }

    // Scroll to first error if any
    if (!isValid) {
        const firstError = form.querySelector('.is-invalid');
        if (firstError) {
            firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            firstError.focus();
        }
    }

    return isValid;
}

// Export to global scope for use by App
window.validateSalesForm = validateSalesForm;
/**
 * CSV Export Module
 * Utilities for exporting data to CSV format
 */

/**
 * Downloads content as a CSV file
 * Uses Blob approach for better browser compatibility (including Safari)
 * @param {string} csvContent - The CSV content string
 * @param {string} filename - The filename for download
 */
function downloadCSV(csvContent, filename) {
    // Add BOM for Excel UTF-8 compatibility
    const BOM = '\uFEFF';
    const csvData = BOM + csvContent;

    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();

    // Cleanup
    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 100);
}

/**
 * Exports all sales orders to CSV
 */
function exportSalesToCSV() {
    const sales = window.Store.getSales();
    if (sales.length === 0) {
        alert('No sales data to export.');
        return;
    }

    // Get customers for lookup
    const customers = window.Store.getCustomers();
    const customerMap = {};
    customers.forEach(c => { customerMap[c.id] = c.short_name; });

    const headers = [
        'Sales Order ID', 'Customer', 'Salesperson', 'Status',
        'Sales Model', 'Sales Type', 'Route', 'Capacity',
        'Contract Start', 'Contract End', 'Term (Months)',
        'Monthly Revenue (Unified)', 'MRC Sales', 'OTC', 'Annual O&M', 'Legacy Customer Name'
    ];

    const rows = sales.map(s => {
        // Resolve customer name from ID, fallback to legacy customerName
        const customerName = s.customerId ? (customerMap[s.customerId] || s.customerName || '') : (s.customerName || '');
        const computed = computeOrderFinancials(s);
        const aEndCity = s.location?.aEnd?.city || s.locationAEnd?.city || '';
        const zEndCity = s.location?.zEnd?.city || s.locationZEnd?.city || '';
        const route = [aEndCity, zEndCity].filter(Boolean).join(' -> ');

        return [
            s.salesOrderId || '',
            customerName,
            s.salesperson || '',
            s.status || '',
            s.salesModel || '',
            s.salesType || '',
            route,
            s.capacity?.value || '',
            s.dates?.start || '',
            s.dates?.end || '',
            s.dates?.term || '',
            computed.monthlyRevenue || '',
            s.financials?.mrcSales || '',
            s.financials?.otc || '',
            s.financials?.annualOm || '',
            s.customerName || '' // Legacy field for reference
        ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    downloadCSV(csv, `sales_export_${new Date().toISOString().split('T')[0]}.csv`);
}

/**
 * Exports all inventory resources to CSV
 */
function exportInventoryToCSV() {
    const inventory = window.Store.getInventory();
    if (inventory.length === 0) {
        alert('No inventory data to export.');
        return;
    }

    // Get suppliers for lookup
    const suppliers = window.Store.getSuppliers();
    const supplierMap = {};
    suppliers.forEach(s => { supplierMap[s.id] = s.short_name; });

    const headers = [
        'Resource ID', 'Cable System', 'Segment Type', 'Route',
        'Status', 'Capacity', 'A-End', 'Z-End',
        'Ownership', 'Supplier', 'Contract Start', 'Contract End', 'Term (Months)',
        'OTC/NRC', 'MRC', 'Annual O&M Cost', 'Legacy Supplier Name'
    ];

    const formatEndpoint = (endpoint) => {
        if (!endpoint) return '';
        const pop = endpoint.pop || '';
        const city = endpoint.city || '';
        if (!pop && !city) return '';
        if (!city) return pop;
        if (!pop) return city;
        return `${pop} (${city})`;
    };

    const rows = inventory.map(i => {
        // Resolve supplier name from ID, fallback to legacy supplierName
        const supplierId = i.acquisition?.supplierId;
        const supplierName = supplierId
            ? (supplierMap[supplierId] || i.acquisition?.supplierName || '')
            : (i.acquisition?.supplierName || '');

        return [
            i.resourceId || '',
            i.cableSystem || '',
            i.segmentType || '',
            i.routeDescription || '',
            i.status || '',
            i.capacity?.value || '',
            formatEndpoint(i.location?.aEnd),
            formatEndpoint(i.location?.zEnd),
            i.acquisition?.ownership || '',
            supplierName,
            i.dates?.start || '',
            i.dates?.end || '',
            i.financials?.term || '',
            (i.acquisition?.ownership === 'IRU' ? i.financials?.otc : i.financials?.nrc) || '',
            i.financials?.mrc || '',
            i.financials?.annualOmCost || '',
            i.acquisition?.supplierName || '' // Legacy field for reference
        ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    downloadCSV(csv, `inventory_export_${new Date().toISOString().split('T')[0]}.csv`);
}

// Export to global scope
window.CsvExport = {
    downloadCSV,
    exportSalesToCSV,
    exportInventoryToCSV
};
/**
 * Customers Module
 * Customer management functionality for CRM
 */

/**
 * Initializes customer management methods and binds them to the App object
 * @param {Object} App - The main application object
 */
function initCustomersModule(App) {

    App.renderCustomers = function (filters = {}) {
        const searchQuery = filters.search || '';
        const currentPage = filters.page || 1;
        const ITEMS_PER_PAGE = 15;

        let data = window.Store.getCustomers();

        // Search filter
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            data = data.filter(c =>
                (c.short_name || '').toLowerCase().includes(q) ||
                (c.full_name || '').toLowerCase().includes(q) ||
                (c.contact_email || '').toLowerCase().includes(q)
            );
        }

        // Pagination
        const totalItems = data.length;
        const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
        const page = Math.min(Math.max(1, currentPage), totalPages || 1);
        const startIndex = (page - 1) * ITEMS_PER_PAGE;
        const paginatedData = data.slice(startIndex, startIndex + ITEMS_PER_PAGE);

        // Clear and add button to header
        this.headerActions.innerHTML = '';
        const addBtn = document.createElement('button');
        addBtn.className = 'btn btn-primary';
        addBtn.innerHTML = '<ion-icon name="add-outline"></ion-icon> Add Customer';
        addBtn.onclick = () => this.openCustomerModal();
        this.headerActions.appendChild(addBtn);

        const html = `
            <div class="filter-bar mb-4">
                <div class="search-box">
                    <ion-icon name="search-outline"></ion-icon>
                    <input type="text" id="customer-search" placeholder="Search by name or email..." value="${searchQuery}">
                </div>
            </div>

            <div class="table-container">
                <table class="customers-table">
                    <thead>
                        <tr>
                            <th>Short Name</th>
                            <th class="mobile-hidden">Full Name</th>
                            <th class="mobile-hidden">Contact</th>
                            <th class="mobile-hidden">Email</th>
                            <th style="width: 100px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${paginatedData.length === 0 ? `
                            <tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:2rem;">No customers found. Add your first customer!</td></tr>
                        ` : paginatedData.map(c => `
                            <tr>
                                <td><strong>${c.short_name || ''}</strong></td>
                                <td class="mobile-hidden">${c.full_name || '-'}</td>
                                <td class="mobile-hidden">${c.contact_name || '-'}</td>
                                <td class="mobile-hidden">${c.contact_email || '-'}</td>
                                <td>
                                    <div class="flex gap-2">
                                        <button class="btn btn-icon" onclick="App.openCustomerModal('${c.id}')" title="Edit">
                                            <ion-icon name="create-outline"></ion-icon>
                                        </button>
                                        <button class="btn btn-icon" onclick="App.deleteCustomer('${c.id}')" title="Delete">
                                            <ion-icon name="trash-outline" style="color:var(--accent-danger)"></ion-icon>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            ${totalPages > 1 ? `
                <div class="pagination mt-4">
                    <button class="btn btn-secondary" ${page <= 1 ? 'disabled' : ''} onclick="App.renderCustomers({search:'${searchQuery}',page:${page - 1}})">
                        <ion-icon name="chevron-back-outline"></ion-icon>
                    </button>
                    <span style="padding: 0 1rem;">Page ${page} of ${totalPages}</span>
                    <button class="btn btn-secondary" ${page >= totalPages ? 'disabled' : ''} onclick="App.renderCustomers({search:'${searchQuery}',page:${page + 1}})">
                        <ion-icon name="chevron-forward-outline"></ion-icon>
                    </button>
                </div>
            ` : ''}
        `;
        this.container.innerHTML = html;

        // Bind search
        document.getElementById('customer-search')?.addEventListener('input', (e) => {
            this.renderCustomers({ search: e.target.value, page: 1 });
        });
    };

    App.openCustomerModal = function (customerId = null) {
        const existing = customerId ? window.Store.getCustomerById(customerId) : null;
        const isEdit = !!existing;

        const companyTypes = ['Enterprise', 'Carrier', 'OTT', 'Other'];

        const modalHtml = `
            <div class="modal-backdrop" onclick="App.closeModal(event)">
                <div class="modal" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3>${isEdit ? 'Edit Customer' : 'Add Customer'}</h3>
                        <button class="btn btn-icon" onclick="App.closeModal()"><ion-icon name="close-outline"></ion-icon></button>
                    </div>
                    <div class="modal-body">
                        <form id="customer-form">
                            <div class="grid-2">
                                <div class="form-group">
                                    <label class="form-label">Short Name <span class="required-indicator">*</span></label>
                                    <input type="text" name="shortName" class="form-control" value="${existing?.short_name || ''}" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Company Type</label>
                                    <select name="companyType" class="form-control">
                                        <option value="">Select Type</option>
                                        ${companyTypes.map(t => `<option value="${t}" ${existing?.company_type === t ? 'selected' : ''}>${t}</option>`).join('')}
                                    </select>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Full Name <span class="required-indicator">*</span></label>
                                <input type="text" name="fullName" class="form-control" value="${existing?.full_name || ''}" placeholder="Company legal name" required>
                            </div>
                            <div class="grid-2">
                                <div class="form-group">
                                    <label class="form-label">Contact Name</label>
                                    <input type="text" name="contactName" class="form-control" value="${existing?.contact_name || ''}">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Contact Email</label>
                                    <input type="email" name="contactEmail" class="form-control" value="${existing?.contact_email || ''}">
                                </div>
                            </div>
                            <div class="grid-2">
                                <div class="form-group">
                                    <label class="form-label">Contact Phone</label>
                                    <input type="text" name="contactPhone" class="form-control" value="${existing?.contact_phone || ''}">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Website</label>
                                    <input type="url" name="website" class="form-control" value="${existing?.website || ''}" placeholder="https://...">
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Notes</label>
                                <textarea name="notes" class="form-control" rows="2">${existing?.notes || ''}</textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="App.saveCustomer('${customerId || ''}')">${isEdit ? 'Save Changes' : 'Add Customer'}</button>
                    </div>
                </div>
            </div>
        `;
        this.modalContainer.innerHTML = modalHtml;
    };

    App.saveCustomer = async function (customerId) {
        const form = document.getElementById('customer-form');
        const data = {
            shortName: form.querySelector('[name="shortName"]').value.trim(),
            fullName: form.querySelector('[name="fullName"]').value.trim(),
            companyType: form.querySelector('[name="companyType"]').value,
            contactName: form.querySelector('[name="contactName"]').value.trim(),
            contactEmail: form.querySelector('[name="contactEmail"]').value.trim(),
            contactPhone: form.querySelector('[name="contactPhone"]').value.trim(),
            website: form.querySelector('[name="website"]').value.trim(),
            notes: form.querySelector('[name="notes"]').value.trim()
        };

        if (!data.shortName || !data.fullName) {
            alert('Short Name and Full Name are required');
            return;
        }

        try {
            if (customerId) {
                await window.Store.updateCustomer(customerId, data);
            } else {
                await window.Store.addCustomer(data);
            }
            this.closeModal();
            this.renderCustomers();
        } catch (err) {
            alert('Error saving customer: ' + err.message);
        }
    };

    App.deleteCustomer = async function (customerId) {
        if (!confirm('Are you sure you want to delete this customer?')) return;
        try {
            await window.Store.deleteCustomer(customerId);
            this.renderCustomers();
        } catch (err) {
            alert('Error deleting customer: ' + err.message);
        }
    };
}

// Export initializer to global scope
window.initCustomersModule = initCustomersModule;
/**
 * Suppliers Module
 * Supplier management functionality for CRM
 */

/**
 * Initializes supplier management methods and binds them to the App object
 * @param {Object} App - The main application object
 */
function initSuppliersModule(App) {

    App.renderSuppliers = function (filters = {}) {
        const searchQuery = filters.search || '';
        const currentPage = filters.page || 1;
        const ITEMS_PER_PAGE = 15;

        let data = window.Store.getSuppliers();

        // Search filter
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            data = data.filter(s =>
                (s.short_name || '').toLowerCase().includes(q) ||
                (s.full_name || '').toLowerCase().includes(q)
            );
        }

        // Pagination
        const totalItems = data.length;
        const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
        const page = Math.min(Math.max(1, currentPage), totalPages || 1);
        const startIndex = (page - 1) * ITEMS_PER_PAGE;
        const paginatedData = data.slice(startIndex, startIndex + ITEMS_PER_PAGE);

        // Clear and add button to header
        this.headerActions.innerHTML = '';
        const addBtn = document.createElement('button');
        addBtn.className = 'btn btn-primary';
        addBtn.innerHTML = '<ion-icon name="add-outline"></ion-icon> Add Supplier';
        addBtn.onclick = () => this.openSupplierModal();
        this.headerActions.appendChild(addBtn);

        const html = `
            <div class="filter-bar mb-4">
                <div class="search-box">
                    <ion-icon name="search-outline"></ion-icon>
                    <input type="text" id="supplier-search" placeholder="Search by name..." value="${searchQuery}">
                </div>
            </div>

            <div class="table-container">
                <table class="suppliers-table">
                    <thead>
                        <tr>
                            <th>Short Name</th>
                            <th class="mobile-hidden">Full Name</th>
                            <th class="mobile-hidden">Contact</th>
                            <th style="width: 100px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${paginatedData.length === 0 ? `
                            <tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding:2rem;">No suppliers found. Add your first supplier!</td></tr>
                        ` : paginatedData.map(s => `
                            <tr>
                                <td><strong>${s.short_name || ''}</strong></td>
                                <td class="mobile-hidden">${s.full_name || '-'}</td>
                                <td class="mobile-hidden">${s.contact_name || '-'}</td>
                                <td>
                                    <div class="flex gap-2">
                                        <button class="btn btn-icon" onclick="App.openSupplierModal('${s.id}')" title="Edit">
                                            <ion-icon name="create-outline"></ion-icon>
                                        </button>
                                        <button class="btn btn-icon" onclick="App.deleteSupplier('${s.id}')" title="Delete">
                                            <ion-icon name="trash-outline" style="color:var(--accent-danger)"></ion-icon>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            ${totalPages > 1 ? `
                <div class="pagination mt-4">
                    <button class="btn btn-secondary" ${page <= 1 ? 'disabled' : ''} onclick="App.renderSuppliers({search:'${searchQuery}',page:${page - 1}})">
                        <ion-icon name="chevron-back-outline"></ion-icon>
                    </button>
                    <span style="padding: 0 1rem;">Page ${page} of ${totalPages}</span>
                    <button class="btn btn-secondary" ${page >= totalPages ? 'disabled' : ''} onclick="App.renderSuppliers({search:'${searchQuery}',page:${page + 1}})">
                        <ion-icon name="chevron-forward-outline"></ion-icon>
                    </button>
                </div>
            ` : ''}
        `;
        this.container.innerHTML = html;

        // Bind search
        document.getElementById('supplier-search')?.addEventListener('input', (e) => {
            this.renderSuppliers({ search: e.target.value, page: 1 });
        });
    };

    App.openSupplierModal = function (supplierId = null) {
        const existing = supplierId ? window.Store.getSupplierById(supplierId) : null;
        const isEdit = !!existing;

        const modalHtml = `
            <div class="modal-backdrop" onclick="App.closeModal(event)">
                <div class="modal" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3>${isEdit ? 'Edit Supplier' : 'Add Supplier'}</h3>
                        <button class="btn btn-icon" onclick="App.closeModal()"><ion-icon name="close-outline"></ion-icon></button>
                    </div>
                    <div class="modal-body">
                        <form id="supplier-form">
                            <div class="form-group">
                                <label class="form-label">Short Name <span class="required-indicator">*</span></label>
                                <input type="text" name="shortName" class="form-control" value="${existing?.short_name || ''}" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Full Name <span class="required-indicator">*</span></label>
                                <input type="text" name="fullName" class="form-control" value="${existing?.full_name || ''}" placeholder="Company legal name" required>
                            </div>
                            <div class="grid-2">
                                <div class="form-group">
                                    <label class="form-label">Contact Name</label>
                                    <input type="text" name="contactName" class="form-control" value="${existing?.contact_name || ''}">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Contact Email</label>
                                    <input type="email" name="contactEmail" class="form-control" value="${existing?.contact_email || ''}">
                                </div>
                            </div>
                            <div class="grid-2">
                                <div class="form-group">
                                    <label class="form-label">Contact Phone</label>
                                    <input type="text" name="contactPhone" class="form-control" value="${existing?.contact_phone || ''}">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Portal URL</label>
                                    <input type="url" name="portalUrl" class="form-control" value="${existing?.portal_url || ''}" placeholder="https://...">
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Notes</label>
                                <textarea name="notes" class="form-control" rows="2">${existing?.notes || ''}</textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="App.saveSupplier('${supplierId || ''}')">${isEdit ? 'Save Changes' : 'Add Supplier'}</button>
                    </div>
                </div>
            </div>
        `;
        this.modalContainer.innerHTML = modalHtml;
    };

    App.saveSupplier = async function (supplierId) {
        const form = document.getElementById('supplier-form');
        const data = {
            shortName: form.querySelector('[name="shortName"]').value.trim(),
            fullName: form.querySelector('[name="fullName"]').value.trim(),
            contactName: form.querySelector('[name="contactName"]').value.trim(),
            contactEmail: form.querySelector('[name="contactEmail"]').value.trim(),
            contactPhone: form.querySelector('[name="contactPhone"]').value.trim(),
            portalUrl: form.querySelector('[name="portalUrl"]').value.trim(),
            notes: form.querySelector('[name="notes"]').value.trim()
        };

        if (!data.shortName || !data.fullName) {
            alert('Short Name and Full Name are required');
            return;
        }

        try {
            if (supplierId) {
                await window.Store.updateSupplier(supplierId, data);
            } else {
                await window.Store.addSupplier(data);
            }
            this.closeModal();
            this.renderSuppliers();
        } catch (err) {
            alert('Error saving supplier: ' + err.message);
        }
    };

    App.deleteSupplier = async function (supplierId) {
        if (!confirm('Are you sure you want to delete this supplier?')) return;
        try {
            await window.Store.deleteSupplier(supplierId);
            this.renderSuppliers();
        } catch (err) {
            alert('Error deleting supplier: ' + err.message);
        }
    };
}

// Export initializer to global scope
window.initSuppliersModule = initSuppliersModule;
/**
 * Bulk Operations Module
 * Handles batch selection and export for Sales and Inventory
 */

/**
 * Initializes bulk operations methods and binds them to the App object
 * @param {Object} App - The main application object
 */
function initBulkOpsModule(App) {

    // ============ Sales Bulk Operations ============

    App.enterSalesSelectionMode = function () {
        this._salesSelectionMode = true;
        this._selectedSales.clear();
        this.headerActions.innerHTML = '';
        this.renderSales();
    };

    App.exitSalesSelectionMode = function () {
        this._salesSelectionMode = false;
        this._selectedSales.clear();
        this.headerActions.innerHTML = '';
        this.renderSales();
    };

    App.updateSalesBulkToolbar = function () {
        const countEl = document.getElementById('sales-selection-count');
        if (countEl) {
            countEl.textContent = this._selectedSales.size;
        }
        // Enable/disable buttons based on selection
        const exportBtn = document.querySelector('#sales-bulk-toolbar .btn-secondary');
        if (exportBtn) exportBtn.disabled = this._selectedSales.size === 0;
    };

    App.exportSelectedSales = function () {
        if (this._selectedSales.size === 0) {
            alert('No items selected. Please select at least one order.');
            return;
        }

        const sales = window.Store.getSales().filter(s => this._selectedSales.has(s.salesOrderId));

        const headers = [
            'Order ID', 'Customer', 'Status', 'Sales Model', 'Sales Type',
            'Capacity', 'Unit', 'Monthly Revenue (Unified)', 'MRC Sales', 'NRC Sales', 'Salesperson',
            'Start Date', 'End Date', 'Term (Months)'
        ];

        const rows = sales.map(s => {
            const computed = computeOrderFinancials(s);
            return [
                s.salesOrderId,
                s.customerName || '',
                s.status || '',
                s.salesModel || '',
                s.salesType || '',
                s.capacity?.value || '',
                s.capacity?.unit || 'Gbps',
                computed.monthlyRevenue || 0,
                s.financials?.mrcSales || 0,
                s.financials?.nrcSales || 0,
                s.salesperson || '',
                s.dates?.start || '',
                s.dates?.end || '',
                s.dates?.term || ''
            ];
        });

        const csvContent = [headers, ...rows]
            .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            .join('\n');

        this.downloadCSV(csvContent, `sales_selected_${new Date().toISOString().slice(0, 10)}.csv`);
        alert(`Exported ${sales.length} selected orders.`);
    };

    App.clearSalesSelection = function () {
        this._selectedSales.clear();
        document.querySelectorAll('.sales-row-checkbox').forEach(cb => {
            cb.checked = false;
            cb.closest('tr')?.classList.remove('row-selected');
        });
        const selectAll = document.getElementById('sales-select-all');
        if (selectAll) selectAll.checked = false;
        this.updateSalesBulkToolbar();
    };

    // ============ Inventory Bulk Operations ============

    App.enterInventorySelectionMode = function () {
        this._inventorySelectionMode = true;
        this._selectedInventory.clear();
        this.headerActions.innerHTML = '';
        this.renderInventory();
    };

    App.exitInventorySelectionMode = function () {
        this._inventorySelectionMode = false;
        this._selectedInventory.clear();
        this.headerActions.innerHTML = '';
        this.renderInventory();
    };

    App.updateInventoryBulkToolbar = function () {
        const countEl = document.getElementById('inventory-selection-count');
        if (countEl) {
            countEl.textContent = this._selectedInventory.size;
        }
        // Enable/disable buttons based on selection
        const exportBtn = document.querySelector('#inventory-bulk-toolbar .btn-secondary');
        if (exportBtn) exportBtn.disabled = this._selectedInventory.size === 0;
    };

    App.exportSelectedInventory = function () {
        if (this._selectedInventory.size === 0) {
            alert('No items selected. Please select at least one resource.');
            return;
        }

        const inventory = window.Store.getInventory().filter(i => this._selectedInventory.has(i.resourceId));

        const headers = [
            'Resource ID', 'Cable System', 'Status', 'Acquisition Type', 'Ownership',
            'Capacity', 'Unit', 'MRC', 'OTC/NRC', 'A-End City', 'Z-End City',
            'Start Date', 'End Date'
        ];

        const rows = inventory.map(i => [
            i.resourceId,
            i.cableSystem || '',
            i.status || '',
            i.acquisition?.type || '',
            i.acquisition?.ownership || '',
            i.capacity?.value || '',
            i.capacity?.unit || 'Gbps',
            i.financials?.mrc || 0,
            (i.acquisition?.ownership === 'IRU' ? i.financials?.otc : i.financials?.nrc) || 0,
            i.location?.aEnd?.city || '',
            i.location?.zEnd?.city || '',
            i.dates?.start || '',
            i.dates?.end || ''
        ]);

        const csvContent = [headers, ...rows]
            .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            .join('\n');

        this.downloadCSV(csvContent, `inventory_selected_${new Date().toISOString().slice(0, 10)}.csv`);
        alert(`Exported ${inventory.length} selected resources.`);
    };

    App.clearInventorySelection = function () {
        this._selectedInventory.clear();
        document.querySelectorAll('.inventory-row-checkbox').forEach(cb => {
            cb.checked = false;
            cb.closest('tr')?.classList.remove('row-selected');
        });
        const selectAll = document.getElementById('inventory-select-all');
        if (selectAll) selectAll.checked = false;
        this.updateInventoryBulkToolbar();
    };
}

// Export initializer to global scope
window.initBulkOpsModule = initBulkOpsModule;
