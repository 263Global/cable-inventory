import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { getBatchFieldDisplayValue, shouldSaveBatchField } from '../../src/features/inventory/batchField.js'

describe('getBatchFieldDisplayValue', () => {
  it('uses local value while editing', () => {
    assert.equal(getBatchFieldDisplayValue(true, '1500', 1000), '1500')
  })

  it('uses prop value while not editing', () => {
    assert.equal(getBatchFieldDisplayValue(false, '1500', 1000), '1000')
  })
})

describe('shouldSaveBatchField', () => {
  it('returns false when field is disabled', () => {
    assert.equal(shouldSaveBatchField('1500', 1000, true), false)
  })

  it('returns false when value has not changed', () => {
    assert.equal(shouldSaveBatchField('1000', 1000, false), false)
  })

  it('returns true when value changed and field is enabled', () => {
    assert.equal(shouldSaveBatchField('1500', 1000, false), true)
  })
})
