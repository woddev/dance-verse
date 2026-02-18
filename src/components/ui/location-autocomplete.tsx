import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface LocationSuggestion {
  display_name: string;
  place_id: number;
}

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function LocationAutocomplete({
  value,
  onChange,
  placeholder = "e.g. Los Angeles, CA",
  className,
}: LocationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=0`,
        { headers: { "Accept-Language": "en" } }
      );
      const data: LocationSuggestion[] = await res.json();
      setSuggestions(data);
      setOpen(data.length > 0);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInput = (val: string) => {
    onChange(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 350);
  };

  const selectSuggestion = (s: LocationSuggestion) => {
    onChange(s.display_name);
    setOpen(false);
    setSuggestions([]);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={value}
        onChange={(e) => handleInput(e.target.value)}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full max-h-48 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md">
          {suggestions.map((s) => (
            <li
              key={s.place_id}
              className={cn(
                "cursor-pointer px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              )}
              onMouseDown={() => selectSuggestion(s)}
            >
              {s.display_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
