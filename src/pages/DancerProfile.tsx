import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Instagram, Youtube, ExternalLink, MapPin, Trophy, Eye, Video } from "lucide-react";
import { cn } from "@/lib/utils";

const TikTokIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={`${className} fill-current`}>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1 0-5.78c.27 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.3 6.34 6.34 0 0 0 9.49 21.64a6.34 6.34 0 0 0 6.34-6.34V8.72a8.26 8.26 0 0 0 3.76.91V6.69Z" />
  </svg>
);

// Map of country keywords to flag emojis
const COUNTRY_FLAGS: Record<string, string> = {
  "united states": "🇺🇸", usa: "🇺🇸", "u.s.": "🇺🇸",
  "united kingdom": "🇬🇧", uk: "🇬🇧", "great britain": "🇬🇧",
  canada: "🇨🇦", mexico: "🇲🇽", brazil: "🇧🇷",
  france: "🇫🇷", germany: "🇩🇪", spain: "🇪🇸", italy: "🇮🇹",
  japan: "🇯🇵", "south korea": "🇰🇷", korea: "🇰🇷",
  china: "🇨🇳", india: "🇮🇳", australia: "🇦🇺",
  nigeria: "🇳🇬", "south africa": "🇿🇦", ghana: "🇬🇭",
  colombia: "🇨🇴", argentina: "🇦🇷", philippines: "🇵🇭",
  netherlands: "🇳🇱", sweden: "🇸🇪", portugal: "🇵🇹",
  russia: "🇷🇺", turkey: "🇹🇷", egypt: "🇪🇬",
  thailand: "🇹🇭", indonesia: "🇮🇩", singapore: "🇸🇬",
  jamaica: "🇯🇲", "puerto rico": "🇵🇷", "dominican republic": "🇩🇴",
  ireland: "🇮🇪", kenya: "🇰🇪", tanzania: "🇹🇿",
  "new zealand": "🇳🇿", belgium: "🇧🇪", switzerland: "🇨🇭",
  austria: "🇦🇹", poland: "🇵🇱", "czech republic": "🇨🇿",
  norway: "🇳🇴", denmark: "🇩🇰", finland: "🇫🇮",
};

function getFlagForLocation(location: string): string {
  const lower = location.toLowerCase();
  for (const [keyword, flag] of Object.entries(COUNTRY_FLAGS)) {
    if (lower.includes(keyword)) return flag;
  }
  return "🌍";
}

function platformIcon(platform: string) {
  const p = platform.toLowerCase();
  if (p === "instagram") return <Instagram className="h-4 w-4" />;
  if (p === "tiktok") return <TikTokIcon className="h-4 w-4" />;
  if (p === "youtube") return <Youtube className="h-4 w-4" />;
  return <ExternalLink className="h-4 w-4" />;
}

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  dance_style: string | null;
  location: string | null;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  youtube_handle: string | null;
}

interface Submission {
  id: string;
  platform: string;
  video_url: string;
  submitted_at: string;
  campaign_title: string;
  artist_name: string;
  cover_image_url: string | null;
}

