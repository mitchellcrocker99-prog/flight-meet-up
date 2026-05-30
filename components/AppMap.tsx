'use client';

import { useCallback, useMemo, useState } from 'react';
import Map, { Source, Layer, Marker, NavigationControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  MAP_STYLE,
  DEFAULT_VIEW,
  ACCENT_COLORS,
  ACCENT_COLORS_LIGHT,
} from '@/lib/constants';
import type {
  SelectedAirport,
  CompareResult,
  Destination,
  Location,
  IsochroneResult,
} from '@/lib/types';
import type { ActiveTab } from './AppShell';

type Props = {
  activeTab: ActiveTab;
  selectedAirports: SelectedAirport[];
  compareResult: CompareResult | null;
  activeDestination: Destination | null;
  hoveredDestination: Destination | null;
  onSelectDestination: (d: Destination) => void;
  locations: Location[];
  isochroneResult: IsochroneResult | null;
};

type MapHover = { lng: number; lat: number; label: string };

function buildRouteLines(
  airports: SelectedAirport[],
  destinations: Destination[]
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  for (const airport of airports) {
    for (const dest of destinations) {
      features.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [airport.lng, airport.lat],
            [dest.lng, dest.lat],
          ],
        },
        properties: {
          color: ACCENT_COLORS[airport.colorIndex],
          opacity: 0.5,
        },
      });
    }
  }
  return { type: 'FeatureCollection', features };
}

function buildDestinationPoints(destinations: Destination[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: destinations.map((d) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [d.lng, d.lat] },
      properties: { id: d.id, iata: d.iata_code, name: d.name, city: d.city },
    })),
  };
}

function buildIsochroneCollection(
  polygons: GeoJSON.Feature<GeoJSON.Polygon>[],
  colorIndices: number[]
): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: polygons.map((p, i) => ({
      ...p,
      properties: {
        ...p.properties,
        color: ACCENT_COLORS_LIGHT[colorIndices[i] ?? i],
        strokeColor: ACCENT_COLORS[colorIndices[i] ?? i],
      },
    })),
  };
}

function HoverLabel({ label }: { label: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[11px] font-semibold text-slate-800 shadow-md whitespace-nowrap pointer-events-none mb-1">
      {label}
    </div>
  );
}

