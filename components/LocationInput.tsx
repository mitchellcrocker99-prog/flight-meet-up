'use client';

import { useState, useRef, useCallback } from 'react';
import { MapPin, X } from 'lucide-react';
import { ACCENT_COLORS } from '@/lib/constants';
import { geocode } from '@/lib/nominatim';
import type { Location } from '@/lib/types';

type Props = {
  location: Location;
  onUpdate: (loc: Location) => void;
  onRemove: () => void;
};

export default function LocationInput({ location, onUpdate, onRemove }: Props) {
  const [query, setQuery] = useState(location.address || '');
  const [results, setResults] = useState<
    { display_name: string; lat: string; lon: string }[]
  >([]);
  const [isOpen, setIsOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 3) { setResults([]); return; }
    try {
      const data = await geocode(q);
      setResults(data.slice(0, 5));
    } catch {
      setResults([]);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setIsOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 350);
  };

  const handleSelect = (r: { display_name: string; lat: string; lon: string }) => {
    const shortName = r.display_name.split(',').slice(0, 2).join(',').trim();
    setQuery(shortName);
    setIsOpen(false);
    setResults([]);
    onUpdate({
      ...location,
      address: shortName,
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
    });
  };

  return (
    <div className="relative flex items-center gap-2">
      <div
        className="w-2.5 h-2.5 rounded-full shrink-0"
        style={{ backgroundColor: ACCENT_COLORS[location.colorIndex] }}
      />
      <div className="relative flex-1">
        <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => query.length >= 3 && setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
          placeholder="Enter city or address…"
          className="w-full pl-7 pr-3 py-1.5 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
        />

        {isOpen && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-50 overflow-hidden">
            {results.map((r, i) => (
              <button
                key={i}
                onMouseDown={() => handleSelect(r)}
                className="w-full px-3 py-2 text-xs text-left hover:bg-accent truncate"
              >
                {r.display_name}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={onRemove}
        className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
        aria-label="Remove location"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
