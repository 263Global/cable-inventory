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
        const baseCapacity = item.capacity?.value || 0;
        let totalCapacity = baseCapacity;
        if (item.costMode === 'batches' && Array.isArray(item.batches)) {
            const activeCapacity = item.batches.reduce((sum, batch) => {
                const status = batch.status || '';
                if (status === 'Ended' || status === 'Planned') return sum;
                if (batch.startDate) {
                    const start = new Date(batch.startDate);
                    if (Number.isNaN(start.getTime()) || start > now) return sum;
                }
                return sum + (batch.capacity?.value || 0);
            }, 0);
            totalCapacity = activeCapacity;
        }
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
