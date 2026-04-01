import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/hooks/useAuth";
import TrackSubmissionForm from "@/components/catalog/TrackSubmissionForm";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Music, Play, Pause, Clock, Zap, Disc3, Heart, Eye, MessageCircle,
  ExternalLink, CheckCircle2, XCircle, ArrowLeft
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

function PopularityBadge({ count }: { count: number }) {
  if (!count || count < 1) return null;
  const level = count >= 10 ? 3 : count >= 5 ? 2 : 1;
  const fires = "🔥".repeat(level);
  return (
    <span className={`inline-flex items-center gap-1 text-sm font-semibold rounded-full px-3 py-1 ${
      level >= 3 ? "bg-destructive/15 text-destructive" : level >= 2 ? "bg-orange-500/15 text-orange-600" : "bg-amber-500/15 text-amber-600"
    }`}>
      {fires} {count} {count === 1 ? "video" : "videos"}
    </span>
  );
}

function Waveform({ playing, progress }: { playing: boolean; progress: number }) {
  const barCount = 40;
  return (
    <div className="flex items-end gap-[2px] h-10 w-full">
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

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function FlagBadge({ label, active }: { label: string; active: boolean | null }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-3 py-1 ${
      active ? "bg-green-500/15 text-green-700" : "bg-muted text-muted-foreground"
    }`}>
      {active ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {label}
    </span>
  );
}

function PlatformIcon({ platform }: { platform: string }) {
  const p = platform.toLowerCase();
  if (p.includes("tiktok")) return <span className="text-lg">🎵</span>;
  if (p.includes("instagram")) return <span className="text-lg">📸</span>;
  if (p.includes("youtube")) return <span className="text-lg">▶️</span>;
  return <span className="text-lg">🔗</span>;
}

export default function CatalogTrackDetail() {
  const { id } = useParams<{ id: string }>();
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
    if (!id) return;
    async function load() {
      setLoading(true);
      const [trackRes, subsRes, campRes, trackSubsRes] = await Promise.all([
        supabase.from("tracks").select("*").eq("id", id).eq("status", "active").single(),
        supabase
          .from("submissions")
          .select("id, video_url, platform, view_count, like_count, comment_count, dancer_id, campaign_id")
          .eq("review_status", "approved"),
        supabase.from("campaigns").select("*").eq("track_id", id).in("status", ["active", "completed"]),
        supabase.from("track_submissions" as any).select("*").eq("track_id", id),
      ]);

      if (trackRes.data) setTrack(trackRes.data);

      // Collect all submissions (campaign + direct track submissions)
      let allSubs: any[] = [];

      // Campaign-based submissions
      if (subsRes.data && campRes.data) {
        const campaignIds = new Set(campRes.data.map((c: any) => c.id));
        const relevantSubs = subsRes.data.filter((s: any) => campaignIds.has(s.campaign_id));
        allSubs.push(...relevantSubs.map((s: any) => ({ ...s, source: "campaign" })));
      }

      // Direct track submissions
      if (trackSubsRes.data) {
        allSubs.push(...(trackSubsRes.data as any[]).map((s: any) => ({ ...s, source: "track" })));
      }

      // Fetch dancer names for all submissions
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

      if (campRes.data) setCampaigns(campRes.data.filter((c: any) => c.status === "active"));
      setLoading(false);
    }
    load();
  }, [id, refreshKey]);

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
          <div className="grid md:grid-cols-[300px_1fr] gap-8">
            <Skeleton className="aspect-square rounded-xl" />
            <div className="space-y-4">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-12 w-full" />
            </div>
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-6">
          {/* Back link */}
          <Link to="/catalog" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Catalog
          </Link>

          {/* Hero */}
          <div className="grid md:grid-cols-[280px_1fr] gap-8 mb-10">
            <div className="aspect-square rounded-xl overflow-hidden bg-muted flex-shrink-0">
              {track.cover_image_url ? (
                <img src={track.cover_image_url} alt={track.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><Music className="h-16 w-16 text-muted-foreground" /></div>
              )}
            </div>

            <div className="flex flex-col justify-center">
              <h1 className="text-3xl md:text-4xl font-bold mb-1">{track.title}</h1>
              <p className="text-lg text-muted-foreground mb-4">{track.artist_name}</p>

              <div className="flex flex-wrap items-center gap-3 mb-6">
                {track.genre && <Badge variant="secondary" className="capitalize">{track.genre.replace(/_/g, " ")}</Badge>}
                <PopularityBadge count={track.usage_count ?? 0} />
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-6">
                {track.bpm && <span className="flex items-center gap-1"><Zap className="h-3.5 w-3.5" />{track.bpm} BPM</span>}
                {track.duration_seconds && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{formatDuration(track.duration_seconds)}</span>}
                {track.energy_level && <span className="flex items-center gap-1"><Disc3 className="h-3.5 w-3.5" />{track.energy_level}</span>}
              </div>

              {/* Audio Player */}
              {hasAudio && (
                <div className="flex items-center gap-4">
                  <button
                    onClick={togglePlay}
                    className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors flex-shrink-0"
                  >
                    {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
                  </button>
                  <div className="flex-1">
                    <Waveform playing={playing} progress={playing ? progress : 0} />
                    <p className="text-xs text-muted-foreground mt-1">30s preview</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Track Details */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10 p-6 rounded-xl border border-border bg-card">
            <DetailItem label="Genre" value={track.genre?.replace(/_/g, " ")} />
            <DetailItem label="Mood" value={track.mood} />
            <DetailItem label="Energy" value={track.energy_level} />
            <DetailItem label="BPM" value={track.bpm} />
            <DetailItem label="Vocal Type" value={track.vocal_type} />
            <DetailItem label="Duration" value={formatDuration(track.duration_seconds)} />

            {moodTags.length > 0 && (
              <div className="sm:col-span-2 lg:col-span-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Mood Tags</p>
                <div className="flex flex-wrap gap-2">
                  {moodTags.map((tag) => <Badge key={String(tag)} variant="outline" className="text-xs">{String(tag)}</Badge>)}
                </div>
              </div>
            )}

            {danceStyles.length > 0 && (
              <div className="sm:col-span-2 lg:col-span-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Dance Style Fit</p>
                <div className="flex flex-wrap gap-2">
                  {danceStyles.map((s) => <Badge key={String(s)} variant="secondary" className="text-xs">{String(s)}</Badge>)}
                </div>
              </div>
            )}

            <div className="sm:col-span-2 lg:col-span-3 flex flex-wrap gap-2">
              <FlagBadge label="Choreography" active={track.choreography_friendly} />
              <FlagBadge label="Battle" active={track.battle_friendly} />
              <FlagBadge label="Freestyle" active={track.freestyle_friendly} />
            </div>
          </div>

          {/* Platform Links */}
          {(track.spotify_url || track.tiktok_sound_url || track.instagram_sound_url) && (
            <div className="flex flex-wrap gap-3 mb-10">
              {track.spotify_url && (
                <a href={track.spotify_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm"><ExternalLink className="h-3.5 w-3.5 mr-1.5" />Spotify</Button>
                </a>
              )}
              {track.tiktok_sound_url && (
                <a href={track.tiktok_sound_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm"><ExternalLink className="h-3.5 w-3.5 mr-1.5" />TikTok Sound</Button>
                </a>
              )}
              {track.instagram_sound_url && (
                <a href={track.instagram_sound_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm"><ExternalLink className="h-3.5 w-3.5 mr-1.5" />Instagram Sound</Button>
                </a>
              )}
            </div>
          )}

          {/* Dance Videos */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">Dance Videos</h2>

            {/* Submission form for logged-in users */}
            {user && id && (
              <div className="mb-6">
                <p className="text-sm text-muted-foreground mb-2">Share your dance video for this track</p>
                <TrackSubmissionForm
                  trackId={id}
                  userId={user.id}
                  onSubmitted={() => setRefreshKey((k) => k + 1)}
                />
              </div>
            )}
            {!user && (
              <div className="mb-6 p-4 rounded-xl border border-dashed border-border text-center">
                <p className="text-sm text-muted-foreground">
                  <Link to="/auth" className="text-primary hover:underline font-medium">Sign in</Link> to submit your dance video for this track
                </p>
              </div>
            )}
            {submissions.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-border rounded-xl">
                <Music className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No dance videos yet — be the first!</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-3">{submissions.length} video{submissions.length !== 1 ? "s" : ""}</p>
                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="max-h-[400px] overflow-y-auto divide-y divide-border">
                    {submissions.map((sub) => (
                      <a
                        key={sub.id}
                        href={sub.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors group"
                      >
                        <PlatformIcon platform={sub.platform} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{sub.dancer_name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{sub.platform}</p>
                        </div>
                        <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{sub.view_count?.toLocaleString() ?? 0}</span>
                          <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{sub.like_count?.toLocaleString() ?? 0}</span>
                          <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" />{sub.comment_count?.toLocaleString() ?? 0}</span>
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              </>
            )}
          </section>

          {/* Related Campaigns */}
          {campaigns.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold mb-6">Active Campaigns</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {campaigns.map((camp) => (
                  <Link
                    key={camp.id}
                    to={`/campaigns/${camp.slug}`}
                    className="block border border-border rounded-xl overflow-hidden hover:bg-muted/40 transition-colors"
                  >
                    {camp.cover_image_url && (
                      <img src={camp.cover_image_url} alt={camp.title} className="w-full h-40 object-cover" />
                    )}
                    <div className="p-4">
                      <p className="font-medium">{camp.title}</p>
                      <p className="text-sm text-muted-foreground">{camp.artist_name}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
