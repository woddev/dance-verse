import { useEffect, useState, useRef, useCallback } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Music, Search, Clock, Play, Pause } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/integrations/supabase/types";

type Track = Tables<"tracks">;

const GENRES = [
  "All",
  "Hip Hop",
  "Pop",
  "R&B",
  "Afrobeats",
  "Latin",
  "Electronic",
  "K-Pop",
  "Country",
] as const;

const MAX_PREVIEW_SECONDS = 30;

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/* ── Waveform bars (purely visual, animated while playing) ── */
function WaveformBars({ playing, progress }: { playing: boolean; progress: number }) {
  const barCount = 24;
  return (
    <div className="flex items-end gap-[2px] h-6 w-full">
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
              minHeight: 3,
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

  // Audio state
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

  // Cleanup audio on unmount
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

      // If same track is playing, pause it
      if (playingId === track.id) {
        audioRef.current?.pause();
        cancelAnimationFrame(rafRef.current);
        setPlayingId(null);
        setProgress(0);
        return;
      }

      // Stop current audio
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-72 rounded-xl" />
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((track) => {
                const hasAudio = !!(track.preview_url || track.audio_url);
                const isPlaying = playingId === track.id;

                return (
                  <Card
                    key={track.id}
                    className="border border-border overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                  >
                    {/* Album art */}
                    <div className="aspect-square bg-muted relative overflow-hidden group">
                      {track.cover_image_url ? (
                        <img
                          src={track.cover_image_url}
                          alt={track.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music className="h-16 w-16 text-muted-foreground" />
                        </div>
                      )}

                      {/* Play button overlay */}
                      {hasAudio && (
                        <button
                          onClick={() => togglePlay(track)}
                          className={`absolute inset-0 flex items-center justify-center bg-black/0 transition-all duration-200 ${
                            isPlaying
                              ? "bg-black/40"
                              : "group-hover:bg-black/40 opacity-0 group-hover:opacity-100"
                          } ${isPlaying ? "opacity-100" : ""}`}
                        >
                          <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg transition-transform duration-200 hover:scale-110">
                            {isPlaying ? (
                              <Pause className="h-6 w-6 text-primary-foreground" />
                            ) : (
                              <Play className="h-6 w-6 text-primary-foreground ml-0.5" />
                            )}
                          </div>
                        </button>
                      )}

                      {/* Duration overlay */}
                      {track.duration_seconds && (
                        <div className="absolute bottom-3 right-3 bg-black/80 text-white px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDuration(track.duration_seconds)}
                        </div>
                      )}
                    </div>

                    <CardContent className="p-4 space-y-2">
                      {/* Waveform progress bar */}
                      {hasAudio && (
                        <div className="pb-1">
                          <WaveformBars playing={isPlaying} progress={isPlaying ? progress : 0} />
                        </div>
                      )}
                      <h3 className="font-semibold text-lg truncate">{track.title}</h3>
                      <p className="text-sm text-muted-foreground truncate">{track.artist_name}</p>
                      {track.genre && (
                        <Badge variant="secondary" className="text-xs capitalize">
                          {track.genre.replace(/_/g, " ")}
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
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
