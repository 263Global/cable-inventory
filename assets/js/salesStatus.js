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
