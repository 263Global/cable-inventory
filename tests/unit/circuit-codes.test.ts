import test from 'node:test'
import assert from 'node:assert/strict'
import {
    buildCodeSearchFilter,
    circuitCodeLabels,
    deliverySegments,
    formatCapacity,
    isSellableCircuit,
    looksLikeCode,
    summarizeDelivery,
    type DeliveryCircuit,
} from '../../src/lib/circuit-codes.js'

const port = (over: Partial<DeliveryCircuit>): DeliveryCircuit => ({ status: 'Available', capacity: 100, has_order: false, ...over })

test('summarizeDelivery: PCCW-like resource splits delivered / sellable / pending / unlit', () => {
    const circuits = [
        port({ supplier_sr: 'SR1', status: 'Allocated', has_order: true }), // 已交付·占用
        port({ supplier_sr: 'SR2', status: 'Reserved' }),                   // 已交付·其他占用（无订单）
        port({ supplier_sr: 'SR3', juno_circuit_id: 'JOC1' }),               // 已交付·可售
        port({}),                                                            // 交付中
        port({ capacity: 400 }),                                             // 交付中
    ]
    assert.deepEqual(summarizeDelivery(1000, circuits), {
        tracked: true, contract: 1000, lit: 800, delivered: 300, sellable: 100, pending: 500, unlit: 200,
    })
})

test('summarizeDelivery: resource without any codes keeps legacy view (no pending)', () => {
    const s = summarizeDelivery(100, [port({})])
    assert.equal(s.tracked, false)
    assert.equal(s.pending, 0)
    assert.equal(s.delivered, 100)
    assert.equal(s.sellable, 0)
})

test('summarizeDelivery: allocated port without code still counts as delivered', () => {
    const s = summarizeDelivery(200, [port({ juno_circuit_id: 'JOC1', status: 'Allocated', has_order: true }), port({ status: 'Allocated', has_order: true })])
    assert.equal(s.delivered, 200)
    assert.equal(s.pending, 0)
})

test('deliverySegments: RES-10010-like split adds up to contract capacity', () => {
    const delivery = { tracked: true, contract: 10000, lit: 6000, delivered: 2700, sellable: 800, pending: 3300, unlit: 4000 }
    const seg = deliverySegments(900, 900, delivery)
    assert.deepEqual(seg, { hard: 900, soft: 900, other: 100, sellable: 800, pending: 3300, unlit: 4000 })
    assert.equal(seg.hard + seg.soft + seg.other + seg.sellable + seg.pending + seg.unlit, 10000)
})

test('formatCapacity uses T for round hundreds over 1000G', () => {
    assert.equal(formatCapacity(2700), '2.7T')
    assert.equal(formatCapacity(10000), '10T')
    assert.equal(formatCapacity(800), '800G')
    assert.equal(formatCapacity(1250), '1250G')
})

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
