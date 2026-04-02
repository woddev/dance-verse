import { useEffect, useState, useRef, useCallback } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Music, Clock, Play, Pause } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Tables } from "@/integrations/supabase/types";
import CatalogFilters, {
  defaultFilters,
  type CatalogFiltersState,
} from "@/components/catalog/CatalogFilters";

type Track = Tables<"tracks">;

const MAX_PREVIEW_SECONDS = 30;

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function PopularityBadge({ count }: { count: number }) {
  if (!count || count < 1) return null;
  const level = count >= 10 ? 3 : count >= 5 ? 2 : 1;
  const fires = "🔥".repeat(level);
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2 py-0.5 ${
        level >= 3
          ? "bg-destructive/15 text-destructive"
          : level >= 2
          ? "bg-orange-500/15 text-orange-600"
          : "bg-amber-500/15 text-amber-600"
      }`}
    >
      {fires} {count} {count === 1 ? "video" : "videos"}
    </span>
  );
}

function MiniWaveform({ playing, progress }: { playing: boolean; progress: number }) {
  const barCount = 20;
  return (
    <div className="flex items-end gap-[1.5px] h-4 w-24">
      {Array.from({ length: barCount }).map((_, i) => {
        const filled = i / barCount <= progress;
        return (
          <span
            key={i}
            className={`flex-1 rounded-sm transition-all duration-150 ${
              filled ? "bg-primary" : "bg-muted-foreground/25"
            }`}
            style={{
              height:
                playing && filled
                  ? `${40 + Math.sin((i + Date.now() / 200) * 0.8) * 60}%`
                  : `${20 + Math.sin(i * 0.9) * 30}%`,
              minHeight: 2,
            }}
          />
        );
      })}
    </div>
  );
}

function parseBpmRange(val: string): [number, number] | null {
  if (val === "all") return null;
  const [lo, hi] = val.split("-").map(Number);
  return [lo, hi];
}

function parseLengthRange(val: string): [number, number] | null {
  if (val === "all") return null;
  const [lo, hi] = val.split("-").map(Number);
  return [lo, hi];
}

export default function Catalog() {
  const navigate = useNavigate();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<CatalogFiltersState>(defaultFilters);
  const [categories, setCategories] = useState<{ slug: string; label: string; color: string }[]>([]);

  const [playingId, setPlayingId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number>(0);

  // Track-to-category mapping via campaigns
  const [trackCategoryMap, setTrackCategoryMap] = useState<Map<string, string>>(new Map());
  // Tracks with active campaigns
  const [activeCampaignTrackIds, setActiveCampaignTrackIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [tracksRes, catsRes, campsRes] = await Promise.all([
        supabase.from("tracks").select("*").eq("status", "active").order("created_at", { ascending: false }),
        supabase.from("campaign_categories").select("slug, label, color").order("position"),
        supabase.from("campaigns").select("track_id, category, status").not("track_id", "is", null),
      ]);

      if (tracksRes.data) setTracks(tracksRes.data);
      if (catsRes.data) setCategories(catsRes.data);

      // Build track→category map and active campaign set from campaigns
      if (campsRes.data) {
        const map = new Map<string, string>();
        const activeSet = new Set<string>();
        campsRes.data.forEach((c: any) => {
          if (c.track_id) {
            map.set(c.track_id, c.category);
            if (c.status === "active") activeSet.add(c.track_id);
          }
        });
        setTrackCategoryMap(map);
        setActiveCampaignTrackIds(activeSet);
      }

      setLoading(false);
    }
    fetchData();
  }, []);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const tick = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || audio.paused) return;
    const elapsed = audio.currentTime;
    const duration = Math.min(audio.duration || MAX_PREVIEW_SECONDS, MAX_PREVIEW_SECONDS);
    setProgress(elapsed / duration);
    if (elapsed >= MAX_PREVIEW_SECONDS) {
      audio.pause();
      setPlayingId(null);
      setProgress(0);
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const togglePlay = useCallback(
    (track: Track) => {
      const url = track.preview_url || track.audio_url;
      if (!url) return;
      if (playingId === track.id) {
        audioRef.current?.pause();
        cancelAnimationFrame(rafRef.current);
        setPlayingId(null);
        setProgress(0);
        return;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        cancelAnimationFrame(rafRef.current);
      }
      const audio = new Audio(url);
      audioRef.current = audio;
      setPlayingId(track.id);
      setProgress(0);
      audio.addEventListener("ended", () => { setPlayingId(null); setProgress(0); });
      audio.play().then(() => { rafRef.current = requestAnimationFrame(tick); }).catch(() => setPlayingId(null));
    },
    [playingId, tick]
  );

  const filtered = tracks.filter((t) => {
    // Search
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!t.title.toLowerCase().includes(q) && !t.artist_name.toLowerCase().includes(q)) return false;
    }
    // Genre
    if (filters.genre !== "All") {
      if (!t.genre || t.genre.toLowerCase().replace(/[-_]/g, " ") !== filters.genre.toLowerCase().replace(/[-_]/g, " ")) return false;
    }
    // Mood
    if (filters.mood !== "All") {
      if (!t.mood || t.mood.toLowerCase() !== filters.mood.toLowerCase()) return false;
    }
    // BPM
    const bpmRange = parseBpmRange(filters.bpmRange);
    if (bpmRange && t.bpm) {
      if (t.bpm < bpmRange[0] || t.bpm > bpmRange[1]) return false;
    } else if (bpmRange && !t.bpm) {
      return false;
    }
    // Length
    const lenRange = parseLengthRange(filters.lengthRange);
    if (lenRange && t.duration_seconds) {
      if (t.duration_seconds < lenRange[0] || t.duration_seconds > lenRange[1]) return false;
    } else if (lenRange && !t.duration_seconds) {
      return false;
    }
    // Version (explicit/clean) — check version_name field
    if (filters.versionType !== "all") {
      const vn = (t.version_name || "").toLowerCase();
      if (filters.versionType === "clean" && !vn.includes("clean")) return false;
      if (filters.versionType === "explicit" && !vn.includes("explicit")) return false;
    }
    // Category
    if (filters.category !== "all") {
      const trackCat = trackCategoryMap.get(t.id);
      if (!trackCat || trackCat !== filters.category) return false;
    }
    return true;
  });

  // Sort: featured first
  const sorted = [...filtered].sort((a, b) => {
    const aFeat = (a as any).featured ? 1 : 0;
    const bFeat = (b as any).featured ? 1 : 0;
    return bFeat - aFeat;
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-6">
          <div className="mb-10">
            <h1 className="text-4xl font-bold">Music Catalog</h1>
            <p className="text-muted-foreground mt-2">
              Browse tracks available for dance campaigns.
            </p>
          </div>

          <CatalogFilters filters={filters} onChange={setFilters} categories={categories} />

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <div className="text-center py-20">
              <Music className="h-14 w-14 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg text-muted-foreground">
                {filters.search || filters.genre !== "All" || filters.mood !== "All" || filters.bpmRange !== "all" || filters.lengthRange !== "all" || filters.versionType !== "all" || filters.category !== "all"
                  ? "No tracks match your filters."
                  : "No tracks available right now. Check back soon!"}
              </p>
            </div>
          ) : (
            <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
              {/* Header row */}
              <div className="hidden sm:grid sm:grid-cols-[48px_56px_1fr_120px_100px_80px] items-center gap-4 px-4 py-2.5 bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <span />
                <span />
                <span>Title / Artist</span>
                <span>Genre</span>
                <span>Preview</span>
                <span className="text-right">Duration</span>
              </div>

              {filtered.map((track) => {
                const hasAudio = !!(track.preview_url || track.audio_url);
                const isPlaying = playingId === track.id;

                return (
                  <div
                    key={track.id}
                    onClick={() => navigate(`/catalog/${track.id}`)}
                    className={`grid grid-cols-[40px_48px_1fr_auto] sm:grid-cols-[48px_56px_1fr_120px_100px_80px] items-center gap-3 sm:gap-4 px-4 py-3 transition-colors cursor-pointer ${
                      isPlaying ? "bg-primary/5" : "hover:bg-muted/40"
                    }`}
                  >
                    <button
                      onClick={(e) => { e.stopPropagation(); hasAudio && togglePlay(track); }}
                      disabled={!hasAudio}
                      className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-colors ${
                        hasAudio
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "bg-muted text-muted-foreground cursor-not-allowed"
                      }`}
                    >
                      {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
                    </button>

                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
                      {track.cover_image_url ? (
                        <img src={track.cover_image_url} alt={track.title} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{track.title}</p>
                        <PopularityBadge count={track.usage_count ?? 0} />
                        {activeCampaignTrackIds.has(track.id) && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2 py-0.5 bg-green-500/15 text-green-700 animate-pulse">
                            🎯 Active Campaign
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{track.artist_name}</p>
                    </div>

                    <div className="hidden sm:block">
                      {track.genre ? (
                        <Badge variant="secondary" className="text-xs capitalize">{track.genre.replace(/_/g, " ")}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>

                    <div className="hidden sm:flex items-center">
                      {hasAudio ? (
                        <MiniWaveform playing={isPlaying} progress={isPlaying ? progress : 0} />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>

                    <div className="text-right text-xs text-muted-foreground flex items-center justify-end gap-1 sm:gap-1.5">
                      <Clock className="h-3 w-3 hidden sm:block" />
                      {formatDuration(track.duration_seconds)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
