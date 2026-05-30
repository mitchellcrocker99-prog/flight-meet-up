export function buildGoogleFlightsUrl(fromIata: string, toIata: string): string {
  const params = new URLSearchParams({
    q: `Flights from ${fromIata} to ${toIata}`,
  });
  return `https://www.google.com/travel/flights?${params.toString()}`;
}

export function buildGoogleFlightsMultiOriginUrl(
  fromIatas: string[],
  toIata: string
): string {
  // For multi-origin, link to the first origin — user can switch on Google Flights
  return buildGoogleFlightsUrl(fromIatas[0], toIata);
}
