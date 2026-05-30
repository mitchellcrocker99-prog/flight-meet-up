import { sql as db } from './db';
import { ISOCHRONE_CACHE_TTL_DAYS, COORD_PRECISION } from './constants';

export type IsochronePolygon = GeoJSON.Feature<GeoJSON.Polygon>;

function roundCoord(n: number): number {
  return parseFloat(n.toFixed(COORD_PRECISION));
}

function roundMinutes(minutes: number): number {
  return Math.round(minutes / 30) * 30;
}

async function fetchFromCache(
  lat: number,
  lng: number,
  minutes: number
): Promise<IsochronePolygon | null> {
  const cutoff = new Date(Date.now() - ISOCHRONE_CACHE_TTL_DAYS * 86_400_000);
  const rows = await db`
    SELECT polygon FROM isochrone_cache
    WHERE origin_lat = ${lat}
      AND origin_lng = ${lng}
      AND drive_minutes = ${minutes}
      AND created_at > ${cutoff}
    LIMIT 1
  `;
  if (!rows.length) return null;
  return rows[0].polygon as IsochronePolygon;
}

async function saveToCache(
  lat: number,
  lng: number,
  minutes: number,
  polygon: IsochronePolygon
): Promise<void> {
  await db`
    INSERT INTO isochrone_cache (origin_lat, origin_lng, drive_minutes, polygon)
    VALUES (${lat}, ${lng}, ${minutes}, ${JSON.stringify(polygon)})
    ON CONFLICT (origin_lat, origin_lng, drive_minutes) DO UPDATE
      SET polygon = EXCLUDED.polygon, created_at = NOW()
  `;
}

async function fetchFromOrs(
  lat: number,
  lng: number,
  minutes: number
): Promise<IsochronePolygon> {
  const apiKey = process.env.ORS_API_KEY;
  if (!apiKey) throw new Error('ORS_API_KEY is not set');

  const seconds = minutes * 60;
  const res = await fetch(
    'https://api.openrouteservice.org/v2/isochrones/driving-car',
    {
      method: 'POST',
      headers: {
        Authorization: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        locations: [[lng, lat]], // ORS uses [lng, lat] order
        range: [seconds],
        range_type: 'time',
        smoothing: 0.25,
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ORS error ${res.status}: ${text}`);
  }

  const data: GeoJSON.FeatureCollection<GeoJSON.Polygon> = await res.json();
  return data.features[0];
}

export async function getIsochrone(
  latRaw: number,
  lngRaw: number,
  minutesRaw: number
): Promise<IsochronePolygon> {
  const lat = roundCoord(latRaw);
  const lng = roundCoord(lngRaw);
  const minutes = roundMinutes(minutesRaw);

  const cached = await fetchFromCache(lat, lng, minutes);
  if (cached) return cached;

  const polygon = await fetchFromOrs(lat, lng, minutes);
  await saveToCache(lat, lng, minutes, polygon);
  return polygon;
}
