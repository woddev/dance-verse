import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Music, Hash, Search, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import CountdownTimer from "@/components/campaign/CountdownTimer";
import type { Tables } from "@/integrations/supabase/types";

type Campaign = Tables<"campaigns">;

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

  const filtered = sorted.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.artist_name.toLowerCase().includes(search.toLowerCase())
  );

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

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by song or artist…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Music className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              {search ? "No campaigns match your search." : "No active campaigns right now. Check back soon!"}
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((campaign) => {
              const isAccepted = acceptedIds.has(campaign.id);
              const isCompleted = campaign.status === "completed";
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
