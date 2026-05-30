export type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  class: string;
  type: string;
  importance: number;
};

export async function geocode(query: string): Promise<NominatimResult[]> {
  const params = new URLSearchParams({
    q: query,
    format: 'json',
    limit: '8',
    addressdetails: '0',
  });

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?${params.toString()}`,
    {
      headers: {
        'User-Agent': 'FlightMeet/1.0 (mitchell.crocker99@gmail.com)',
      },
      next: { revalidate: 86400 },
    }
  );

  if (!res.ok) throw new Error(`Nominatim error: ${res.status}`);
  const all: NominatimResult[] = await res.json();
  return all
    .filter((r) => !r.display_name.match(/\bCounty\b|\bDistrict\b|\bParish\b/))
    .slice(0, 5);
}

export async function geocodeFirst(
  query: string
): Promise<{ lat: number; lng: number; displayName: string } | null> {
  const results = await geocode(query);
  if (!results.length) return null;
  const first = results[0];
  return {
    lat: parseFloat(first.lat),
    lng: parseFloat(first.lon),
    displayName: first.display_name,
  };
}
