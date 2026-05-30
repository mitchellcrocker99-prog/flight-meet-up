// Colorblind-friendly accent colors (no red/green)
export const ACCENT_COLORS = [
  '#3B82F6', // blue
  '#F97316', // orange
  '#8B5CF6', // violet
  '#06B6D4', // cyan
] as const;

export const ACCENT_COLORS_LIGHT = [
  '#BFDBFE', // blue-200
  '#FED7AA', // orange-200
  '#DDD6FE', // violet-200
  '#A5F3FC', // cyan-200
] as const;

// Drive time options in minutes (ORS free tier caps at 3600s = 60 min)
export const DRIVE_TIME_OPTIONS = [15, 30, 45, 60] as const;

// How long to cache isochrones in Neon (days)
export const ISOCHRONE_CACHE_TTL_DAYS = 30;

// Coordinate precision for isochrone cache lookups (~1 km)
export const COORD_PRECISION = 2;

// Map tile style (Carto Positron — free, no API key)
export const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

// Default map center and zoom
export const DEFAULT_VIEW = {
  longitude: -98.5795,
  latitude: 39.8283,
  zoom: 3.5,
};

// Major airport IATA codes (used to flag is_major during seed)
export const MAJOR_AIRPORTS = new Set([
  'ATL','LAX','ORD','DFW','DEN','JFK','SFO','SEA','LAS','MCO',
  'EWR','CLT','PHX','MIA','IAH','BOS','MSP','FLL','DTW','PHL',
  'LGA','BWI','SLC','SAN','DCA','MDW','HNL','TPA','PDX','STL',
  'BNA','OAK','MCI','RDU','AUS','SMF','SJC','DAL','IND','CLE',
  'PIT','CMH','SAT','MEM','JAX','RSW','OGG','BUF','ABQ','SNA',
  // Major international hubs
  'LHR','CDG','AMS','FRA','MAD','FCO','ZRH','MUC','VIE','CPH',
  'ARN','OSL','HEL','BCN','LIS','DUB','BRU','WAW','PRG','BUD',
  'DXB','AUH','DOH','IST','TLV','CAI','NBO','JNB','CPT','ADD',
  'NRT','HND','ICN','PVG','PEK','HKG','SIN','BKK','KUL','CGK',
  'SYD','MEL','BNE','AKL','DEL','BOM','MAA','CCU','CMB',
  'GRU','BOG','LIM','SCL','EZE','GIG','UIO','CCS','MDE',
  'MEX','CUN','GDL','YYZ','YVR','YUL','YYC',
]);
