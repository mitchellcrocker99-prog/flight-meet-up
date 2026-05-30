'use client';

import { Plane, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ACCENT_COLORS } from '@/lib/constants';
import type { IsochroneResult, SelectedAirport } from '@/lib/types';

type Props = {
  result: IsochroneResult;
  onBridgeToFlight: (airports: SelectedAirport[]) => void;
};

export default function MeetupResults({ result, onBridgeToFlight }: Props) {
  const { airports, intersects, origins, minutes } = result;

  if (!intersects) {
    return (
      <div className="px-3 py-4 text-center space-y-2">
        <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto" />
        <p className="text-sm font-medium">No common zone found</p>
        <p className="text-xs text-muted-foreground">
          These locations are too far apart for a {Math.floor(minutes / 60)}hr drive.
          Try increasing the drive time.
        </p>
      </div>
    );
  }

  const handleBridge = () => {
    const bridgeAirports: SelectedAirport[] = airports.slice(0, 4).map((a, i) => ({
      ...a,
      colorIndex: i,
    }));
    onBridgeToFlight(bridgeAirports);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 pt-3 pb-2 border-b border-border shrink-0">
        <p className="text-xs font-medium text-muted-foreground">
          Everyone can reach ({airports.length} airports)
        </p>
      </div>

      <ScrollArea className="flex-1">
        {airports.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            No airports found in the overlap zone
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {airports.map((airport) => (
              <li key={airport.id} className="px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <Plane className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-semibold text-sm truncate">{airport.name}</span>
                      <span className="font-mono text-xs text-muted-foreground shrink-0">
                        {airport.iata_code}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{airport.city}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </ScrollArea>

      {airports.length > 0 && (
        <div className="p-3 border-t border-border shrink-0">
          <Button onClick={handleBridge} className="w-full" size="sm" variant="outline">
            <Plane className="w-3.5 h-3.5 mr-2" />
            Compare flights from these airports →
          </Button>
        </div>
      )}
    </div>
  );
}
