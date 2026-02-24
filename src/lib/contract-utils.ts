export type BatchStatus = 'Planned' | 'Active' | 'Ended'

function pad2(value: number): string {
    return String(value).padStart(2, '0')
}

export function formatDateOnly(date: Date): string {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

export function todayDateOnly(): string {
    return formatDateOnly(new Date())
}

export function parsePositiveInt(value: string | number | null | undefined): number | null {
    if (value == null || value === '') return null
    const parsed = typeof value === 'number' ? value : parseInt(value, 10)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export function calculateAnnualOm(otc: number, rate: number): number {
    return (otc * rate) / 100
}

export function calcEndDateFromTerm(startDate: string, termMonths: number | null): string {
    if (!startDate || !termMonths || termMonths <= 0) return ''
    const start = new Date(startDate)
    if (Number.isNaN(start.getTime())) return ''
    start.setMonth(start.getMonth() + termMonths)
    start.setDate(start.getDate() - 1)
    return formatDateOnly(start)
}

export function nextDay(dateStr: string): string {
    const d = new Date(dateStr)
    d.setDate(d.getDate() + 1)
    return formatDateOnly(d)
}

export function calcBatchTermToBaseEnd(
    baseStartDate: string | null,
    baseTermMonths: number | null,
    batchStartDate: string,
): number {
    if (!baseStartDate || !baseTermMonths || !batchStartDate) return 0
    const baseEnd = new Date(baseStartDate)
    if (Number.isNaN(baseEnd.getTime())) return 0
    baseEnd.setMonth(baseEnd.getMonth() + baseTermMonths)
    baseEnd.setDate(baseEnd.getDate() - 1)

    const batchStart = new Date(batchStartDate)
    if (Number.isNaN(batchStart.getTime()) || baseEnd < batchStart) return 0

    return (baseEnd.getFullYear() - batchStart.getFullYear()) * 12 + (baseEnd.getMonth() - batchStart.getMonth()) + 1
}

export function suggestBatchStatusFromBaseTerm(
    batchStartDate: string,
    baseStartDate: string | null,
    baseTermMonths: number | null,
): BatchStatus {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (baseStartDate && baseTermMonths && baseTermMonths > 0) {
        const baseEnd = new Date(baseStartDate)
        if (!Number.isNaN(baseEnd.getTime())) {
            baseEnd.setMonth(baseEnd.getMonth() + baseTermMonths)
            baseEnd.setDate(baseEnd.getDate() - 1)
            if (baseEnd < today) return 'Ended'
        }
    }

    if (!batchStartDate) return 'Planned'
    const batchStart = new Date(batchStartDate)
    if (Number.isNaN(batchStart.getTime())) return 'Planned'
    return batchStart > today ? 'Planned' : 'Active'
}

export function suggestBatchStatusFromBaseEnd(
    batchStartDate: string,
    baseEndDate: string | null,
): BatchStatus {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (baseEndDate) {
        const baseEnd = new Date(baseEndDate)
        if (!Number.isNaN(baseEnd.getTime()) && baseEnd < today) {
            return 'Ended'
        }
    }

    const batchStart = new Date(batchStartDate)
    if (Number.isNaN(batchStart.getTime())) return 'Planned'
    return batchStart > today ? 'Planned' : 'Active'
}
