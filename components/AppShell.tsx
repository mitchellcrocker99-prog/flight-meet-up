'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Plane } from 'lucide-react';
import { DEFAULT_VIEW } from '@/lib/constants';
import type {
  SelectedAirport,
  CompareResult,
  Destination,
  Location,
  IsochroneResult,
} from '@/lib/types';
import FlightExplorer from './FlightExplorer';
import DriveMeetup from './DriveMeetup';

const AppMap = dynamic(() => import('./AppMap'), { ssr: false });

export type ActiveTab = 'flight' | 'drive';

export default function AppShell() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('flight');

  // Flight Explorer state
  const [selectedAirports, setSelectedAirports] = useState<SelectedAirport[]>([]);
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);
  const [activeDestination, setActiveDestination] = useState<Destination | null>(null);
  const [hoveredDestination, setHoveredDestination] = useState<Destination | null>(null);
  const [isLoadingFlight, setIsLoadingFlight] = useState(false);

  // Drive Meetup state
  const [locations, setLocations] = useState<Location[]>([]);
  const [driveMinutes, setDriveMinutes] = useState(60);
  const [isochroneResult, setIsochroneResult] = useState<IsochroneResult | null>(null);
  const [isLoadingDrive, setIsLoadingDrive] = useState(false);
  const [driveError, setDriveError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleAddAirport = useCallback((airport: SelectedAirport) => {
    setSelectedAirports((prev) => {
      if (prev.length >= 4 || prev.some((a) => a.iata_code === airport.iata_code))
        return prev;
      return [...prev, { ...airport, colorIndex: prev.length }];
    });
    setActiveDestination(null);
    setHoveredDestination(null);
  }, []);

  const handleRemoveAirport = useCallback((iata: string) => {
    setSelectedAirports((prev) => {
      const next = prev.filter((a) => a.iata_code !== iata);
      return next.map((a, i) => ({ ...a, colorIndex: i }));
    });
    setActiveDestination(null);
    setHoveredDestination(null);
  }, []);

  // Auto-fetch destinations whenever the airport list changes
  useEffect(() => {
    if (!selectedAirports.length) {
      setCompareResult(null);
      setIsLoadingFlight(false);
      return;
    }

    const controller = new AbortController();
    setIsLoadingFlight(true);

    fetch('/api/airports/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ airports: selectedAirports.map((a) => a.iata_code) }),
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error('Compare failed');
        return res.json();
      })
      .then((data) => {
        setCompareResult(data);
        setIsLoadingFlight(false);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error(err);
          setIsLoadingFlight(false);
        }
      });

    return () => controller.abort();
  }, [selectedAirports]);

  // Stable fetch function — state setters are stable so no deps needed
  const fetchZone = useCallback(async (locs: Location[], mins: number) => {
    const validLocs = locs.filter((l) => l.lat !== 0 || l.lng !== 0);
    if (!validLocs.length) return;

    setIsLoadingDrive(true);
    setDriveError(null);
    try {
      const res = await fetch('/api/meetup/isochrone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origins: validLocs.map((l) => ({ lat: l.lat, lng: l.lng, colorIndex: l.colorIndex })),
          minutes: mins,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to fetch drive zone');
      setIsochroneResult(data);
    } catch (err) {
      setDriveError(err instanceof Error ? err.message : 'Unknown error');
      setIsochroneResult(null);
    } finally {
      setIsLoadingDrive(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-fetch when drive minutes OR locations change (debounced 600ms)
  useEffect(() => {
    const hasValidLocs = locations.some((l) => l.lat !== 0 || l.lng !== 0);
    if (!hasValidLocs) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchZone(locations, driveMinutes), 600);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [driveMinutes, locations, fetchZone]);

  const handleFindZone = useCallback(() => {
    fetchZone(locations, driveMinutes);
  }, [locations, driveMinutes, fetchZone]);

  const handleBridgeToFlight = useCallback((airports: SelectedAirport[]) => {
    setSelectedAirports(airports.slice(0, 4));
    setCompareResult(null);
    setActiveDestination(null);
    setActiveTab('flight');
  }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <header className="flex items-center gap-2 px-4 h-11 border-b border-border shrink-0 bg-background z-10">
        <Plane className="w-4 h-4 text-primary" />
        <span className="font-semibold text-sm tracking-tight">FlightMeet</span>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-[380px] shrink-0 border-r border-border flex flex-col overflow-hidden bg-background z-10">
          <div className="flex border-b border-border shrink-0">
            <button
              onClick={() => setActiveTab('flight')}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                activeTab === 'flight'
                  ? 'text-primary border-b-2 border-primary -mb-px'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Flight Explorer
            </button>
            <button
              onClick={() => setActiveTab('drive')}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                activeTab === 'drive'
                  ? 'text-primary border-b-2 border-primary -mb-px'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Drive Meetup
            </button>
          </div>

          <div className="flex-1 overflow-hidden">
            {activeTab === 'flight' ? (
              <FlightExplorer
                selectedAirports={selectedAirports}
                compareResult={compareResult}
                activeDestination={activeDestination}
                hoveredDestination={hoveredDestination}
                isLoading={isLoadingFlight}
                onAddAirport={handleAddAirport}
                onRemoveAirport={handleRemoveAirport}
                onSelectDestination={setActiveDestination}
                onHoverDestination={setHoveredDestination}
                onClosePanel={() => setActiveDestination(null)}
              />
            ) : (
              <DriveMeetup
                locations={locations}
                driveMinutes={driveMinutes}
                isochroneResult={isochroneResult}
                isLoading={isLoadingDrive}
                error={driveError}
                onLocationsChange={setLocations}
                onDriveMinutesChange={setDriveMinutes}
                onFindZone={handleFindZone}
                onBridgeToFlight={handleBridgeToFlight}
              />
            )}
          </div>
        </aside>

        <main className="flex-1 relative">
          <AppMap
            activeTab={activeTab}
            selectedAirports={selectedAirports}
            compareResult={compareResult}
            activeDestination={activeDestination}
            hoveredDestination={hoveredDestination}
            locations={locations}
            isochroneResult={isochroneResult}
            onSelectDestination={setActiveDestination}
          />
        </main>
      </div>
    </div>
  );
}
