import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import type { Airport } from '@/lib/types';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q || q.length < 2) return NextResponse.json([]);

  const search = `%${q}%`;
  const exact = q.toUpperCase();

  const rows = await sql`
    SELECT id, iata_code, icao_code, name, city, country, country_code, lat, lng, is_major
    FROM airports
    WHERE
      iata_code ILIKE ${exact}
      OR name    ILIKE ${search}
      OR city    ILIKE ${search}
    ORDER BY
      CASE WHEN iata_code = ${exact} THEN 0 ELSE 1 END,
      is_major DESC,
      name ASC
    LIMIT 10
  `;

  return NextResponse.json(rows as Airport[]);
}
