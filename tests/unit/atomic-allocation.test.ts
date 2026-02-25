import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readFileSync } from 'node:fs'

describe('atomic circuit allocation integration', () => {
    it('uses RPC-based allocation entrypoint in sales circuits API', () => {
        const apiSource = readFileSync('src/features/sales/api/circuits.ts', 'utf8')
        assert.match(apiSource, /rpc\('allocate_circuits_with_overrides'/)
    })

    it('defines transactional SQL function with all allocation steps', () => {
        const migration = readFileSync('supabase/migrations/025_atomic_allocate_circuits.sql', 'utf8')
        assert.match(migration, /CREATE OR REPLACE FUNCTION allocate_circuits_with_overrides/)
        assert.match(migration, /INSERT INTO sales_item_circuits/)
        assert.match(migration, /UPDATE inventory_circuits/)
        assert.match(migration, /INSERT INTO interface_change_log/)
        assert.match(migration, /LANGUAGE plpgsql/)
    })
})
