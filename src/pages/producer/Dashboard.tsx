import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ProducerLayout from "@/components/layout/ProducerLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useProducerApi } from "@/hooks/useProducerApi";
import { Skeleton } from "@/components/ui/skeleton";
import StateBadge from "@/components/deals/StateBadge";
import DealActivityFeed from "@/components/deals/DealActivityFeed";
import { Music, Upload, Eye, Sparkles, FileSignature, DollarSign, ArrowRight, Download, XCircle, PartyPopper } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";

const STEPS = [
  { key: "submit", label: "Submit", icon: Upload },
  { key: "review", label: "Under Review", icon: Eye },
  { key: "offer", label: "Offer", icon: Sparkles },
  { key: "contract", label: "Contract", icon: FileSignature },
  { key: "earning", label: "Earning", icon: DollarSign },
];

function getStepIndex(status: string) {
  switch (status) {
    case "draft":
    case "submitted": return 0;
    case "under_review": return 1;
    case "offer_pending":
    case "offer_sent":
    case "counter_received": return 2;
    case "deal_signed": return 3;
    case "active": return 4;
    default: return -1;
  }
}

export default function ProducerDashboard() {
  const api = useProducerApi();
  const navigate = useNavigate();
  const [tracks, setTracks] = useState<any[]>([]);
  const [actionCounts, setActionCounts] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getTracks().then(setTracks),
      api.getActionCounts().then(setActionCounts).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const pendingOffers = actionCounts?.pending_offers ?? 0;
  const fullyExecuted = actionCounts?.fully_executed ?? 0;
  const deniedTracks = tracks.filter((t) => t.status === "denied");
  const activeTracks = tracks.filter((t) => t.status !== "denied");

  if (loading) {
    return (
      <ProducerLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </ProducerLayout>
    );
  }

  return (
    <ProducerLayout>
      <h1 className="text-2xl font-bold mb-6">Producer Dashboard</h1>

      {/* Celebration: You Got an Offer! */}
      {pendingOffers > 0 && (
        <div
          className="mb-6 relative overflow-hidden rounded-2xl p-[2px]"
          style={{ background: "linear-gradient(135deg, hsl(45 100% 60%), hsl(280 80% 60%), hsl(200 90% 55%), hsl(45 100% 60%))", backgroundSize: "300% 300%", animation: "gradient-shift 4s ease infinite" }}
        >
          <div className="bg-background rounded-2xl p-6 flex items-center gap-5">
            <div className="shrink-0 h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
              <PartyPopper className="h-8 w-8 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold">🎉 You Got an Offer!</h2>
              <p className="text-muted-foreground text-sm mt-1">
                You have {pendingOffers} pending offer{pendingOffers > 1 ? "s" : ""}. Review the deal terms and take action.
              </p>
            </div>
            <Button size="lg" onClick={() => navigate("/producer/offers")} className="shrink-0">
              View Offer{pendingOffers > 1 ? "s" : ""} <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Celebration: Deal Signed! */}
      {fullyExecuted > 0 && (
        <div className="mb-6 rounded-2xl border-2 border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 p-6 flex items-center gap-5">
          <div className="shrink-0 h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
            <FileSignature className="h-8 w-8 text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-emerald-800 dark:text-emerald-200">✅ Deal Signed!</h2>
            <p className="text-emerald-700/80 dark:text-emerald-300/80 text-sm mt-1">
              You have {fullyExecuted} fully executed contract{fullyExecuted > 1 ? "s" : ""}. Download your signed agreement.
            </p>
          </div>
          <Button variant="outline" size="lg" onClick={() => navigate("/producer/contracts")} className="shrink-0 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40">
            <Download className="h-4 w-4 mr-2" /> View Contracts
          </Button>
        </div>
      )}

      {/* Denied Tracks */}
      {deniedTracks.length > 0 && (
        <div className="mb-6 space-y-3">
          {deniedTracks.map((t) => (
            <div key={t.id} className="rounded-xl border-2 border-destructive/20 bg-destructive/5 p-5 flex items-center gap-4">
              <XCircle className="h-8 w-8 text-destructive shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{t.title} — <span className="text-destructive">Denied</span></p>
                {t.denial_reason && <p className="text-sm text-muted-foreground mt-1">Reason: {t.denial_reason}</p>}
              </div>
              <Button onClick={() => navigate("/producer/tracks/new")}>Submit Another Track</Button>
            </div>
          ))}
        </div>
      )}

      {/* Track Cards with Progress Pipeline */}
      {activeTracks.length === 0 && deniedTracks.length === 0 ? (
        <Card className="mb-6">
          <CardContent className="py-12 text-center">
            <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">No Tracks Yet</h2>
            <p className="text-muted-foreground mb-6">Submit your first track to get started on your music deal journey.</p>
            <Button size="lg" onClick={() => navigate("/producer/tracks/new")}>
              <Upload className="h-4 w-4 mr-2" /> Submit Your First Track
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 mb-6">
          {activeTracks.map((track) => {
            const stepIdx = getStepIndex(track.status);
            return (
              <Card key={track.id} className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/producer/tracks/${track.id}`)}>
                <CardContent className="p-0">
                  <div className="flex items-stretch">
                    {/* Artwork */}
                    <div className="w-24 h-24 shrink-0 bg-muted flex items-center justify-center">
                      {track.artwork_url ? (
                        <img src={track.artwork_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Music className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>

                    {/* Info + Pipeline */}
                    <div className="flex-1 p-4 min-w-0">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <h3 className="font-semibold truncate">{track.title}</h3>
                          <StateBadge state={track.status} type="track" />
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {format(new Date(track.created_at), "MMM d, yyyy")}
                        </span>
                      </div>

                      {/* Step Pipeline */}
                      <TooltipProvider delayDuration={200}>
                        <div className="flex items-center gap-1">
                          {STEPS.map((step, i) => {
                            const isComplete = i <= stepIdx;
                            const isCurrent = i === stepIdx;
                            return (
                              <div key={step.key} className="flex items-center gap-1 flex-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className={`flex items-center justify-center h-7 w-7 rounded-full shrink-0 transition-colors cursor-default ${isCurrent ? "bg-primary text-primary-foreground ring-2 ring-primary/30" : isComplete ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                                      <step.icon className="h-3.5 w-3.5" />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom" className="text-xs">
                                    {step.label}
                                  </TooltipContent>
                                </Tooltip>
                                {i < STEPS.length - 1 && (
                                  <div className={`h-0.5 flex-1 rounded ${isComplete && i < stepIdx ? "bg-primary/40" : "bg-border"}`} />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </TooltipProvider>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Activity Feed */}
      <DealActivityFeed />

      <style>{`
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </ProducerLayout>
  );
}
