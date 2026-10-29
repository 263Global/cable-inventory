import test from 'node:test'
import assert from 'node:assert/strict'
import {
    buildCodeSearchFilter,
    circuitCodeLabels,
    isSellableCircuit,
    looksLikeCode,
} from '../../src/lib/circuit-codes.js'

test('isSellableCircuit: delivered and unallocated port is sellable', () => {
    assert.equal(isSellableCircuit({ status: 'Available', supplier_sr: 'SR252837' }, false), true)
    assert.equal(isSellableCircuit({ status: 'Available', juno_circuit_id: 'JOC00366' }, false), true)
})

test('isSellableCircuit: no supplier code means not delivered, not sellable', () => {
    assert.equal(isSellableCircuit({ status: 'Available' }, false), false)
})

test('isSellableCircuit: allocated, reserved or linked ports are not sellable', () => {
    assert.equal(isSellableCircuit({ status: 'Allocated', supplier_sr: 'SR252835' }, false), false)
    assert.equal(isSellableCircuit({ status: 'Reserved', supplier_sr: 'SR252872' }, false), false)
    assert.equal(isSellableCircuit({ status: 'Available', supplier_sr: 'SR252835' }, true), false)
})

test('circuitCodeLabels keeps SR → old SR → SID → JOC → XC order and skips empty', () => {
    const labels = circuitCodeLabels({
        status: 'Available',
        supplier_sr: 'SR252835',
        supplier_service_id: 'S0032659',
        juno_circuit_id: 'JOC00364',
    })
    assert.deepEqual(labels.map((item) => item.label), ['SR', 'SID', 'JOC'])
})

test('looksLikeCode requires 4+ chars with a digit', () => {
    assert.equal(looksLikeCode('SR25'), true)
    assert.equal(looksLikeCode('JOC00364'), true)
    assert.equal(looksLikeCode('juno'), false)
    assert.equal(looksLikeCode('25'), false)
})

test('buildCodeSearchFilter strips PostgREST syntax characters', () => {
    const filter = buildCodeSearchFilter(' OB-2026(07)*,% ')
    assert.ok(filter.startsWith('supplier_sr.ilike.*OB-202607*'))
    assert.ok(!filter.includes('('))
    assert.equal(filter.split(',').length, 8)
})
