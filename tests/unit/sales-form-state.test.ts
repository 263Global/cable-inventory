import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { applyItemTypeStateRules, applyResourceChangeState, type SalesFormTypeConfig } from '../../src/features/sales/sales-form-state.js'

type TestItem = {
    inventory_resource_id: string
    selectedCircuitIds: string[]
    existingCircuitIds: string[]
    circuitInterfaceOverrides: Record<string, string>
    capacity: string
    spec: string
    disposal_type: string
    term_months: string
    end_date: string
    sell_mrc: string
    sell_otc: string
    sell_om_rate: string
    sell_annual_om: string
}

const FIELD_CONFIG: Record<string, SalesFormTypeConfig> = {
    Capacity: { disposal: true, resource: true, capacity: true, term: true, mrc: true },
    'Cross-Connect': { disposal: false, resource: false, capacity: false, term: true, mrc: true },
    NRC: { disposal: false, resource: false, capacity: false, term: false, mrc: false },
    Other: { disposal: false, resource: false, capacity: false, term: true, mrc: true },
}

function makeItem(): TestItem {
    return {
        inventory_resource_id: 'res-1',
        selectedCircuitIds: ['c1', 'c2'],
        existingCircuitIds: ['c1'],
        circuitInterfaceOverrides: { c1: 'if-2', c2: 'if-3' },
        capacity: '200',
        spec: '100GE',
        disposal_type: 'Swap Out',
        term_months: '24',
        end_date: '2027-12-31',
        sell_mrc: '1000',
        sell_otc: '2000',
        sell_om_rate: '4',
        sell_annual_om: '80',
    }
}

describe('applyResourceChangeState', () => {
    it('clears selected circuits and interface overrides when resource changes', () => {
        const result = applyResourceChangeState(makeItem(), 'res-2', '400GE')
        assert.equal(result.inventory_resource_id, 'res-2')
        assert.deepEqual(result.selectedCircuitIds, [])
        assert.deepEqual(result.existingCircuitIds, [])
        assert.deepEqual(result.circuitInterfaceOverrides, {})
        assert.equal(result.capacity, '')
        assert.equal(result.spec, '400GE')
    })
})

describe('applyItemTypeStateRules', () => {
    it('clears linked-resource state when type does not support resource linkage', () => {
        const result = applyItemTypeStateRules(makeItem(), 'Cross-Connect', FIELD_CONFIG)
        assert.equal(result.inventory_resource_id, '')
        assert.deepEqual(result.selectedCircuitIds, [])
        assert.deepEqual(result.existingCircuitIds, [])
        assert.deepEqual(result.circuitInterfaceOverrides, {})
        assert.equal(result.capacity, '')
        assert.equal(result.spec, '')
        assert.equal(result.disposal_type, 'Lease Out')
    })

    it('clears term and MRC fields for NRC type', () => {
        const result = applyItemTypeStateRules(makeItem(), 'NRC', FIELD_CONFIG)
        assert.equal(result.term_months, '')
        assert.equal(result.end_date, '')
        assert.equal(result.sell_mrc, '')
        assert.equal(result.sell_otc, '')
        assert.equal(result.sell_om_rate, '')
        assert.equal(result.sell_annual_om, '')
    })
})
