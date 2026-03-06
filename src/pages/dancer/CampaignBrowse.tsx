import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Music, Hash, Search, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import CountdownTimer from "@/components/campaign/CountdownTimer";
import type { Tables } from "@/integrations/supabase/types";

type Campaign = Tables<"campaigns">;

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "shorts", label: "Shorts" },
  { value: "dance_challenge", label: "Dance Challenge" },
  { value: "freestyle", label: "Freestyle" },
  { value: "transition", label: "Transition" },
  { value: "duet", label: "Duet" },
] as const;

const GENRES = [
  { value: "all", label: "All" },
  { value: "hip_hop", label: "Hip Hop" },
  { value: "pop", label: "Pop" },
  { value: "r_and_b", label: "R&B" },
  { value: "afrobeats", label: "Afrobeats" },
  { value: "latin", label: "Latin" },
  { value: "electronic", label: "Electronic" },
  { value: "k_pop", label: "K-Pop" },
  { value: "country", label: "Country" },
  { value: "other", label: "Other" },
] as const;

const CATEGORY_COLORS: Record<string, string> = {
  shorts: "bg-blue-500/80",
  dance_challenge: "bg-purple-500/80",
  freestyle: "bg-orange-500/80",
  transition: "bg-teal-500/80",
  duet: "bg-pink-500/80",
};

const CATEGORY_LABELS: Record<string, string> = {
  shorts: "SHORTS",
  dance_challenge: "CHALLENGE",
  freestyle: "FREESTYLE",
  transition: "TRANSITION",
  duet: "DUET",
};

function formatPay(payScale: any): string {
  if (!Array.isArray(payScale) || payScale.length === 0) return "—";
  const amounts = payScale.map((p: any) => p.amount_cents ?? p.amount ?? 0);
  const min = Math.min(...amounts);
  const max = Math.max(...amounts);
  const fmt = (v: number) => v >= 100 ? `$${(v / 100).toFixed(0)}` : `$${v}`;
  if (min === max) return fmt(max);
  return `${fmt(min)}–${fmt(max)}`;
}

export default function CampaignBrowse() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [genreFilter, setGenreFilter] = useState("all");
  const [accepting, setAccepting] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [campaignsRes, acceptancesRes] = await Promise.all([
        supabase.from("campaigns").select("*").in("status", ["active", "completed"]).order("created_at", { ascending: false }),
        user
          ? supabase.from("campaign_acceptances").select("campaign_id").eq("dancer_id", user.id)
          : Promise.resolve({ data: [] }),
      ]);

      if (campaignsRes.data) setCampaigns(campaignsRes.data);
      if (acceptancesRes.data) {
        setAcceptedIds(new Set(acceptancesRes.data.map((a: any) => a.campaign_id)));
      }
      setLoading(false);
    }
    fetchData();
  }, [user]);

  const handleAccept = async (campaignId: string) => {
    if (!user) return;
    setAccepting(campaignId);
    const { error } = await supabase.rpc("create_assignment", {
      p_campaign_id: campaignId,
      p_user_id: user.id,
    });
    if (!error) {
      setAcceptedIds((prev) => new Set([...prev, campaignId]));
    }
    setAccepting(null);
  };

  const sorted = [...campaigns].sort((a, b) => {
    if (a.status === "active" && b.status !== "active") return -1;
    if (a.status !== "active" && b.status === "active") return 1;
    return 0;
  });

  const filtered = sorted.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.artist_name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || (c as any).category === categoryFilter;
    const matchesGenre = genreFilter === "all" || (c as any).genre === genreFilter;
    return matchesSearch && matchesCategory && matchesGenre;
  });

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-72 rounded-xl" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Browse Campaigns</h1>
          <p className="text-muted-foreground mt-1">Find campaigns that match your style and start earning.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative max-w-xs flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by song or artist…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={genreFilter} onValueChange={setGenreFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Genre" />
            </SelectTrigger>
            <SelectContent>
              {GENRES.map((genre) => (
                <SelectItem key={genre.value} value={genre.value}>{genre.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Music className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              {search || categoryFilter !== "all" || genreFilter !== "all"
                ? "No campaigns match your filters."
                : "No active campaigns right now. Check back soon!"}
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((campaign) => {
              const isAccepted = acceptedIds.has(campaign.id);
              const isCompleted = campaign.status === "completed";
              const category = (campaign as any).category || "shorts";
              return (
                <Link key={campaign.id} to={`/campaigns/${campaign.slug}`} className="group">
                  <Card className="border border-border overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 h-full">
                    {/* Cover */}
                    <div className="aspect-square bg-muted relative overflow-hidden">
                      {campaign.cover_image_url ? (
                        <img
                          src={campaign.cover_image_url}
                          alt={campaign.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music className="h-16 w-16 text-muted-foreground" />
                        </div>
                      )}
                      {/* Category badge */}
                      <span className={`absolute top-3 left-3 ${CATEGORY_COLORS[category] || "bg-muted-foreground/80"} text-white text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full`}>
                        {CATEGORY_LABELS[category] || category.toUpperCase()}
                      </span>
                      {/* Pay overlay */}
                      <div className="absolute bottom-3 left-3 bg-black/80 text-white px-3 py-1 rounded-full text-sm font-bold">
                        {formatPay(campaign.pay_scale)}
                      </div>
                      {isAccepted && (
                        <Badge className="absolute top-3 right-3 bg-primary text-primary-foreground">
                          Accepted
                        </Badge>
                      )}
                    </div>

                    <CardContent className="p-4 space-y-3">
                      <div>
                        <h3 className="font-semibold text-lg truncate">{campaign.title}</h3>
                        <p className="text-sm text-muted-foreground truncate">{campaign.artist_name}</p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {isCompleted ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold bg-muted text-muted-foreground">
                            <CheckCircle className="h-3 w-3" />
                            COMPLETED
                          </span>
                        ) : (
                          <>
                            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-white" style={{ backgroundColor: '#3b7839' }}>
                              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                              ONLY {campaign.max_creators - (campaign as any).accepted_count} SPOTS LEFT
                            </span>
                            {campaign.end_date && (
                              <CountdownTimer endDate={campaign.end_date} />
                            )}
                          </>
                        )}
                      </div>

                      {campaign.required_hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {campaign.required_hashtags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              <Hash className="h-2.5 w-2.5 mr-0.5" />{tag}
                            </Badge>
                          ))}
                          {campaign.required_hashtags.length > 3 && (
                            <Badge variant="outline" className="text-xs">+{campaign.required_hashtags.length - 3}</Badge>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
