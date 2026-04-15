import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/hooks/useAuth";
import TrackSubmissionForm from "@/components/catalog/TrackSubmissionForm";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Music, Play, Pause, Clock, Zap, Disc3, Heart, Eye, MessageCircle,
  ExternalLink, ArrowLeft, Sparkles
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Track = Tables<"tracks">;

const MAX_PREVIEW_SECONDS = 30;

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function Waveform({ playing, progress }: { playing: boolean; progress: number }) {
  const barCount = 48;
  return (
    <div className="flex items-end gap-[2px] h-12 w-full">
      {Array.from({ length: barCount }).map((_, i) => {
        const filled = i / barCount <= progress;
        return (
          <span
            key={i}
            className={`flex-1 rounded-full transition-all duration-200 ${
              filled ? "bg-primary" : "bg-muted-foreground/15"
            }`}
            style={{
              height: playing && filled
                ? `${40 + Math.sin((i + Date.now() / 200) * 0.8) * 60}%`
                : `${25 + Math.sin(i * 0.7) * 35 + Math.cos(i * 1.3) * 15}%`,
              minHeight: 4,
            }}
          />
        );
      })}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border border-border/50">
      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}

function PlatformIcon({ platform }: { platform: string }) {
  const p = platform.toLowerCase();
  if (p.includes("tiktok")) return <span className="text-base">🎵</span>;
  if (p.includes("instagram")) return <span className="text-base">📸</span>;
  if (p.includes("youtube")) return <span className="text-base">▶️</span>;
  return <span className="text-base">🔗</span>;
}

export default function CatalogTrackDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [track, setTrack] = useState<Track | null>(null);
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!slug) return;
    async function load() {
      setLoading(true);
      let trackRes = await supabase.from("tracks").select("*").eq("slug", slug).eq("status", "active").maybeSingle();
      if (!trackRes.data) {
        trackRes = await supabase.from("tracks").select("*").eq("id", slug).eq("status", "active").maybeSingle() as any;
      }
      const trackData = trackRes.data;
      const trackId = trackData?.id;
      const [subsRes, campRes, trackSubsRes] = await Promise.all([
        supabase
          .from("submissions")
          .select("id, video_url, platform, view_count, like_count, comment_count, dancer_id, campaign_id")
          .eq("review_status", "approved"),
        trackId ? supabase.from("campaigns").select("*").eq("track_id", trackId).in("status", ["active", "completed"]) : Promise.resolve({ data: [] }),
        trackId ? supabase.from("track_submissions" as any).select("*").eq("track_id", trackId) : Promise.resolve({ data: [] }),
      ]);

      if (trackData) setTrack(trackData);

      let allSubs: any[] = [];
      if (subsRes.data && campRes.data) {
        const campaignIds = new Set((campRes.data as any[]).map((c: any) => c.id));
        const relevantSubs = (subsRes.data as any[]).filter((s: any) => campaignIds.has(s.campaign_id));
        allSubs.push(...relevantSubs.map((s: any) => ({ ...s, source: "campaign" })));
      }
      if (trackSubsRes.data) {
        allSubs.push(...(trackSubsRes.data as any[]).map((s: any) => ({ ...s, source: "track" })));
      }

      if (allSubs.length > 0) {
        const dancerIds = [...new Set(allSubs.map((s: any) => s.dancer_id))];
        const { data: profiles } = await supabase
          .from("profiles_safe")
          .select("id, full_name, avatar_url")
          .in("id", dancerIds);
        const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
        setSubmissions(
          allSubs.map((s: any) => ({
            ...s,
            dancer_name: profileMap.get(s.dancer_id)?.full_name || "Dancer",
            dancer_avatar: profileMap.get(s.dancer_id)?.avatar_url,
          }))
        );
      } else {
        setSubmissions([]);
      }

      if (campRes.data) setCampaigns((campRes.data as any[]).filter((c: any) => c.status === "active"));
      setLoading(false);
    }
    load();
  }, [slug, refreshKey]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    };
  }, []);

  const tick = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || audio.paused) return;
    const elapsed = audio.currentTime;
    const duration = Math.min(audio.duration || MAX_PREVIEW_SECONDS, MAX_PREVIEW_SECONDS);
    setProgress(elapsed / duration);
    if (elapsed >= MAX_PREVIEW_SECONDS) {
      audio.pause(); setPlaying(false); setProgress(0); return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const togglePlay = useCallback(() => {
    if (!track) return;
    const url = track.preview_url || track.audio_url;
    if (!url) return;

    if (playing) {
      audioRef.current?.pause();
      cancelAnimationFrame(rafRef.current);
      setPlaying(false);
      setProgress(0);
      return;
    }

    if (audioRef.current) { audioRef.current.pause(); cancelAnimationFrame(rafRef.current); }
    const audio = new Audio(url);
    audioRef.current = audio;
    setPlaying(true);
    setProgress(0);
    audio.addEventListener("ended", () => { setPlaying(false); setProgress(0); });
    audio.play().then(() => { rafRef.current = requestAnimationFrame(tick); }).catch(() => setPlaying(false));
  }, [track, playing, tick]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 pt-24 pb-16 container mx-auto px-6">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-[320px] rounded-2xl mb-8" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!track) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 pt-24 pb-16 container mx-auto px-6 text-center">
          <Music className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Track Not Found</h1>
          <p className="text-muted-foreground mb-6">This track may have been removed or doesn't exist.</p>
          <Link to="/catalog"><Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" />Back to Catalog</Button></Link>
        </main>
        <Footer />
      </div>
    );
  }

  const hasAudio = !!(track.preview_url || track.audio_url);
  const danceStyles = Array.isArray(track.dance_style_fit) ? (track.dance_style_fit as string[]) : [];
  const moodTags = Array.isArray(track.mood_tags) ? (track.mood_tags as string[]) : [];
  const totalVideos = submissions.length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-6 max-w-5xl">
          {/* Back link */}
          <Link to="/catalog" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Catalog
          </Link>

          {/* Hero Card */}
          <div className="relative rounded-2xl overflow-hidden border border-border bg-card mb-8">
            {/* Gradient background accent */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/3 pointer-events-none" />

            <div className="relative grid md:grid-cols-[260px_1fr] gap-0">
              {/* Cover Art */}
              <div className="relative aspect-square md:aspect-auto md:h-full">
                {track.cover_image_url ? (
                  <img src={track.cover_image_url} alt={track.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full min-h-[260px] flex items-center justify-center bg-muted">
                    <Music className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Track Info */}
              <div className="p-6 md:p-8 flex flex-col justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    {track.genre && (
                      <Badge variant="secondary" className="capitalize text-xs">
                        {track.genre.replace(/_/g, " ")}
                      </Badge>
                    )}
                    {track.mood && (
                      <Badge variant="outline" className="text-xs">
                        {track.mood}
                      </Badge>
                    )}
                    {totalVideos > 0 && (
                      <Badge variant="outline" className="text-xs border-destructive/30 text-destructive">
                        {"🔥".repeat(Math.min(totalVideos >= 10 ? 3 : totalVideos >= 5 ? 2 : 1, 3))} {totalVideos} {totalVideos === 1 ? "video" : "videos"}
                      </Badge>
                    )}
                  </div>

                  <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-1">{track.title}</h1>
                  <p className="text-lg text-muted-foreground mb-6">{track.artist_name}</p>

                  {/* Quick Stats Row */}
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground mb-6">
                    {track.bpm && (
                      <span className="flex items-center gap-1.5">
                        <Zap className="h-4 w-4 text-primary" />{track.bpm} BPM
                      </span>
                    )}
                    {track.duration_seconds && (
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-primary" />{formatDuration(track.duration_seconds)}
                      </span>
                    )}
                    {track.energy_level && (
                      <span className="flex items-center gap-1.5">
                        <Disc3 className="h-4 w-4 text-primary" />{track.energy_level} Energy
                      </span>
                    )}
                    {track.vocal_type && (
                      <span className="flex items-center gap-1.5">
                        <Music className="h-4 w-4 text-primary" />{track.vocal_type}
                      </span>
                    )}
                  </div>
                </div>

                {/* Audio Player */}
                {hasAudio && (
                  <div className="bg-muted/50 rounded-xl p-4 border border-border/50">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={togglePlay}
                        className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-all hover:scale-105 flex-shrink-0 shadow-sm"
                      >
                        {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <Waveform playing={playing} progress={playing ? progress : 0} />
                        <p className="text-[11px] text-muted-foreground mt-1.5">30-second preview</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Platform Links */}
                {(track.spotify_url || track.tiktok_sound_url || track.instagram_sound_url) && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {track.spotify_url && (
                      <a href={track.spotify_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                          <ExternalLink className="h-3 w-3" />Spotify
                        </Button>
                      </a>
                    )}
                    {track.tiktok_sound_url && (
                      <a href={track.tiktok_sound_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                          <ExternalLink className="h-3 w-3" />TikTok
                        </Button>
                      </a>
                    )}
                    {track.instagram_sound_url && (
                      <a href={track.instagram_sound_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                          <ExternalLink className="h-3 w-3" />Instagram
                        </Button>
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            <StatCard icon={<Zap className="h-4 w-4" />} label="BPM" value={track.bpm} />
            <StatCard icon={<Disc3 className="h-4 w-4" />} label="Energy" value={track.energy_level} />
            <StatCard icon={<Clock className="h-4 w-4" />} label="Duration" value={formatDuration(track.duration_seconds)} />
            <StatCard icon={<Music className="h-4 w-4" />} label="Vocal" value={track.vocal_type} />
          </div>

          {/* Tags Section */}
          {(moodTags.length > 0 || danceStyles.length > 0) && (
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {moodTags.length > 0 && (
                <div className="p-5 rounded-xl border border-border bg-card">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" /> Mood Tags
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {moodTags.map((tag) => (
                      <Badge key={String(tag)} variant="outline" className="text-xs capitalize">
                        {String(tag)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {danceStyles.length > 0 && (
                <div className="p-5 rounded-xl border border-border bg-card">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Dance Style Fit</p>
                  <div className="flex flex-wrap gap-2">
                    {danceStyles.map((s) => (
                      <Badge key={String(s)} variant="secondary" className="text-xs capitalize">
                        {String(s)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Dance Flags */}
          {(track.choreography_friendly || track.battle_friendly || track.freestyle_friendly) && (
            <div className="flex flex-wrap gap-2 mb-8">
              {track.choreography_friendly && (
                <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/15">✅ Choreography Friendly</Badge>
              )}
              {track.battle_friendly && (
                <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/15">⚔️ Battle Friendly</Badge>
              )}
              {track.freestyle_friendly && (
                <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/15">🎭 Freestyle Friendly</Badge>
              )}
            </div>
          )}

          {/* Active Campaign Banner */}
          {campaigns.length > 0 && (
            <section className="mb-8">
              <div className="rounded-2xl border-2 border-green-500/20 bg-gradient-to-br from-green-500/5 to-green-500/10 p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                  </span>
                  <h2 className="text-xl font-bold">Active Campaign{campaigns.length > 1 ? "s" : ""}</h2>
                </div>
                <p className="text-sm text-muted-foreground mb-5">Join now and get paid to dance to this track!</p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {campaigns.map((camp) => (
                    <Link
                      key={camp.id}
                      to={`/campaigns/${camp.slug}`}
                      className="group block rounded-xl overflow-hidden bg-card border border-border hover:border-primary/30 transition-all shadow-sm hover:shadow-md"
                    >
                      {camp.cover_image_url && (
                        <img src={camp.cover_image_url} alt={camp.title} className="w-full h-36 object-cover group-hover:scale-[1.02] transition-transform" />
                      )}
                      <div className="p-4">
                        <p className="font-semibold text-sm">{camp.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{camp.artist_name}</p>
                        <span className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-primary">
                          🎯 Join Campaign <ArrowLeft className="h-3 w-3 rotate-180" />
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Dance Videos */}
          <section className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Dance Videos</h2>
              {submissions.length > 0 && (
                <span className="text-sm text-muted-foreground">{submissions.length} video{submissions.length !== 1 ? "s" : ""}</span>
              )}
            </div>

            {user && track?.id && (
              <div className="mb-5 p-4 rounded-xl border border-border bg-card">
                <p className="text-sm text-muted-foreground mb-3">Share your dance video for this track</p>
                <TrackSubmissionForm
                  trackId={track.id}
                  userId={user.id}
                  onSubmitted={() => setRefreshKey((k) => k + 1)}
                />
              </div>
            )}
            {!user && (
              <div className="mb-5 p-5 rounded-xl border border-dashed border-border text-center bg-muted/30">
                <p className="text-sm text-muted-foreground">
                  <Link to="/auth" className="text-primary hover:underline font-medium">Sign in</Link> to submit your dance video for this track
                </p>
              </div>
            )}

            {submissions.length === 0 ? (
              <div className="text-center py-16 rounded-2xl border border-dashed border-border bg-muted/20">
                <Music className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground text-sm">No dance videos yet — be the first!</p>
              </div>
            ) : (
              <div className="rounded-xl border border-border overflow-hidden bg-card">
                <div className="max-h-[420px] overflow-y-auto divide-y divide-border/50">
                  {submissions.map((sub) => (
                    <a
                      key={sub.id}
                      href={sub.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors group"
                    >
                      <Avatar className="h-9 w-9 flex-shrink-0 ring-2 ring-border">
                        {sub.dancer_avatar && <AvatarImage src={sub.dancer_avatar} alt={sub.dancer_name} />}
                        <AvatarFallback className="text-xs font-semibold bg-muted">
                          {(sub.dancer_name || "?").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{sub.dancer_name}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <PlatformIcon platform={sub.platform} />
                          <span className="capitalize">{sub.platform}</span>
                        </div>
                      </div>
                      <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{sub.view_count?.toLocaleString() ?? 0}</span>
                        <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" />{sub.like_count?.toLocaleString() ?? 0}</span>
                        <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" />{sub.comment_count?.toLocaleString() ?? 0}</span>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </section>

        </div>
      </main>

      <Footer />
    </div>
  );
}
