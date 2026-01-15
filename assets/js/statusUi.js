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
