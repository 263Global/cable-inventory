/**
 * Seed Reference Data into Supabase
 * 
 * Imports cable systems, landing stations, countries from TeleGeography JSON data.
 * Run: node scripts/seed-reference-data.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

// --- Config ---
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || ''
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || ''
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY env vars'); process.exit(1) }

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

function loadJSON(filename) {
    return JSON.parse(readFileSync(resolve(ROOT, 'docs/reference_data', filename), 'utf-8'))
}

async function batchInsert(table, records, batchSize = 500) {
    let inserted = 0
    for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize)
        const { error } = await supabase.from(table).insert(batch)
        if (error) {
            console.error(`  Error inserting into ${table} (batch ${i}):`, error.message)
            // Try one by one for this batch to find the problem record
            for (const record of batch) {
                const { error: singleErr } = await supabase.from(table).insert(record)
                if (singleErr) {
                    console.error(`    Failed record:`, record.slug || record.name, '-', singleErr.message)
                } else {
                    inserted++
                }
            }
        } else {
            inserted += batch.length
        }
    }
    return inserted
}

async function main() {
    console.log('🌊 Seeding reference data...\n')

    // 1. Load JSON data
    const cablesJSON = loadJSON('cable_systems.json')
    const stationsJSON = loadJSON('landing_stations.json')
    const countriesJSON = loadJSON('countries.json')

    console.log(`📦 Loaded: ${cablesJSON.length} cables, ${stationsJSON.length} stations, ${countriesJSON.length} countries`)

    // 2. Seed countries (extract unique from stations + countries file)
    const countrySet = new Set()
    countriesJSON.forEach(c => countrySet.add(c.name))
    stationsJSON.forEach(s => { if (s.country) countrySet.add(s.country) })

    const countryRecords = [...countrySet].sort().map(name => ({ name }))
    console.log(`\n🌍 Inserting ${countryRecords.length} countries...`)
    const countriesInserted = await batchInsert('countries', countryRecords)
    console.log(`   ✅ ${countriesInserted} countries inserted`)

    // 3. Seed cable systems
    const cableRecords = cablesJSON.map(c => ({
        slug: c.id,
        name: c.name,
        rfs_year: c.rfsYear || null,
        length: c.length || null,
        owners: c.owners || null,
        status: c.isPlanned ? 'Planned' : 'Active',
    }))
    console.log(`\n🔌 Inserting ${cableRecords.length} cable systems...`)
    const cablesInserted = await batchInsert('cable_systems', cableRecords)
    console.log(`   ✅ ${cablesInserted} cable systems inserted`)

    // 4. Seed landing stations
    const stationRecords = stationsJSON.map(s => ({
        slug: s.id,
        name: s.name,
        country: s.country || 'Unknown',
    }))
    console.log(`\n📍 Inserting ${stationRecords.length} landing stations...`)
    const stationsInserted = await batchInsert('landing_stations', stationRecords)
    console.log(`   ✅ ${stationsInserted} landing stations inserted`)

    // 5. Build junction table (cable <-> landing station)
    // First, fetch DB IDs for cables and stations by slug
    console.log('\n🔗 Building cable ↔ station relationships...')

    const { data: dbCables } = await supabase.from('cable_systems').select('id, slug')
    const { data: dbStations } = await supabase.from('landing_stations').select('id, slug')

    const cableMap = new Map(dbCables.map(c => [c.slug, c.id]))
    const stationMap = new Map(dbStations.map(s => [s.slug, s.id]))

    const junctionRecords = []
    for (const cable of cablesJSON) {
        const cableId = cableMap.get(cable.id)
        if (!cableId) continue

        for (const lpId of (cable.landingPointIds || [])) {
            const stationId = stationMap.get(lpId)
            if (stationId) {
                junctionRecords.push({
                    cable_system_id: cableId,
                    landing_station_id: stationId,
                })
            }
        }
    }

    console.log(`   Found ${junctionRecords.length} relationships`)
    const junctionsInserted = await batchInsert('cable_landing_stations', junctionRecords)
    console.log(`   ✅ ${junctionsInserted} relationships inserted`)

    // 6. Summary
    console.log('\n' + '='.repeat(50))
    console.log('🎉 Seed complete!')
    console.log(`   Countries:     ${countriesInserted}`)
    console.log(`   Cable Systems: ${cablesInserted}`)
    console.log(`   Stations:      ${stationsInserted}`)
    console.log(`   Relationships: ${junctionsInserted}`)
    console.log('='.repeat(50))
}

main().catch(console.error)
