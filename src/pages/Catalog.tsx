import { useEffect, useState, useRef, useCallback } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Music, Search, Clock, Play, Pause } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/integrations/supabase/types";

type Track = Tables<"tracks">;

const GENRES = [
  "All", "Hip Hop", "Pop", "R&B", "Afrobeats", "Latin", "Electronic", "K-Pop", "Country",
] as const;

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
    <span className={`inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2 py-0.5 ${
      level >= 3 ? "bg-destructive/15 text-destructive" : level >= 2 ? "bg-orange-500/15 text-orange-600" : "bg-amber-500/15 text-amber-600"
    }`}>
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
              height: playing && filled
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

export default function Catalog() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [genreFilter, setGenreFilter] = useState("All");

  const [playingId, setPlayingId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    async function fetchTracks() {
      setLoading(true);
      const { data } = await supabase
        .from("tracks")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (data) setTracks(data);
      setLoading(false);
    }
    fetchTracks();
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

      audio.addEventListener("ended", () => {
        setPlayingId(null);
        setProgress(0);
      });

      audio.play().then(() => {
        rafRef.current = requestAnimationFrame(tick);
      }).catch(() => {
        setPlayingId(null);
      });
    },
    [playingId, tick]
  );

  const filtered = tracks.filter((t) => {
    const matchesSearch =
      !search ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.artist_name.toLowerCase().includes(search.toLowerCase());
    const matchesGenre =
      genreFilter === "All" ||
      (t.genre && t.genre.toLowerCase().replace(/[-_]/g, " ") === genreFilter.toLowerCase().replace(/[-_]/g, " "));
    return matchesSearch && matchesGenre;
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

          {/* Search */}
          <div className="relative max-w-md mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title or artist…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Genre filters */}
          <div className="flex flex-wrap gap-2 mb-8">
            {GENRES.map((genre) => (
              <Button
                key={genre}
                size="sm"
                variant={genreFilter === genre ? "default" : "outline"}
                onClick={() => setGenreFilter(genre)}
              >
                {genre}
              </Button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <Music className="h-14 w-14 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg text-muted-foreground">
                {search || genreFilter !== "All"
                  ? "No tracks match your filters."
                  : "No tracks available right now. Check back soon!"}
              </p>
            </div>
          ) : (
            <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
              {/* Header row — hidden on mobile */}
              <div className="hidden sm:grid sm:grid-cols-[48px_56px_1fr_120px_100px_80px] items-center gap-4 px-4 py-2.5 bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <span />
                <span />
                <span>Title / Artist</span>
                <span>Genre</span>
                <span>Preview</span>
                <span className="text-right">Duration</span>
              </div>

              {filtered.map((track, idx) => {
                const hasAudio = !!(track.preview_url || track.audio_url);
                const isPlaying = playingId === track.id;

                return (
                  <div
                    key={track.id}
                    className={`grid grid-cols-[40px_48px_1fr_auto] sm:grid-cols-[48px_56px_1fr_120px_100px_80px] items-center gap-3 sm:gap-4 px-4 py-3 transition-colors ${
                      isPlaying ? "bg-primary/5" : "hover:bg-muted/40"
                    }`}
                  >
                    {/* Play button */}
                    <button
                      onClick={() => hasAudio && togglePlay(track)}
                      disabled={!hasAudio}
                      className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-colors ${
                        hasAudio
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "bg-muted text-muted-foreground cursor-not-allowed"
                      }`}
                    >
                      {isPlaying ? (
                        <Pause className="h-3.5 w-3.5" />
                      ) : (
                        <Play className="h-3.5 w-3.5 ml-0.5" />
                      )}
                    </button>

                    {/* Album art */}
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
                      {track.cover_image_url ? (
                        <img
                          src={track.cover_image_url}
                          alt={track.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Title & artist */}
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{track.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{track.artist_name}</p>
                    </div>

                    {/* Genre — hidden on mobile, shown inline badge on mobile via the auto column */}
                    <div className="hidden sm:block">
                      {track.genre ? (
                        <Badge variant="secondary" className="text-xs capitalize">
                          {track.genre.replace(/_/g, " ")}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>

                    {/* Waveform — hidden on mobile */}
                    <div className="hidden sm:flex items-center">
                      {hasAudio ? (
                        <MiniWaveform playing={isPlaying} progress={isPlaying ? progress : 0} />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>

                    {/* Duration */}
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
