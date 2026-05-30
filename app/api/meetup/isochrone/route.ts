import { NextRequest, NextResponse } from 'next/server';
import { getIsochrone } from '@/lib/openrouteservice';
import { sql } from '@/lib/db';
import type { IsochroneResult, Airport } from '@/lib/types';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import intersect from '@turf/intersect';
import bbox from '@turf/bbox';
import { point, featureCollection } from '@turf/helpers';

type Origin = { lat: number; lng: number; colorIndex: number };

export async function POST(req: NextRequest) {
  const body = await req.json();
  const origins: Origin[] = body.origins ?? [];
  const minutes: number = body.minutes ?? 120;

  if (!origins.length || origins.length > 4) {
    return NextResponse.json({ error: 'Provide 1–4 origins' }, { status: 400 });
  }
  if (minutes < 30 || minutes > 300) {
    return NextResponse.json({ error: 'minutes must be 30–300' }, { status: 400 });
  }

  let polygons: GeoJSON.Feature[];
  try {
    polygons = await Promise.all(
      origins.map((o) => getIsochrone(o.lat, o.lng, minutes))
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch drive zone';
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  // Compute intersection of all polygons
  let intersection: GeoJSON.Feature<GeoJSON.Polygon> | null = null;
  let intersects = false;

  if (polygons.length === 1) {
    intersection = polygons[0] as GeoJSON.Feature<GeoJSON.Polygon>;
    intersects = true;
  } else {
    let current: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> | null =
      polygons[0] as GeoJSON.Feature<GeoJSON.Polygon>;

    for (let i = 1; i < polygons.length; i++) {
      if (!current) break;
      type Poly = GeoJSON.Feature<GeoJSON.Polygon>;
      const pair: Poly[] = [current as Poly, polygons[i] as Poly];
      const fc: GeoJSON.FeatureCollection<GeoJSON.Polygon> = featureCollection(pair);
      current = intersect(fc) ?? null;
    }

    if (current && current.geometry.type === 'Polygon') {
      intersection = current as GeoJSON.Feature<GeoJSON.Polygon>;
      intersects = true;
    }
  }

  // Find US airports within the intersection
  let airports: Airport[] = [];
  if (intersection) {
    const [minLng, minLat, maxLng, maxLat] = bbox(intersection);

    const candidates = await sql`
      SELECT id, iata_code, icao_code, name, city, country, country_code, lat, lng, is_major
      FROM airports
      WHERE lat BETWEEN ${minLat} AND ${maxLat}
        AND lng BETWEEN ${minLng} AND ${maxLng}
        AND country_code = 'US'
      ORDER BY is_major DESC, name ASC
      LIMIT 200
    `;

    airports = (candidates as Airport[]).filter((a) =>
      booleanPointInPolygon(point([a.lng, a.lat]), intersection!)
    );
  }

  const result: IsochroneResult = {
    origins,
    minutes,
    polygons,
    intersection,
    intersects,
    airports,
  };

  return NextResponse.json(result);
}
