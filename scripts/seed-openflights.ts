#!/usr/bin/env tsx
/**
 * Seeds the database from OpenFlights data files.
 * Run once: npx tsx scripts/seed-openflights.ts
 * Requires DIRECT_URL env var (bypasses PgBouncer).
 */

import { neon } from '@neondatabase/serverless';
import { MAJOR_AIRPORTS } from '../lib/constants';

const OPENFLIGHTS_BASE =
  'https://raw.githubusercontent.com/jpatokal/openflights/master/data';

const db = neon(process.env.DIRECT_URL ?? process.env.DATABASE_URL!);

function nullify(val: string): string | null {
  return val === '\\N' || val === '' ? null : val;
}

async function fetchCsv(filename: string): Promise<string[][]> {
  console.log(`Fetching ${filename}...`);
  const res = await fetch(`${OPENFLIGHTS_BASE}/${filename}`);
  if (!res.ok) throw new Error(`Failed to fetch ${filename}: ${res.status}`);
  const text = await res.text();
  return text
    .trim()
    .split('\n')
    .map((line) => {
      // Handle quoted CSV fields
      const fields: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes) {
          fields.push(current.trim());
          current = '';
        } else {
          current += ch;
        }
      }
      fields.push(current.trim());
      return fields;
    });
}

async function seedAirlines() {
  const rows = await fetchCsv('airlines.dat');
  console.log(`Inserting ${rows.length} airlines...`);

  const batch: Array<{
    id: number;
    name: string;
    iata: string | null;
    icao: string | null;
    country: string | null;
    active: boolean;
  }> = [];

  for (const cols of rows) {
    // Format: ID, Name, Alias, IATA, ICAO, Callsign, Country, Active
    const id = parseInt(cols[0]);
    if (isNaN(id) || id < 0) continue;
    const iata = nullify(cols[3]);
    const icao = nullify(cols[4]);
    batch.push({
      id,
      name: nullify(cols[1]) ?? 'Unknown',
      iata: iata && iata.length <= 2 ? iata : null,   // IATA airline codes are max 2 chars
      icao: icao && icao.length <= 3 ? icao : null,   // ICAO airline codes are max 3 chars
      country: nullify(cols[6]),
      active: cols[7] === 'Y',
    });
  }

  // Insert in chunks of 500
  for (let i = 0; i < batch.length; i += 500) {
    const chunk = batch.slice(i, i + 500);
    for (const row of chunk) {
      await db`
        INSERT INTO airlines (id, iata_code, icao_code, name, country, active)
        VALUES (${row.id}, ${row.iata}, ${row.icao}, ${row.name}, ${row.country}, ${row.active})
        ON CONFLICT (id) DO NOTHING
      `;
    }
    process.stdout.write(`\r  airlines: ${Math.min(i + 500, batch.length)}/${batch.length}`);
  }
  console.log('\n  Done.');
}

async function seedAirports() {
  const rows = await fetchCsv('airports.dat');
  console.log(`Inserting ${rows.length} airports...`);

  // Format: ID, Name, City, Country, IATA, ICAO, Lat, Lng, Alt, TZ offset, DST, TZ, Type, Source
  let inserted = 0;
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100);
    for (const cols of chunk) {
      const id = parseInt(cols[0]);
      if (isNaN(id) || id < 0) continue;

      const iata = nullify(cols[4]);
      if (!iata || iata.length !== 3) continue; // skip airports without IATA code

      const lat = parseFloat(cols[6]);
      const lng = parseFloat(cols[7]);
      if (isNaN(lat) || isNaN(lng)) continue;

      const alt = parseInt(cols[8]);
      const name = nullify(cols[1]) ?? 'Unknown';
      const city = nullify(cols[2]) ?? '';
      const country = nullify(cols[3]) ?? '';
      const icao = nullify(cols[5]);
      const tz = nullify(cols[11]);
      const isMajor = MAJOR_AIRPORTS.has(iata);

      // Derive 2-letter country code from common names (best-effort)
      const countryCode = deriveCountryCode(country);

      await db`
        INSERT INTO airports
          (id, iata_code, icao_code, name, city, country, country_code, lat, lng, altitude_ft, timezone, is_major)
        VALUES
          (${id}, ${iata}, ${icao}, ${name}, ${city}, ${country}, ${countryCode},
           ${lat}, ${lng}, ${isNaN(alt) ? null : alt}, ${tz}, ${isMajor})
        ON CONFLICT (id) DO NOTHING
      `;
      inserted++;
    }
    process.stdout.write(`\r  airports: ${Math.min(i + 100, rows.length)}/${rows.length} (${inserted} with IATA)`);
  }
  console.log('\n  Done.');
}

