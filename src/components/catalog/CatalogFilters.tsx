import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";

export interface CatalogFiltersState {
  search: string;
  genre: string;
  mood: string;
  bpmRange: string;
  lengthRange: string;
  versionType: string;
  category: string;
}

const GENRES = [
  "All", "Hip Hop", "Pop", "R&B", "Afrobeats", "Latin", "Electronic", "K-Pop", "Country",
];

const MOODS = ["All", "Happy", "Dark", "Energetic", "Chill", "Aggressive", "Emotional", "Uplifting", "Sad"];

const BPM_RANGES = [
  { label: "All BPM", value: "all" },
  { label: "< 100 BPM", value: "0-99" },
  { label: "100–120 BPM", value: "100-120" },
  { label: "120–140 BPM", value: "120-140" },
  { label: "140–160 BPM", value: "140-160" },
  { label: "160+ BPM", value: "160-999" },
];

const LENGTH_RANGES = [
  { label: "Any Length", value: "all" },
  { label: "< 1 min", value: "0-59" },
  { label: "1–2 min", value: "60-120" },
  { label: "2–3 min", value: "120-180" },
  { label: "3–4 min", value: "180-240" },
  { label: "4+ min", value: "240-9999" },
];

const VERSION_TYPES = [
  { label: "All Versions", value: "all" },
  { label: "Clean", value: "clean" },
  { label: "Explicit", value: "explicit" },
];

interface CatalogFiltersProps {
  filters: CatalogFiltersState;
  onChange: (filters: CatalogFiltersState) => void;
  categories: { slug: string; label: string; color: string }[];
}

export const defaultFilters: CatalogFiltersState = {
  search: "",
  genre: "All",
  mood: "All",
  bpmRange: "all",
  lengthRange: "all",
  versionType: "all",
  category: "all",
};

export default function CatalogFilters({ filters, onChange, categories }: CatalogFiltersProps) {
  const set = (key: keyof CatalogFiltersState, value: string) =>
    onChange({ ...filters, [key]: value });

  const hasActiveFilters =
    filters.genre !== "All" ||
    filters.mood !== "All" ||
    filters.bpmRange !== "all" ||
    filters.lengthRange !== "all" ||
    filters.versionType !== "all" ||
    filters.category !== "all";

  return (
    <div className="space-y-4 mb-8">
      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by title or artist…"
          value={filters.search}
          onChange={(e) => set("search", e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap gap-3">
        <Select value={filters.genre} onValueChange={(v) => set("genre", v)}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Genre" /></SelectTrigger>
          <SelectContent>
            {GENRES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filters.mood} onValueChange={(v) => set("mood", v)}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Mood" /></SelectTrigger>
          <SelectContent>
            {MOODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filters.bpmRange} onValueChange={(v) => set("bpmRange", v)}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="BPM" /></SelectTrigger>
          <SelectContent>
            {BPM_RANGES.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filters.lengthRange} onValueChange={(v) => set("lengthRange", v)}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Length" /></SelectTrigger>
          <SelectContent>
            {LENGTH_RANGES.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filters.versionType} onValueChange={(v) => set("versionType", v)}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Version" /></SelectTrigger>
          <SelectContent>
            {VERSION_TYPES.map((v) => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={() => onChange(defaultFilters)} className="text-muted-foreground">
            <X className="h-3.5 w-3.5 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* Category tags */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => set("category", "all")}
            className={`text-xs font-medium rounded-full px-3 py-1 border transition-colors ${
              filters.category === "all"
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => set("category", cat.slug)}
              className={`text-xs font-medium rounded-full px-3 py-1 border transition-colors ${
                filters.category === cat.slug
                  ? `${cat.color} text-white border-transparent`
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
