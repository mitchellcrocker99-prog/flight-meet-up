'use client';

import { useState, useRef, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { ACCENT_COLORS } from '@/lib/constants';
import type { Airport, SelectedAirport } from '@/lib/types';

type Props = {
  selectedAirports: SelectedAirport[];
  onAdd: (airport: SelectedAirport) => void;
  onRemove: (iata: string) => void;
};

export default function AirportSelector({ selectedAirports, onAdd, onRemove }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Airport[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/airports?q=${encodeURIComponent(q)}`);
      setResults(await res.json());
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setIsOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 300);
  };

  const handleSelect = (airport: Airport) => {
    const colorIndex = selectedAirports.length;
    onAdd({ ...airport, colorIndex });
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  const canAdd = selectedAirports.length < 4;

  return (
    <div className="space-y-2">
      {/* Search input */}
      {canAdd && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={handleChange}
            onFocus={() => query.length >= 2 && setIsOpen(true)}
            onBlur={() => setTimeout(() => setIsOpen(false), 150)}
            placeholder="Search airport, city, or code…"
            className="w-full pl-8 pr-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          />

          {/* Dropdown */}
          {isOpen && (results.length > 0 || isLoading) && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-50 overflow-hidden">
              {isLoading && (
                <div className="px-3 py-2 text-xs text-muted-foreground">Searching…</div>
              )}
              {results.map((airport) => {
                const isSelected = selectedAirports.some(
                  (a) => a.iata_code === airport.iata_code
                );
                return (
                  <button
                    key={airport.id}
                    onMouseDown={() => handleSelect(airport)}
                    disabled={isSelected}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span className="font-mono font-semibold text-xs w-10 text-muted-foreground shrink-0">
                      {airport.iata_code}
                    </span>
                    <span className="flex-1 truncate">
                      {airport.name}
                      <span className="text-muted-foreground ml-1">— {airport.city}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Selected airports */}
      {selectedAirports.map((a) => (
        <div
          key={a.iata_code}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-border bg-background"
        >
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: ACCENT_COLORS[a.colorIndex] }}
          />
          <span className="font-mono text-xs font-bold text-muted-foreground w-8 shrink-0">
            {a.iata_code}
          </span>
          <span className="flex-1 text-sm truncate">
            {a.name}
            <span className="text-muted-foreground ml-1 text-xs">— {a.city}</span>
          </span>
          <button
            onClick={() => onRemove(a.iata_code)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label={`Remove ${a.iata_code}`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}

      {!canAdd && (
        <p className="text-xs text-muted-foreground">Maximum 4 airports selected</p>
      )}
    </div>
  );
}