async function seedRoutes() {
  const rows = await fetchCsv('routes.dat');
  console.log(`Inserting ${rows.length} routes...`);

  // Format: Airline, Airline ID, Src airport, Src airport ID, Dst airport, Dst airport ID, Codeshare, Stops, Equipment
  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const cols = rows[i];
    if (cols.length < 9) { skipped++; continue; }

    const stops = parseInt(cols[7]);
    if (isNaN(stops) || stops > 0) { skipped++; continue; } // direct only

    const airlineId = parseInt(cols[1]);
    const srcId = parseInt(cols[3]);
    const dstId = parseInt(cols[5]);

    if (isNaN(srcId) || isNaN(dstId) || srcId < 0 || dstId < 0) { skipped++; continue; }

    const codeshare = cols[6] === 'Y';
    const equipment = cols[8]
      ? cols[8].split(' ').filter(Boolean)
      : null;

    try {
      await db`
        INSERT INTO routes (airline_id, src_airport_id, dst_airport_id, codeshare, equipment)
        VALUES (
          ${isNaN(airlineId) || airlineId < 0 ? null : airlineId},
          ${srcId}, ${dstId}, ${codeshare},
          ${equipment as string[]}
        )
        ON CONFLICT (src_airport_id, dst_airport_id, COALESCE(airline_id, 0)) DO NOTHING
      `;
      inserted++;
    } catch {
      skipped++; // FK violation = airport not in our table
    }

    if (i % 1000 === 0) {
      process.stdout.write(`\r  routes: ${i}/${rows.length} (${inserted} inserted, ${skipped} skipped)`);
    }
  }
  console.log(`\n  Done. ${inserted} inserted, ${skipped} skipped.`);
}

// Best-effort mapping of common country names to ISO 3166-1 alpha-2 codes
const COUNTRY_CODE_MAP: Record<string, string> = {
  'United States': 'US', 'Canada': 'CA', 'United Kingdom': 'GB',
  'Germany': 'DE', 'France': 'FR', 'Spain': 'ES', 'Italy': 'IT',
  'Netherlands': 'NL', 'Australia': 'AU', 'Japan': 'JP', 'China': 'CN',
  'Brazil': 'BR', 'Mexico': 'MX', 'India': 'IN', 'South Korea': 'KR',
  'Russia': 'RU', 'Turkey': 'TR', 'UAE': 'AE', 'United Arab Emirates': 'AE',
  'Qatar': 'QA', 'Singapore': 'SG', 'Thailand': 'TH', 'Indonesia': 'ID',
  'Malaysia': 'MY', 'South Africa': 'ZA', 'Egypt': 'EG', 'Kenya': 'KE',
  'Nigeria': 'NG', 'Ethiopia': 'ET', 'Morocco': 'MA', 'Argentina': 'AR',
  'Chile': 'CL', 'Colombia': 'CO', 'Peru': 'PE', 'New Zealand': 'NZ',
  'Portugal': 'PT', 'Ireland': 'IE', 'Sweden': 'SE', 'Norway': 'NO',
  'Denmark': 'DK', 'Finland': 'FI', 'Switzerland': 'CH', 'Austria': 'AT',
  'Belgium': 'BE', 'Poland': 'PL', 'Czech Republic': 'CZ', 'Hungary': 'HU',
  'Greece': 'GR', 'Israel': 'IL', 'Saudi Arabia': 'SA', 'Kuwait': 'KW',
  'Pakistan': 'PK', 'Bangladesh': 'BD', 'Sri Lanka': 'LK', 'Philippines': 'PH',
  'Vietnam': 'VN', 'Hong Kong': 'HK', 'Taiwan': 'TW',
};

function deriveCountryCode(country: string): string | null {
  return COUNTRY_CODE_MAP[country] ?? null;
}

async function main() {
  console.log('🌐 FlightMeet — OpenFlights seed script');
  console.log('Using:', process.env.DIRECT_URL ? 'DIRECT_URL' : 'DATABASE_URL');
  console.log('');

  await seedAirlines();
  await seedAirports();
  await seedRoutes();

  const [{ count: airlineCount }] = await db`SELECT COUNT(*) FROM airlines`;
  const [{ count: airportCount }] = await db`SELECT COUNT(*) FROM airports`;
  const [{ count: routeCount }]   = await db`SELECT COUNT(*) FROM routes`;

  console.log('');
  console.log('✅ Seed complete!');
  console.log(`   airlines : ${airlineCount}`);
  console.log(`   airports : ${airportCount}`);
  console.log(`   routes   : ${routeCount}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
