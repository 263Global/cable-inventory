/**
 * Generate SQL INSERT statements for seeding reference data
 * Run: node scripts/generate-seed-sql.mjs > supabase/seed_data.sql
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

function loadJSON(filename) {
    return JSON.parse(readFileSync(resolve(ROOT, 'docs/reference_data', filename), 'utf-8'))
}

function escSQL(str) {
    if (str === null || str === undefined) return 'NULL'
    return `'${String(str).replace(/'/g, "''")}'`
}

function main() {
    const cablesJSON = loadJSON('cable_systems.json')
    const stationsJSON = loadJSON('landing_stations.json')
    const countriesJSON = loadJSON('countries.json')

    const lines = []
    lines.push('-- Auto-generated seed data from TeleGeography')
    lines.push('-- Generated: ' + new Date().toISOString())
    lines.push('')

    // 1. Countries
    const countrySet = new Set()
    countriesJSON.forEach(c => countrySet.add(c.name))
    stationsJSON.forEach(s => { if (s.country) countrySet.add(s.country) })
    const countries = [...countrySet].sort()

    lines.push('-- Countries (' + countries.length + ')')
    lines.push('INSERT INTO countries (name) VALUES')
    lines.push(countries.map(c => `  (${escSQL(c)})`).join(',\n'))
    lines.push('ON CONFLICT (name) DO NOTHING;')
    lines.push('')

    // 2. Cable Systems
    lines.push('-- Cable Systems (' + cablesJSON.length + ')')
    // Batch into groups of 100 for SQL Editor limits
    for (let i = 0; i < cablesJSON.length; i += 100) {
        const batch = cablesJSON.slice(i, i + 100)
        lines.push(`INSERT INTO cable_systems (slug, name, rfs_year, length, owners, status) VALUES`)
        lines.push(batch.map(c => {
            const status = c.isPlanned ? 'Planned' : 'Active'
            return `  (${escSQL(c.id)}, ${escSQL(c.name)}, ${c.rfsYear || 'NULL'}, ${escSQL(c.length || null)}, ${escSQL(c.owners || null)}, ${escSQL(status)})`
        }).join(',\n'))
        lines.push('ON CONFLICT (slug) DO NOTHING;')
        lines.push('')
    }

    // 3. Landing Stations
    lines.push('-- Landing Stations (' + stationsJSON.length + ')')
    for (let i = 0; i < stationsJSON.length; i += 100) {
        const batch = stationsJSON.slice(i, i + 100)
        lines.push(`INSERT INTO landing_stations (slug, name, country) VALUES`)
        lines.push(batch.map(s =>
            `  (${escSQL(s.id)}, ${escSQL(s.name)}, ${escSQL(s.country || 'Unknown')})`
        ).join(',\n'))
        lines.push('ON CONFLICT (slug) DO NOTHING;')
        lines.push('')
    }

    // 4. Junction table
    lines.push('-- Cable <-> Landing Station relationships')

    const junctionValues = []
    for (const cable of cablesJSON) {
        for (const lpId of (cable.landingPointIds || [])) {
            junctionValues.push(
                `  ((SELECT id FROM cable_systems WHERE slug = ${escSQL(cable.id)}), (SELECT id FROM landing_stations WHERE slug = ${escSQL(lpId)}))`
            )
        }
    }

    // Split junction into batches of 200
    for (let i = 0; i < junctionValues.length; i += 200) {
        const batch = junctionValues.slice(i, i + 200)
        lines.push('INSERT INTO cable_landing_stations (cable_system_id, landing_station_id) VALUES')
        lines.push(batch.join(',\n'))
        lines.push('ON CONFLICT DO NOTHING;')
        lines.push('')
    }

    const sql = lines.join('\n')
    const outPath = resolve(ROOT, 'supabase', 'seed_data.sql')
    writeFileSync(outPath, sql)
    console.log(`✅ Generated ${outPath}`)
    console.log(`   Countries: ${countries.length}`)
    console.log(`   Cable Systems: ${cablesJSON.length}`)
    console.log(`   Landing Stations: ${stationsJSON.length}`)
    console.log(`   Junction records: ${junctionValues.length}`)
    console.log(`   Total SQL size: ${(sql.length / 1024).toFixed(0)} KB`)
}

main()
