// Shared UI helpers for status/alert styling.
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
        const referenceNow = parseDateInput(now);
        const end = parseDateInput(endDate, { endOfDay: true });
        if (!referenceNow || !end) return false;
        const start = startDate ? parseDateInput(startDate) : null;
        if (startDate && !start) return false;
        if (start && referenceNow < start) return false;
        if (referenceNow > end) return false;
        const nowDayStart = new Date(referenceNow.getTime());
        nowDayStart.setHours(0, 0, 0, 0);
        const daysUntilExpiry = Math.floor((end - nowDayStart) / (1000 * 60 * 60 * 24));
        return daysUntilExpiry >= 0 && daysUntilExpiry <= windowDays;
    };

    window.StatusUi = {
        getAlertBadgeClass,
        getAlertAccentColor,
        isExpiringWithin
    };
})();
