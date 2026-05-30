import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import type { CompareResult, Destination, Airport, Airline } from '@/lib/types';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const airports: string[] = body.airports ?? [];

  if (!airports.length || airports.length > 4) {
    return NextResponse.json({ error: 'Provide 1–4 IATA codes' }, { status: 400 });
  }

  // Resolve IATA codes to airport rows
  const airportRows = await sql`
    SELECT id, iata_code, icao_code, name, city, country, country_code, lat, lng, is_major
    FROM airports
    WHERE iata_code = ANY(${airports})
  `;

  if (!airportRows.length) {
    return NextResponse.json({ error: 'No airports found' }, { status: 404 });
  }

  const srcIds = (airportRows as Airport[]).map((a) => a.id);
  const n = srcIds.length;

  // Find destinations all selected airports share direct flights to
  const destRows = await sql`
    SELECT
      a.id, a.iata_code, a.icao_code, a.name, a.city,
      a.country, a.country_code, a.lat, a.lng, a.is_major
    FROM airports a
    WHERE a.id IN (
      SELECT dst_airport_id
      FROM routes
      WHERE src_airport_id = ANY(${srcIds})
        AND src_airport_id != dst_airport_id
      GROUP BY dst_airport_id
      HAVING COUNT(DISTINCT src_airport_id) = ${n}
    )
    ORDER BY a.is_major DESC, a.name ASC
    LIMIT 300
  `;

  // Fetch airlines for each destination
  const destinations: Destination[] = await Promise.all(
    (destRows as Airport[]).map(async (dest) => {
      const airlineRows = await sql`
        SELECT DISTINCT al.id, al.iata_code, al.icao_code, al.name
        FROM routes r
        JOIN airlines al ON al.id = r.airline_id
        WHERE r.src_airport_id = ANY(${srcIds})
          AND r.dst_airport_id = ${dest.id}
          AND al.name IS NOT NULL
        ORDER BY al.name ASC
        LIMIT 10
      `;
      return { ...dest, airlines: airlineRows as Airline[] };
    })
  );

  const result: CompareResult = {
    mode: n === 1 ? 'single' : 'compare',
    airports: airportRows as Airport[],
    destinations,
  };

  return NextResponse.json(result);
}
