import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Music, Hash, Search, Zap, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import CountdownTimer from "@/components/campaign/CountdownTimer";
import type { Tables } from "@/integrations/supabase/types";

type Campaign = Tables<"campaigns">;

function formatPay(payScale: any): string {
  if (!Array.isArray(payScale) || payScale.length === 0) return "—";
  const amounts = payScale.map((p: any) => p.amount_cents ?? p.amount ?? 0);
  const min = Math.min(...amounts);
  const max = Math.max(...amounts);
  const fmt = (v: number) => (v >= 100 ? `$${(v / 100).toFixed(0)}` : `$${v}`);
  if (min === max) return fmt(max);
  return `${fmt(min)}–${fmt(max)}`;
}

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchCampaigns() {
      setLoading(true);
      const { data } = await supabase
        .from("campaigns")
        .select("*")
        .in("status", ["active", "completed"])
        .order("created_at", { ascending: false });
      if (data) setCampaigns(data);
      setLoading(false);
    }
    fetchCampaigns();
  }, []);

  // Sort: active first, completed last
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-6">
          <div className="mb-10">
            <h1 className="text-4xl font-bold">Campaigns</h1>
            <p className="text-muted-foreground mt-2">Browse music campaigns and start creating.</p>
          </div>

          {/* Search */}
          <div className="relative max-w-md mb-8">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by song or artist…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <Skeleton key={i} className="h-72 rounded-xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <Music className="h-14 w-14 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg text-muted-foreground">
                {search ? "No campaigns match your search." : "No active campaigns right now. Check back soon!"}
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filtered.map((campaign) => (
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
                     </div>

                     <CardContent className="p-4 space-y-3">
                       <div>
                         <h3 className="font-semibold text-lg truncate">{campaign.title}</h3>
                         <p className="text-sm text-muted-foreground truncate">{campaign.artist_name}</p>
                       </div>

                        <div className="flex flex-wrap gap-2">
                          {campaign.status === "completed" ? (
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
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
