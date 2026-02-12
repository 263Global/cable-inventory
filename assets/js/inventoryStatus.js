// Shared inventory status helpers for non-module and module scripts.
(() => {
    const parseDateInput = (value, options = {}) => {
        if (!value) return null;
        const { endOfDay = false } = options;

        if (typeof value === 'string') {
            const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
            if (match) {
                const normalized = endOfDay
                    ? `${match[1]}-${match[2]}-${match[3]}T23:59:59.999`
                    : `${match[1]}-${match[2]}-${match[3]}T00:00:00.000`;
                const parsedLocal = new Date(normalized);
                if (!Number.isNaN(parsedLocal.getTime())) return parsedLocal;
            }
        }

        const parsed = value instanceof Date ? new Date(value.getTime()) : new Date(value);
        if (Number.isNaN(parsed.getTime())) return null;
        return parsed;
    };

    const getSaleStatus = (sale, now) => {
        const start = sale?.dates?.start;
        const end = sale?.dates?.end;
        if (window.SalesStatus?.computeSalesStatus) {
            return window.SalesStatus.computeSalesStatus(start, end, now, sale?.terminatedAt);
        }
        return sale?.status || 'Active';
    };

    const buildSalesIndex = (sales) => {
        const byResourceId = new Map();
        const soldByResourceId = new Map();
        const now = new Date();
        sales.forEach(sale => {
            const resourceId = sale.inventoryLink;
            if (!resourceId) return;
            if (sale.terminatedAt) return;
            if (getSaleStatus(sale, now) === 'Expired') return;
            const list = byResourceId.get(resourceId) || [];
            list.push(sale);
            byResourceId.set(resourceId, list);
            soldByResourceId.set(resourceId, (soldByResourceId.get(resourceId) || 0) + (sale.capacity?.value || 0));
        });
        return { byResourceId, soldByResourceId };
    };

    const computeInventoryStatus = (item, totalSoldCapacity, now) => {
        const referenceNow = parseDateInput(now) || new Date();
        const baseCapacity = item.capacity?.value || 0;
        let totalCapacity = baseCapacity;
        if (item.costMode === 'batches' && Array.isArray(item.batches)) {
            const activeCapacity = item.batches.reduce((sum, batch) => {
                const status = batch.status || '';
                if (status === 'Ended' || status === 'Planned') return sum;
                if (batch.startDate) {
                    const start = parseDateInput(batch.startDate);
                    if (!start || start > referenceNow) return sum;
                }
                return sum + (batch.capacity?.value || 0);
            }, 0);
            totalCapacity = activeCapacity;
        }
        const startDate = parseDateInput(item.dates?.start);
        const endDate = parseDateInput(item.dates?.end, { endOfDay: true });

        let calculatedStatus = 'Available';
        if (endDate && referenceNow > endDate) {
            calculatedStatus = 'Expired';
        } else if (startDate && referenceNow < startDate) {
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
