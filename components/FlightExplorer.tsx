'use client';

import { Loader2 } from 'lucide-react';
import AirportSelector from './AirportSelector';
import DestinationList from './DestinationList';
import DestinationPanel from './DestinationPanel';
import type { SelectedAirport, CompareResult, Destination } from '@/lib/types';

type Props = {
  selectedAirports: SelectedAirport[];
  compareResult: CompareResult | null;
  activeDestination: Destination | null;
  hoveredDestination: Destination | null;
  isLoading: boolean;
  onAddAirport: (a: SelectedAirport) => void;
  onRemoveAirport: (iata: string) => void;
  onSelectDestination: (d: Destination) => void;
  onHoverDestination: (d: Destination | null) => void;
  onClosePanel: () => void;
};

export default function FlightExplorer({
  selectedAirports,
  compareResult,
  activeDestination,
  hoveredDestination,
  isLoading,
  onAddAirport,
  onRemoveAirport,
  onSelectDestination,
  onHoverDestination,
  onClosePanel,
}: Props) {
  const hasAirports = selectedAirports.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="p-3 border-b border-border shrink-0">
        <AirportSelector
          selectedAirports={selectedAirports}
          onAdd={onAddAirport}
          onRemove={onRemoveAirport}
        />
      </div>

      {/* Results */}
      <div className="flex-1 overflow-hidden">
        {!hasAirports && (
          <div className="flex flex-col items-center justify-center h-full gap-2 px-4 text-center">
            <p className="text-sm font-medium">Search for an airport to start</p>
            <p className="text-xs text-muted-foreground">
              Add up to 4 airports to find destinations they share direct flights to.
            </p>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {compareResult && (
          <DestinationList
            result={compareResult}
            selectedAirports={selectedAirports}
            activeDestination={activeDestination}
            hoveredDestination={hoveredDestination}
            onSelectDestination={onSelectDestination}
            onHoverDestination={onHoverDestination}
          />
        )}
      </div>

      {/* Slide-in booking panel */}
      <DestinationPanel
        destination={activeDestination}
        selectedAirports={selectedAirports}
        onClose={onClosePanel}
      />
    </div>
  );
}