export default function DancerProfile() {
  const { id } = useParams<{ id: string }>();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["public-profile", id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_profile", { p_dancer_id: id! });
      if (error) throw error;
      return (data as unknown as Profile[])?.[0] ?? null;
    },
    enabled: !!id,
  });

  const { data: submissions = [], isLoading: subsLoading } = useQuery({
    queryKey: ["dancer-submissions", id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_dancer_submissions", { p_dancer_id: id! });
      if (error) throw error;
      return data as unknown as Submission[];
    },
    enabled: !!id,
  });

  // Fetch current month leaderboard to find this dancer's rank
  const now = new Date();
  const { data: leaderboardRank } = useQuery({
    queryKey: ["leaderboard-rank", id, now.getFullYear(), now.getMonth() + 1],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_monthly_leaderboard", {
        p_year: now.getFullYear(),
        p_month: now.getMonth() + 1,
      });
      if (error || !data) return null;
      const entries = data as { dancer_id: string; approved_submissions: number; total_views: number }[];
      const idx = entries.findIndex((e) => e.dancer_id === id);
      if (idx === -1) return null;
      return { rank: idx + 1, ...entries[idx] };
    },
    enabled: !!id,
  });

  const initials = (profile?.full_name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const isLoading = profileLoading || subsLoading;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-12">
        {isLoading ? (
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="h-32 w-32 rounded-full" />
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        ) : !profile ? (
          <div className="text-center py-20">
            <h1 className="text-2xl font-bold mb-2">Creator not found</h1>
            <p className="text-muted-foreground">This profile doesn't exist or is unavailable.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex flex-col items-center text-center gap-4 mb-10">
              <Avatar className="h-32 w-32 border-4 border-border">
                {profile.avatar_url && (
                  <AvatarImage src={profile.avatar_url} alt={profile.full_name || ""} />
                )}
                <AvatarFallback className="text-2xl font-bold bg-muted text-muted-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div>
                <h1 className="text-3xl font-bold">{profile.full_name || "Creator"}</h1>
                {profile.dance_style && (
                  <p className="text-muted-foreground mt-1">{profile.dance_style}</p>
                )}
              </div>

              {profile.bio && (
                <p className="text-muted-foreground max-w-md">{profile.bio}</p>
              )}

              {/* Location */}
              {profile.location && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{getFlagForLocation(profile.location)}</span>
                  <span>{profile.location}</span>
                </div>
              )}

              {/* Leaderboard Badge */}
              {leaderboardRank && (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      "gap-1.5 px-3 py-1 text-sm font-semibold",
                      leaderboardRank.rank === 1 && "border-yellow-500/60 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
                      leaderboardRank.rank === 2 && "border-gray-400/60 bg-gray-300/10 text-gray-600 dark:text-gray-300",
                      leaderboardRank.rank === 3 && "border-amber-600/60 bg-amber-600/10 text-amber-700 dark:text-amber-400",
                      leaderboardRank.rank > 3 && "border-primary/40 bg-primary/5 text-primary"
                    )}
                  >
                    <Trophy className="h-3.5 w-3.5" />
                    #{leaderboardRank.rank} This Month
                  </Badge>
                  <Badge variant="outline" className="gap-1.5 px-3 py-1 text-sm">
                    <Video className="h-3.5 w-3.5" />
                    {leaderboardRank.approved_submissions} posts
                  </Badge>
                  <Badge variant="outline" className="gap-1.5 px-3 py-1 text-sm">
                    <Eye className="h-3.5 w-3.5" />
                    {leaderboardRank.total_views.toLocaleString()} views
                  </Badge>
                </div>
              )}

              <div className="flex items-center gap-4 mt-2">
                {profile.instagram_handle && (
                  <a
                    href={`https://instagram.com/${profile.instagram_handle.replace("@", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-full bg-muted hover:bg-accent text-foreground transition-colors"
                    aria-label="Instagram"
                  >
                    <Instagram className="h-5 w-5" />
                  </a>
                )}
                {profile.tiktok_handle && (
                  <a
                    href={`https://tiktok.com/@${profile.tiktok_handle.replace("@", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-full bg-muted hover:bg-accent text-foreground transition-colors"
                    aria-label="TikTok"
                  >
                    <TikTokIcon />
                  </a>
                )}
                {profile.youtube_handle && (
                  <a
                    href={`https://youtube.com/@${profile.youtube_handle.replace("@", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-full bg-muted hover:bg-accent text-foreground transition-colors"
                    aria-label="YouTube"
                  >
                    <Youtube className="h-5 w-5" />
                  </a>
                )}
              </div>
            </div>

            {/* Latest Posts */}
            {submissions.length > 0 && (
              <section>
                <h2 className="text-xl font-bold mb-4">Latest Posts</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {submissions.map((sub) => (
                    <a
                      key={sub.id}
                      href={sub.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block group"
                    >
                      <Card className="overflow-hidden transition-shadow hover:shadow-md">
                        {sub.cover_image_url && (
                          <div className="aspect-video bg-muted overflow-hidden">
                            <img
                              src={sub.cover_image_url}
                              alt={sub.campaign_title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                        )}
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-1">
                            {platformIcon(sub.platform)}
                            <span className="text-xs font-medium uppercase text-muted-foreground">
                              {sub.platform}
                            </span>
                          </div>
                          <p className="font-semibold text-sm leading-tight">
                            {sub.campaign_title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {sub.artist_name} · {new Date(sub.submitted_at).toLocaleDateString()}
                          </p>
                        </CardContent>
                      </Card>
                    </a>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
