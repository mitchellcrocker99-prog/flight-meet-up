#!/usr/bin/env tsx
import { neon } from '@neondatabase/serverless';

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error('DIRECT_URL is not set');
const sql = neon(url);

async function main() {
  console.log('Running schema migrations...');

  await sql`
    CREATE TABLE IF NOT EXISTS airlines (
      id        INTEGER      PRIMARY KEY,
      iata_code CHAR(2),
      icao_code CHAR(3),
      name      TEXT         NOT NULL,
      country   TEXT,
      active    BOOLEAN      DEFAULT true
    )
  `;
  console.log('✓ airlines');

  await sql`
    CREATE TABLE IF NOT EXISTS airports (
      id           INTEGER      PRIMARY KEY,
      iata_code    CHAR(3)      UNIQUE NOT NULL,
      icao_code    CHAR(4),
      name         TEXT         NOT NULL,
      city         TEXT         NOT NULL,
      country      TEXT         NOT NULL,
      country_code CHAR(2),
      lat          DECIMAL(9,6) NOT NULL,
      lng          DECIMAL(9,6) NOT NULL,
      altitude_ft  INTEGER,
      timezone     TEXT,
      is_major     BOOLEAN      DEFAULT false,
      created_at   TIMESTAMPTZ  DEFAULT NOW()
    )
  `;
  console.log('✓ airports');

  await sql`CREATE INDEX IF NOT EXISTS airports_iata_idx    ON airports(iata_code)`;
  await sql`CREATE INDEX IF NOT EXISTS airports_country_idx ON airports(country_code)`;
  await sql`CREATE INDEX IF NOT EXISTS airports_latlong_idx ON airports(lat, lng)`;

  await sql`
    CREATE TABLE IF NOT EXISTS routes (
      id              SERIAL       PRIMARY KEY,
      airline_id      INTEGER      REFERENCES airlines(id) ON DELETE SET NULL,
      src_airport_id  INTEGER      NOT NULL REFERENCES airports(id) ON DELETE CASCADE,
      dst_airport_id  INTEGER      NOT NULL REFERENCES airports(id) ON DELETE CASCADE,
      codeshare       BOOLEAN      DEFAULT false,
      equipment       TEXT[],
      last_verified   TIMESTAMPTZ,
      created_at      TIMESTAMPTZ  DEFAULT NOW()
    )
  `;
  console.log('✓ routes');

  await sql`CREATE INDEX IF NOT EXISTS routes_src_idx ON routes(src_airport_id)`;
  await sql`CREATE INDEX IF NOT EXISTS routes_dst_idx ON routes(dst_airport_id)`;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS routes_unique_idx
    ON routes(src_airport_id, dst_airport_id, COALESCE(airline_id, 0))
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS isochrone_cache (
      id            SERIAL       PRIMARY KEY,
      origin_lat    DECIMAL(9,6) NOT NULL,
      origin_lng    DECIMAL(9,6) NOT NULL,
      drive_minutes INTEGER      NOT NULL,
      polygon       JSONB        NOT NULL,
      api_source    TEXT         DEFAULT 'openrouteservice',
      created_at    TIMESTAMPTZ  DEFAULT NOW(),
      UNIQUE(origin_lat, origin_lng, drive_minutes)
    )
  `;
  console.log('✓ isochrone_cache');

  console.log('\n✅ Schema complete.');
}

main().catch((e) => { console.error(e); process.exit(1); });
