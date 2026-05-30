export type Airport = {
  id: number;
  iata_code: string;
  icao_code: string | null;
  name: string;
  city: string;
  country: string;
  country_code: string | null;
  lat: number;
  lng: number;
  is_major: boolean;
};

export type Airline = {
  id: number;
  iata_code: string | null;
  icao_code: string | null;
  name: string;
};

export type Destination = Airport & {
  airlines: Airline[];
};

export type SelectedAirport = Airport & {
  colorIndex: number; // 0–3, maps to ACCENT_COLORS
};

export type Location = {
  id: string;
  address: string;
  lat: number;
  lng: number;
  colorIndex: number; // 0–3
};

export type CompareResult = {
  mode: 'single' | 'compare';
  airports: Airport[];
  destinations: Destination[];
};

export type IsochroneResult = {
  origins: Array<{ lat: number; lng: number; colorIndex: number }>;
  minutes: number;
  polygons: GeoJSON.Feature<GeoJSON.Polygon>[];
  intersection: GeoJSON.Feature<GeoJSON.Polygon> | null;
  intersects: boolean;
  airports: Airport[];
};

// Matches the GeoJSON feature returned from ORS
export type OrsIsochroneFeature = GeoJSON.Feature<
  GeoJSON.Polygon,
  { value: number; center: [number, number] }
>;
