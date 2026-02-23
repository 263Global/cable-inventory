import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { matchesReferenceSearch } from '../../src/features/reference-data/search.js'

type MockRecord = {
  id: string
  name: string
  country: string
  notes?: string
}

describe('matchesReferenceSearch', () => {
  const record: MockRecord = {
    id: '1',
    name: 'Equinix SG3',
    country: 'Singapore',
    notes: 'Primary handover site',
  }

  it('returns true when search is empty', () => {
    assert.equal(matchesReferenceSearch(record, '', 'name'), true)
    assert.equal(matchesReferenceSearch(record, '   ', 'name'), true)
  })

  it('matches the configured search key case-insensitively', () => {
    assert.equal(matchesReferenceSearch(record, 'equinix', 'name'), true)
    assert.equal(matchesReferenceSearch(record, 'EQUINIX', 'name'), true)
  })

  it('falls back to searching all string fields when key does not match', () => {
    assert.equal(matchesReferenceSearch(record, 'singapore', 'name'), true)
    assert.equal(matchesReferenceSearch(record, 'handover', 'name'), true)
  })

  it('returns false when no fields contain the query', () => {
    assert.equal(matchesReferenceSearch(record, 'tokyo', 'name'), false)
  })
})
