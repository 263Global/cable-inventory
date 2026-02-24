import test from 'node:test'
import assert from 'node:assert/strict'
import {
    calcBatchTermToBaseEnd,
    calcEndDateFromTerm,
    calculateAnnualOm,
    formatDateOnly,
    nextDay,
    parsePositiveInt,
    suggestBatchStatusFromBaseEnd,
    suggestBatchStatusFromBaseTerm,
} from '../../src/lib/contract-utils.js'

test('formatDateOnly formats local date components', () => {
    const value = formatDateOnly(new Date(2026, 1, 24))
    assert.equal(value, '2026-02-24')
})

test('parsePositiveInt handles invalid and valid values', () => {
    assert.equal(parsePositiveInt(''), null)
    assert.equal(parsePositiveInt('0'), null)
    assert.equal(parsePositiveInt('-2'), null)
    assert.equal(parsePositiveInt('12'), 12)
    assert.equal(parsePositiveInt(24), 24)
})

test('calcEndDateFromTerm calculates end date as inclusive range', () => {
    const endDate = calcEndDateFromTerm('2026-01-15', 2)
    assert.equal(endDate, '2026-03-14')
    assert.equal(calcEndDateFromTerm('2026-01-15', null), '')
})

test('calcBatchTermToBaseEnd calculates remaining term to base end', () => {
    const term = calcBatchTermToBaseEnd('2026-01-01', 12, '2026-04-01')
    assert.equal(term, 9)
})

test('suggestBatchStatusFromBaseTerm returns ended when base has ended', () => {
    const status = suggestBatchStatusFromBaseTerm('2025-01-01', '2024-01-01', 12)
    assert.equal(status, 'Ended')
})

test('suggestBatchStatusFromBaseEnd returns planned for future starts', () => {
    const status = suggestBatchStatusFromBaseEnd('2099-01-01', null)
    assert.equal(status, 'Planned')
})

test('calculateAnnualOm and nextDay helpers', () => {
    assert.equal(calculateAnnualOm(1000, 4), 40)
    assert.equal(nextDay('2026-02-24'), '2026-02-25')
})
