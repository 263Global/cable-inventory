// Shared sales status helpers for non-module and module scripts.
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

    const computeSalesStatus = (startDate, endDate, now = new Date(), terminatedAt = null) => {
        if (terminatedAt) return 'Terminated';
        if (!startDate || !endDate) return 'Active';
        const start = parseDateInput(startDate);
        const end = parseDateInput(endDate, { endOfDay: true });
        const referenceNow = parseDateInput(now);
        if (!start || !end || !referenceNow) return 'Active';

        if (referenceNow < start) return 'Pending';
        if (referenceNow > end) return 'Expired';
        return 'Active';
    };

    const getSalesStatusBadgeClass = (status) => {
        if (status === 'Active') return 'badge-success';
        if (status === 'Pending') return 'badge-warning';
        if (status === 'Terminated') return 'badge-terminated';
        return 'badge-danger';
    };

    window.SalesStatus = {
        computeSalesStatus,
        getSalesStatusBadgeClass
    };
})();
