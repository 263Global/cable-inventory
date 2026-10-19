import test from 'node:test'
import assert from 'node:assert/strict'
import {
    addDays,
    committedRecurringRevenue,
    deriveContractState,
    diffDays,
    monthsUntil,
} from '../../src/lib/contract-state.js'

const TODAY = '2026-10-19'

test('addDays / diffDays work on plain dates across month ends', () => {
    assert.equal(addDays('2026-09-30', 1), '2026-10-01')
    assert.equal(addDays('2026-10-19', 30), '2026-11-18')
    assert.equal(diffDays('2026-10-19', '2026-11-18'), 30)
})

test('in-term item is hard occupancy, exit = end date', () => {
    const d = deriveContractState({ contract_state: 'in_term', end_date: '2027-04-30' }, 'Active', TODAY)
    assert.equal(d.state, 'in_term')
    assert.equal(d.occupancy, 'hard')
    assert.equal(d.earliestExitDate, '2027-04-30')
    assert.equal(d.rollingSince, null)
})

test('past end date without termination auto-rolls even if stored in_term', () => {
    const d = deriveContractState({ contract_state: 'in_term', end_date: '2026-09-15' }, 'Expired', TODAY)
    assert.equal(d.state, 'rolling')
    assert.equal(d.occupancy, 'soft')
    assert.equal(d.rollingSince, '2026-09-16')
    assert.equal(d.earliestExitDate, '2026-11-18')
    assert.equal(d.daysToExit, 30)
})

test('null contract_state (new rows) is derived from end date', () => {
    assert.equal(deriveContractState({ end_date: null }, 'Pre-sold', TODAY).state, 'in_term')
    assert.equal(deriveContractState({ end_date: '2026-10-18' }, 'Active', TODAY).state, 'rolling')
    assert.equal(deriveContractState({ end_date: '2026-10-19' }, 'Active', TODAY).state, 'in_term')
})

test('stored rolling_since wins over derived', () => {
    const d = deriveContractState({ contract_state: 'rolling', end_date: '2026-09-15', rolling_since: '2026-09-20' }, 'Active', TODAY)
    assert.equal(d.rollingSince, '2026-09-20')
})

test('notice_given counts down from notice date + period', () => {
    const d = deriveContractState({
        contract_state: 'notice_given', end_date: '2026-09-15', notice_given_at: '2026-10-10', notice_period_days: 30,
    }, 'Expired', TODAY)
    assert.equal(d.state, 'notice_given')
    assert.equal(d.occupancy, 'soft')
    assert.equal(d.earliestExitDate, '2026-11-09')
    assert.equal(d.daysToExit, 21)
})

test('custom notice period is respected for rolling', () => {
    const d = deriveContractState({ contract_state: 'rolling', end_date: '2026-09-15', notice_period_days: 60 }, 'Active', TODAY)
    assert.equal(d.earliestExitDate, '2026-12-18')
})

test('terminated by any signal → terminated, no occupancy', () => {
    for (const input of [
        { contract_state: 'terminated' as const, end_date: '2027-01-01' },
        { terminated_at: '2026-10-01', end_date: '2026-09-01' },
        { status: 'Terminated', end_date: '2026-09-01' },
    ]) {
        const d = deriveContractState(input, 'Active', TODAY)
        assert.equal(d.state, 'terminated')
        assert.equal(d.occupancy, 'none')
        assert.equal(d.earliestExitDate, null)
    }
    assert.equal(deriveContractState({ end_date: '2026-09-01' }, 'Cancelled', TODAY).state, 'terminated')
})

test('draft orders never occupy capacity', () => {
    assert.equal(deriveContractState({ end_date: '2027-01-01' }, 'Draft', TODAY).occupancy, 'none')
})

test('monthsUntil rounds up partial months and ignores past dates', () => {
    assert.equal(monthsUntil(TODAY, '2026-10-19'), 1)
    assert.equal(monthsUntil(TODAY, '2027-04-30'), 7)
    assert.equal(monthsUntil(TODAY, '2026-10-01'), 0)
    assert.equal(monthsUntil(TODAY, null), 0)
})

test('committed revenue: rolling = 1 month, in-term capped at horizon', () => {
    const rolling = deriveContractState({ end_date: '2026-09-15' }, 'Expired', TODAY)
    assert.equal(committedRecurringRevenue(12000, rolling, '2026-09-15', TODAY), 12000)

    const inTerm = deriveContractState({ end_date: '2027-04-30' }, 'Active', TODAY)
    assert.equal(committedRecurringRevenue(10000, inTerm, '2027-04-30', TODAY), 70000)

    const longTerm = deriveContractState({ end_date: '2030-01-01' }, 'Active', TODAY)
    assert.equal(committedRecurringRevenue(10000, longTerm, '2030-01-01', TODAY), 120000)

    const terminated = deriveContractState({ contract_state: 'terminated' }, 'Active', TODAY)
    assert.equal(committedRecurringRevenue(10000, terminated, null, TODAY), 0)
})

test('committed revenue: notice_given prorated up to 1 month, 0 after exit', () => {
    const soon = deriveContractState({ contract_state: 'notice_given', notice_given_at: '2026-10-04' }, 'Active', TODAY)
    assert.equal(soon.daysToExit, 15)
    assert.ok(Math.abs(committedRecurringRevenue(30437.5, soon, null, TODAY) - 15000) < 1)

    const gone = deriveContractState({ contract_state: 'notice_given', notice_given_at: '2026-09-01' }, 'Active', TODAY)
    assert.equal(committedRecurringRevenue(10000, gone, null, TODAY), 0)
})
