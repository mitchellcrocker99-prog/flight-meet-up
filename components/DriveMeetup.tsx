'use client';

import { useCallback } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ACCENT_COLORS } from '@/lib/constants';
import LocationInput from './LocationInput';
import DriveTimeSlider from './DriveTimeSlider';
import MeetupResults from './MeetupResults';
import type { Location, IsochroneResult, SelectedAirport } from '@/lib/types';

let _nextId = 0;
function nextId() { return String(++_nextId); }

type Props = {
  locations: Location[];
  driveMinutes: number;
  isochroneResult: IsochroneResult | null;
  isLoading: boolean;
  error: string | null;
  onLocationsChange: (locs: Location[]) => void;
  onDriveMinutesChange: (m: number) => void;
  onFindZone: () => void;
  onBridgeToFlight: (airports: SelectedAirport[]) => void;
};

export default function DriveMeetup({
  locations,
  driveMinutes,
  isochroneResult,
  isLoading,
  error,
  onLocationsChange,
  onDriveMinutesChange,
  onFindZone,
  onBridgeToFlight,
}: Props) {
  const canAdd = locations.length < 4;
  const canFind = locations.some((l) => l.lat !== 0) && !isLoading;

  const handleAdd = useCallback(() => {
    const colorIndex = locations.length;
    onLocationsChange([
      ...locations,
      { id: nextId(), address: '', lat: 0, lng: 0, colorIndex },
    ]);
  }, [locations, onLocationsChange]);

  const handleUpdate = useCallback(
    (id: string, loc: Location) => {
      onLocationsChange(locations.map((l) => (l.id === id ? loc : l)));
    },
    [locations, onLocationsChange]
  );

  const handleRemove = useCallback(
    (id: string) => {
      const next = locations
        .filter((l) => l.id !== id)
        .map((l, i) => ({ ...l, colorIndex: i }));
      onLocationsChange(next);
    },
    [locations, onLocationsChange]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="p-3 space-y-3 border-b border-border shrink-0">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Starting points</p>
          {locations.map((loc) => (
            <LocationInput
              key={loc.id}
              location={loc}
              onUpdate={(updated) => handleUpdate(loc.id, updated)}
              onRemove={() => handleRemove(loc.id)}
            />
          ))}
          {canAdd && (
            <button
              onClick={handleAdd}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              {locations.length === 0 ? 'Add a starting point' : 'Add another person'}
            </button>
          )}
        </div>

        {locations.length > 0 && (
          <>
            <DriveTimeSlider minutes={driveMinutes} onChange={onDriveMinutesChange} />
            <Button
              onClick={onFindZone}
              disabled={!canFind}
              className="w-full gap-2"
              size="sm"
            >
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Find zone
            </Button>
          </>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-hidden">
        {locations.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 px-4 text-center">
            <p className="text-sm font-medium">Find where everyone can meet</p>
            <p className="text-xs text-muted-foreground">
              Add starting locations and set a max drive time to find airports
              and cities within reach of everyone.
            </p>
          </div>
        )}

        {error && !isLoading && (
          <div className="mx-3 mt-3 px-3 py-2 rounded-md bg-destructive/10 border border-destructive/20">
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}

        {locations.length > 0 && !isochroneResult && !isLoading && !error && (
          <div className="flex flex-col items-center justify-center h-full gap-2 px-4 text-center">
            <p className="text-sm text-muted-foreground">
              Click &quot;Find zone&quot; to see the reachable area
            </p>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {isochroneResult && (
          <MeetupResults result={isochroneResult} onBridgeToFlight={onBridgeToFlight} />
        )}
      </div>
    </div>
  );
}