export default function AppMap({
  activeTab,
  selectedAirports,
  compareResult,
  activeDestination,
  hoveredDestination,
  onSelectDestination,
  locations,
  isochroneResult,
}: Props) {
  const [mapHover, setMapHover] = useState<MapHover | null>(null);

  const routeLines = useMemo(() => {
    if (!compareResult || activeTab !== 'flight') return null;
    return buildRouteLines(selectedAirports, compareResult.destinations);
  }, [compareResult, selectedAirports, activeTab]);

  const destPoints = useMemo(() => {
    if (!compareResult || activeTab !== 'flight') return null;
    return buildDestinationPoints(compareResult.destinations);
  }, [compareResult, activeTab]);

  const isochroneFC = useMemo(() => {
    if (!isochroneResult || activeTab !== 'drive') return null;
    return buildIsochroneCollection(
      isochroneResult.polygons,
      isochroneResult.origins.map((o) => o.colorIndex)
    );
  }, [isochroneResult, activeTab]);

  const intersectionFC = useMemo(() => {
    if (!isochroneResult?.intersection || activeTab !== 'drive') return null;
    return {
      type: 'FeatureCollection' as const,
      features: [isochroneResult.intersection],
    };
  }, [isochroneResult, activeTab]);

  // Hover over GeoJSON destination dots
  const handleMouseMove = useCallback(
    (e: { features?: Array<{ geometry: GeoJSON.Geometry; properties: Record<string, unknown> }> }) => {
      const f = e.features?.[0];
      if (f?.geometry.type === 'Point') {
        const [lng, lat] = (f.geometry as GeoJSON.Point).coordinates;
        setMapHover({
          lng,
          lat,
          label: String(f.properties?.city || f.properties?.name || f.properties?.iata || ''),
        });
      } else {
        setMapHover(null);
      }
    },
    []
  );

  const clearHover = useCallback(() => setMapHover(null), []);

  // Active GeoJSON interactive layers (for onMouseMove feature detection)
  const interactiveLayerIds = useMemo(
    () => (activeTab === 'flight' && destPoints ? ['dest-circles'] : []),
    [activeTab, destPoints]
  );

  return (
    <Map
      initialViewState={DEFAULT_VIEW}
      mapStyle={MAP_STYLE}
      style={{ width: '100%', height: '100%' }}
      attributionControl={{ compact: true }}
      interactiveLayerIds={interactiveLayerIds}
      onMouseMove={handleMouseMove}
      onMouseLeave={clearHover}
    >
      <NavigationControl position="top-right" />

      {/* ── Flight Explorer layers ── */}
      {activeTab === 'flight' && (
        <>
          {routeLines && (
            <Source id="route-lines" type="geojson" data={routeLines}>
              <Layer
                id="route-lines-layer"
                type="line"
                paint={{
                  'line-color': ['get', 'color'],
                  'line-width': 1.2,
                  'line-opacity': ['get', 'opacity'],
                }}
              />
            </Source>
          )}

          {destPoints && (
            <Source id="dest-points" type="geojson" data={destPoints}>
              <Layer
                id="dest-circles"
                type="circle"
                paint={{
                  'circle-radius': 4,
                  'circle-color': '#0ea5e9',
                  'circle-stroke-width': 1.5,
                  'circle-stroke-color': '#ffffff',
                }}
              />
            </Source>
          )}

          {/* Selected airport markers */}
          {selectedAirports.map((a) => (
            <Marker key={a.iata_code} longitude={a.lng} latitude={a.lat} anchor="bottom" style={{ zIndex: 10 }}>
              <div className="flex flex-col items-center gap-0.5">
                <div
                  className="px-1.5 py-0.5 rounded text-[11px] font-bold text-white shadow-md whitespace-nowrap"
                  style={{ backgroundColor: ACCENT_COLORS[a.colorIndex] }}
                >
                  {a.iata_code}
                </div>
                <div
                  className="w-4 h-4 rounded-full border-2 border-white shadow-md cursor-default"
                  style={{ backgroundColor: ACCENT_COLORS[a.colorIndex] }}
                  onMouseEnter={() =>
                    setMapHover({ lng: a.lng, lat: a.lat, label: `${a.iata_code} — ${a.city || a.name}` })
                  }
                  onMouseLeave={clearHover}
                />
              </div>
            </Marker>
          ))}

          {/* Sidebar-hover destination label */}
          {hoveredDestination && hoveredDestination.id !== activeDestination?.id && (
            <Marker
              longitude={hoveredDestination.lng}
              latitude={hoveredDestination.lat}
              anchor="bottom"
              style={{ zIndex: 20 }}
            >
              <HoverLabel label={hoveredDestination.city || hoveredDestination.name} />
            </Marker>
          )}

          {/* Active destination marker */}
          {activeDestination && (
            <Marker
              longitude={activeDestination.lng}
              latitude={activeDestination.lat}
              anchor="center"
            >
              <div
                className="w-5 h-5 rounded-full bg-yellow-400 border-2 border-yellow-600 shadow-lg cursor-default"
                onMouseEnter={() =>
                  setMapHover({
                    lng: activeDestination.lng,
                    lat: activeDestination.lat,
                    label: activeDestination.city || activeDestination.name,
                  })
                }
                onMouseLeave={clearHover}
              />
            </Marker>
          )}
        </>
      )}

      {/* ── Drive Meetup layers ── */}
      {activeTab === 'drive' && (
        <>
          {isochroneFC && (
            <Source id="isochrones" type="geojson" data={isochroneFC}>
              <Layer
                id="isochrone-fill"
                type="fill"
                paint={{
                  'fill-color': ['get', 'color'],
                  'fill-opacity': 0.35,
                }}
              />
              <Layer
                id="isochrone-stroke"
                type="line"
                paint={{
                  'line-color': ['get', 'strokeColor'],
                  'line-width': 1.5,
                  'line-opacity': 0.7,
                }}
              />
            </Source>
          )}

          {intersectionFC && (
            <Source id="intersection" type="geojson" data={intersectionFC}>
              <Layer
                id="intersection-fill"
                type="fill"
                paint={{
                  'fill-color': '#1d4ed8',
                  'fill-opacity': 0.18,
                }}
              />
              <Layer
                id="intersection-stroke"
                type="line"
                paint={{
                  'line-color': '#1d4ed8',
                  'line-width': 2,
                  'line-dasharray': [3, 2],
                  'line-opacity': 0.8,
                }}
              />
            </Source>
          )}

          {/* Drive origin markers */}
          {locations.map((loc) => (
            <Marker key={loc.id} longitude={loc.lng} latitude={loc.lat} anchor="bottom">
              <div
                className="w-3.5 h-3.5 rounded-full border-2 border-white shadow-md cursor-default"
                style={{ backgroundColor: ACCENT_COLORS[loc.colorIndex] }}
                onMouseEnter={() =>
                  setMapHover({ lng: loc.lng, lat: loc.lat, label: loc.address })
                }
                onMouseLeave={clearHover}
              />
            </Marker>
          ))}

          {/* Airport markers in zone */}
          {isochroneResult?.airports.map((a) => (
            <Marker key={a.iata_code} longitude={a.lng} latitude={a.lat} anchor="center">
              <div
                className="flex items-center justify-center w-5 h-5 rounded-full bg-white border border-slate-400 shadow text-[8px] font-bold text-slate-700 cursor-pointer hover:scale-110 transition-transform"
                onMouseEnter={() =>
                  setMapHover({ lng: a.lng, lat: a.lat, label: `${a.iata_code} — ${a.city || a.name}` })
                }
                onMouseLeave={clearHover}
              >
                ✈
              </div>
            </Marker>
          ))}
        </>
      )}

      {/* ── Universal hover popup ── */}
      {mapHover && (
        <Marker
          longitude={mapHover.lng}
          latitude={mapHover.lat}
          anchor="bottom"
          style={{ zIndex: 30 }}
        >
          <HoverLabel label={mapHover.label} />
        </Marker>
      )}
    </Map>
  );
}
