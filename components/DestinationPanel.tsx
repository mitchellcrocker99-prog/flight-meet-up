'use client';

import { X, ExternalLink } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { buildGoogleFlightsUrl } from '@/lib/google-flights';
import type { Destination, SelectedAirport } from '@/lib/types';

type Props = {
  destination: Destination | null;
  selectedAirports: SelectedAirport[];
  onClose: () => void;
};

export default function DestinationPanel({ destination, selectedAirports, onClose }: Props) {
  if (!destination) return null;

  const primaryOrigin = selectedAirports[0];

  return (
    <Sheet open={!!destination} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-80 p-0">
        <div className="flex flex-col h-full">
          <SheetHeader className="p-4 border-b border-border">
            <div className="flex items-start justify-between">
              <div>
                <SheetTitle className="text-base">
                  {primaryOrigin
                    ? `${primaryOrigin.iata_code} → ${destination.iata_code}`
                    : destination.iata_code}
                </SheetTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {primaryOrigin ? `${primaryOrigin.city} → ` : ''}
                  {destination.city}, {destination.country}
                </p>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Airlines */}
            {destination.airlines.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Airlines
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {destination.airlines.map((al) => (
                    <Badge key={al.id} variant="secondary" className="text-xs">
                      {al.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Also flying from other origins */}
            {selectedAirports.length > 1 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Also nonstop from
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedAirports.slice(1).map((a) => (
                    <a
                      key={a.iata_code}
                      href={buildGoogleFlightsUrl(a.iata_code, destination.iata_code)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline font-mono"
                    >
                      {a.iata_code} → {destination.iata_code}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* CTA */}
          <div className="p-4 border-t border-border">
            {primaryOrigin && (
              <Button
                className="w-full gap-2"
                onClick={() =>
                  window.open(
                    buildGoogleFlightsUrl(primaryOrigin.iata_code, destination.iata_code),
                    '_blank',
                    'noopener,noreferrer'
                  )
                }
              >
                <ExternalLink className="w-4 h-4" />
                Search on Google Flights
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
