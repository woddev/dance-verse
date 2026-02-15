import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Clock, Music, CheckCircle, XCircle, DollarSign, Play, Check } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Campaign = Tables<"campaigns">;
type Acceptance = Tables<"campaign_acceptances"> & { campaigns: Campaign };
type Submission = Tables<"submissions"> & { campaigns: Pick<Campaign, "title" | "artist_name" | "cover_image_url"> };

function daysLeft(deadline: string) {
  const diff = new Date(deadline).getTime() - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return days;
}

function formatPay(payScale: any): string {
  if (!Array.isArray(payScale) || payScale.length === 0) return "—";
  const sorted = [...payScale].sort((a: any, b: any) => (a.amount ?? 0) - (b.amount ?? 0));
  const min = sorted[0]?.amount ?? 0;
  const max = sorted[sorted.length - 1]?.amount ?? 0;
  if (min === max) return `$${min}`;
  return `$${min}–$${max}`;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }> = {
  pending: { label: "Submitted", variant: "secondary", icon: Clock },
  approved: { label: "Approved", variant: "default", icon: CheckCircle },
  rejected: { label: "Rejected", variant: "destructive", icon: XCircle },
};

export default function DancerDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [acceptances, setAcceptances] = useState<Acceptance[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [justAccepted, setJustAccepted] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      const [campaignsRes, acceptancesRes, submissionsRes] = await Promise.all([
        supabase
          .from("campaigns")
          .select("*")
          .eq("status", "active")
          .order("created_at", { ascending: false }),
        supabase
          .from("campaign_acceptances")
          .select("*, campaigns(*)")
          .eq("dancer_id", user!.id)
          .in("status", ["accepted", "submitted"])
          .order("accepted_at", { ascending: false }),
        supabase
          .from("submissions")
          .select("*, campaigns(title, artist_name, cover_image_url)")
          .eq("dancer_id", user!.id)
          .order("submitted_at", { ascending: false })
          .limit(10),
      ]);

      if (campaignsRes.data) setCampaigns(campaignsRes.data);
      if (acceptancesRes.data) {
        setAcceptances(acceptancesRes.data as Acceptance[]);
        setAcceptedIds(new Set(acceptancesRes.data.map((a) => a.campaign_id)));
      }
      if (submissionsRes.data) setSubmissions(submissionsRes.data as Submission[]);
      setLoading(false);
    }

    fetchData();
  }, [user]);

  const handleAccept = async (campaignId: string) => {
    if (!user) return;
    setAccepting(campaignId);

    const { data, error } = await supabase.rpc("create_assignment", {
      p_campaign_id: campaignId,
      p_user_id: user.id,
    });

    if (error) {
      toast({
        title: "Could not accept campaign",
        description: error.message,
        variant: "destructive",
      });
      setAccepting(null);
      return;
    }

    // Fetch the newly created acceptance with campaign data
    const { data: acceptance } = await supabase
      .from("campaign_acceptances")
      .select("*, campaigns(*)")
      .eq("id", data)
      .single();

    if (acceptance) {
      setAcceptances((prev) => [acceptance as Acceptance, ...prev]);
      setAcceptedIds((prev) => new Set(prev).add(campaignId));
    }

    setJustAccepted(campaignId);
    toast({ title: "Campaign accepted!", description: "Check My Active Campaigns below." });
    setTimeout(() => setJustAccepted(null), 2000);
    setAccepting(null);
  };

  const availableCampaigns = campaigns.filter((c) => !acceptedIds.has(c.id));

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-8">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-10">
        {/* Available Campaigns */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Available Campaigns</h2>
          {availableCampaigns.length === 0 ? (
            <p className="text-muted-foreground">No new campaigns available right now.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableCampaigns.map((campaign) => (
                <Card key={campaign.id} className="overflow-hidden border border-border">
                  <div className="aspect-square relative bg-muted">
                    {campaign.cover_image_url ? (
                      <img
                        src={campaign.cover_image_url}
                        alt={campaign.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <p className="font-semibold text-lg leading-tight">{campaign.title}</p>
                      <p className="text-sm text-muted-foreground">{campaign.artist_name}</p>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <DollarSign className="h-3.5 w-3.5" />
                        {formatPay(campaign.pay_scale)}
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {campaign.due_days_after_accept}d
                      </span>
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => handleAccept(campaign.id)}
                      disabled={accepting === campaign.id || justAccepted === campaign.id}
                      variant={justAccepted === campaign.id ? "outline" : "default"}
                    >
                      {accepting === campaign.id ? (
                        <span className="flex items-center gap-2">
                          <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                          Accepting…
                        </span>
                      ) : justAccepted === campaign.id ? (
                        <span className="flex items-center gap-2">
                          <Check className="h-4 w-4" />
                          Accepted!
                        </span>
                      ) : (
                        "Accept Campaign"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* My Active Campaigns */}
        <section>
          <h2 className="text-2xl font-bold mb-4">My Active Campaigns</h2>
          {acceptances.length === 0 ? (
            <p className="text-muted-foreground">You haven't accepted any campaigns yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {acceptances.map((acceptance) => {
                const campaign = acceptance.campaigns;
                const remaining = daysLeft(acceptance.deadline);
                const isCampaignCompleted = campaign.status === "completed";
                const isOverdue = remaining <= 0 || isCampaignCompleted;

                return (
                  <Link key={acceptance.id} to={`/dancer/campaigns/${campaign.id}`}>
                    <Card className="overflow-hidden border border-border hover:shadow-md transition-shadow cursor-pointer">
                      <div className="aspect-video relative bg-muted">
                        {campaign.cover_image_url ? (
                          <img
                            src={campaign.cover_image_url}
                            alt={campaign.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Music className="h-10 w-10 text-muted-foreground" />
                          </div>
                        )}
                        <div className={`absolute top-2 right-2 px-2 py-1 rounded-md text-xs font-semibold ${isOverdue ? "bg-muted text-muted-foreground" : "bg-background/90 text-foreground"}`}>
                          {isCampaignCompleted ? "Completed" : isOverdue ? "Overdue" : `${remaining}d left`}
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <p className="font-semibold">{campaign.title}</p>
                        <p className="text-sm text-muted-foreground">{campaign.artist_name}</p>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* My Submissions */}
        <section>
          <h2 className="text-2xl font-bold mb-4">My Submissions</h2>
          {submissions.length === 0 ? (
            <p className="text-muted-foreground">You haven't submitted any videos yet.</p>
          ) : (
            <div className="space-y-3">
              {submissions.map((submission) => {
                const campaign = submission.campaigns;
                const cfg = statusConfig[submission.review_status] ?? statusConfig.pending;
                const StatusIcon = cfg.icon;

                return (
                  <Card key={submission.id} className="border border-border">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="h-12 w-12 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
                        {campaign?.cover_image_url ? (
                          <img src={campaign.cover_image_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Play className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{campaign?.title ?? "Campaign"}</p>
                        <p className="text-xs text-muted-foreground">{campaign?.artist_name} · {submission.platform}</p>
                      </div>
                      <Badge variant={cfg.variant} className="flex items-center gap-1">
                        <StatusIcon className="h-3 w-3" />
                        {cfg.label}
                      </Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
