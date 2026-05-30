'use client';

import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { buildGoogleFlightsUrl } from '@/lib/google-flights';
import type { Destination, SelectedAirport, CompareResult } from '@/lib/types';

const REGION_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'US', value: 'US' },
  { label: 'Europe', value: 'EU' },
  { label: 'Asia', value: 'AS' },
  { label: 'Other', value: 'other' },
] as const;

const EU_CODES = new Set([
  'GB','FR','DE','ES','IT','NL','PT','IE','SE','NO','DK','FI','CH','AT','BE',
  'PL','CZ','HU','GR','RO','SK','HR','SI','LT','LV','EE','LU','MT','CY','BG',
]);
const AS_CODES = new Set([
  'JP','CN','KR','IN','TH','SG','MY','ID','PH','VN','HK','TW','AU','NZ',
  'AE','QA','SA','KW','TR','IL','PK','BD','LK',
]);

function getRegion(countryCode: string | null): string {
  if (!countryCode) return 'other';
  if (countryCode === 'US') return 'US';
  if (EU_CODES.has(countryCode)) return 'EU';
  if (AS_CODES.has(countryCode)) return 'AS';
  return 'other';
}

function countryFlag(countryCode: string | null): string {
  if (!countryCode || countryCode.length !== 2) return '🌍';
  const points = [...countryCode.toUpperCase()].map(
    (c) => 127397 + c.charCodeAt(0)
  );
  return String.fromCodePoint(...points);
}

type Props = {
  result: CompareResult;
  selectedAirports: SelectedAirport[];
  activeDestination: Destination | null;
  hoveredDestination: Destination | null;
  onSelectDestination: (d: Destination) => void;
  onHoverDestination: (d: Destination | null) => void;
};

export default function DestinationList({
  result,
  selectedAirports,
  activeDestination,
  hoveredDestination,
  onSelectDestination,
  onHoverDestination,
}: Props) {
  const [regionFilter, setRegionFilter] = useState<string>('all');

  const filtered = result.destinations.filter((d) => {
    if (regionFilter === 'all') return true;
    return getRegion(d.country_code) === regionFilter;
  });

  const primaryOrigin = selectedAirports[0];

  const headingText =
    result.mode === 'single'
      ? `All destinations (${result.destinations.length})`
      : `Shared destinations (${result.destinations.length})`;

  return (
    <div className="flex flex-col h-full">
      {/* Header + filters */}
      <div className="px-3 pt-3 pb-2 border-b border-border shrink-0">
        <p className="text-xs font-medium text-muted-foreground mb-2">{headingText}</p>
        <div className="flex gap-1 flex-wrap">
          {REGION_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setRegionFilter(f.value)}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                regionFilter === f.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable list */}
      <ScrollArea className="flex-1">
        {filtered.length === 0 ? (
          <div className="px-3 py-6 text-sm text-muted-foreground text-center">
            No destinations in this region
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((dest) => {
              const isActive = activeDestination?.id === dest.id;
              const isHovered = hoveredDestination?.id === dest.id;
              return (
                <li
                  key={dest.id}
                  className={`px-3 py-2.5 cursor-pointer transition-colors ${
                    isActive ? 'bg-accent' : isHovered ? 'bg-accent/70' : 'hover:bg-accent/50'
                  }`}
                  onClick={() => onSelectDestination(dest)}
                  onMouseEnter={() => onHoverDestination(dest)}
                  onMouseLeave={() => onHoverDestination(null)}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-base shrink-0 mt-0.5">
                      {countryFlag(dest.country_code)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-semibold text-sm truncate">{dest.city || dest.name}</span>
                        <span className="text-xs text-muted-foreground font-mono shrink-0">
                          {dest.iata_code}
                        </span>
                      </div>
                      {dest.airlines.length > 0 && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {dest.airlines
                            .slice(0, 3)
                            .map((a) => a.name)
                            .join(' · ')}
                          {dest.airlines.length > 3 && ' …'}
                        </p>
                      )}
                    </div>
                    {primaryOrigin && (
                      <a
                        href={buildGoogleFlightsUrl(primaryOrigin.iata_code, dest.iata_code)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                        title="Search on Google Flights"
                        aria-label="Search on Google Flights"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </ScrollArea>
    </div>
  );
}
