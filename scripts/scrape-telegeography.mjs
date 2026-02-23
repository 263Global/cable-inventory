/**
 * Scrape TeleGeography Submarine Cable Map API
 * Fetches all cable systems and their landing stations.
 * Output: docs/reference_data/ JSON seed files
 */

const BASE_URL = 'https://www.submarinecablemap.com/api/v3';

async function fetchJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.json();
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    console.log('=== TeleGeography Submarine Cable Data Scraper ===\n');

    // Step 1: Get all cable IDs
    console.log('Fetching cable system list...');
    const cables = await fetchJSON(`${BASE_URL}/cable/all.json`);
    console.log(`Found ${cables.length} cable systems.\n`);

    // Step 2: Fetch details for each cable (with rate limiting)
    const cableSystems = [];
    const landingStationMap = new Map(); // id -> { name, country, cableSystems[] }
    const countrySet = new Set();
    let errors = 0;

    const BATCH_SIZE = 20;
    for (let i = 0; i < cables.length; i += BATCH_SIZE) {
        const batch = cables.slice(i, i + BATCH_SIZE);
        const progress = `[${i + 1}-${Math.min(i + BATCH_SIZE, cables.length)}/${cables.length}]`;
        process.stdout.write(`\r${progress} Fetching cable details...`);

        const results = await Promise.allSettled(
            batch.map(cable => fetchJSON(`${BASE_URL}/cable/${cable.id}.json`))
        );

        for (let j = 0; j < results.length; j++) {
            const result = results[j];
            const cable = batch[j];

            if (result.status === 'rejected') {
                errors++;
                continue;
            }

            const data = result.value;
            const landingPoints = (data.landing_points || []).map(lp => ({
                id: lp.id,
                name: lp.name,
                country: lp.country
            }));

            cableSystems.push({
                id: data.id,
                name: data.name,
                length: data.length || null,
                rfs: data.rfs || null,
                rfsYear: data.rfs_year || null,
                owners: data.owners || null,
                isPlanned: data.is_planned || false,
                landingPointIds: landingPoints.map(lp => lp.id),
                landingPointCount: landingPoints.length
            });

            // Collect landing stations
            for (const lp of landingPoints) {
                if (!landingStationMap.has(lp.id)) {
                    landingStationMap.set(lp.id, {
                        id: lp.id,
                        name: lp.name,
                        country: lp.country,
                        cableSystemIds: []
                    });
                }
                landingStationMap.get(lp.id).cableSystemIds.push(data.id);

                // Collect countries
                if (lp.country) countrySet.add(lp.country);
            }
        }

        // Rate limit: 100ms between batches
        await sleep(100);
    }

    console.log('\n');

    // Step 3: Prepare output
    const landingStations = Array.from(landingStationMap.values())
        .sort((a, b) => a.name.localeCompare(b.name));

    const countries = Array.from(countrySet).sort().map(name => ({ name }));

    // Stats
    console.log('=== Results ===');
    console.log(`Cable Systems:    ${cableSystems.length}`);
    console.log(`Landing Stations: ${landingStations.length}`);
    console.log(`Countries:        ${countries.length}`);
    console.log(`Errors:           ${errors}`);

    // Step 4: Write files
    const fs = await import('fs');
    const path = await import('path');

    const outDir = path.join(process.cwd(), 'docs', 'reference_data');
    fs.mkdirSync(outDir, { recursive: true });

    fs.writeFileSync(
        path.join(outDir, 'cable_systems.json'),
        JSON.stringify(cableSystems, null, 2)
    );

    fs.writeFileSync(
        path.join(outDir, 'landing_stations.json'),
        JSON.stringify(landingStations, null, 2)
    );

    fs.writeFileSync(
        path.join(outDir, 'countries.json'),
        JSON.stringify(countries, null, 2)
    );

    console.log(`\nFiles written to: ${outDir}/`);
    console.log('  - cable_systems.json');
    console.log('  - landing_stations.json');
    console.log('  - countries.json');

    // Sample output
    console.log('\n=== Sample Landing Stations ===');
    landingStations.slice(0, 10).forEach(ls => {
        console.log(`  ${ls.name} (${ls.country}) — ${ls.cableSystemIds.length} cables`);
    });
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
