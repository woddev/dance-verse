import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/layout/AdminLayout";
import { useAdminApi } from "@/hooks/useAdminApi";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";
import DealPipelineBar from "@/components/deals/admin/DealPipelineBar";
import DealTrackCard from "@/components/deals/admin/DealTrackCard";
import DealContractsList from "@/components/deals/admin/DealContractsList";
import DeniedTracks from "@/components/deals/admin/DeniedTracks";

const STAGES = [
  { key: "new", label: "New", statuses: ["submitted", "under_review"], color: "bg-blue-500" },
  { key: "offer", label: "Offer Sent", statuses: ["offer_pending", "offer_sent"], color: "bg-purple-500" },
  { key: "negotiating", label: "Negotiating", statuses: ["counter_received"], color: "bg-orange-500" },
  { key: "signing", label: "Signing", statuses: ["deal_signed"], color: "bg-emerald-500" },
  { key: "active", label: "Active", statuses: ["active"], color: "bg-green-500" },
];

export default function DealDashboard() {
  const { callAdmin } = useAdminApi();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [allTracks, setAllTracks] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState<string | null>(null);
  const [deniedOpen, setDeniedOpen] = useState(false);
  const [contractsOpen, setContractsOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tr, of, con] = await Promise.all([
        callAdmin("deal-tracks"),
        callAdmin("deal-offers"),
        callAdmin("deal-contracts"),
      ]);
      setAllTracks(tr);
      setOffers(of);
      setContracts(con);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setLoading(false);
  }, [callAdmin, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const deniedTracks = allTracks.filter((t) => t.status === "denied");
  const pipelineTracks = allTracks.filter((t) => t.status !== "denied");

  const stagesWithCounts = STAGES.map((s) => ({
    ...s,
    count: pipelineTracks.filter((t) => s.statuses.includes(t.status)).length,
  }));

  const filteredTracks = activeStage
    ? pipelineTracks.filter((t) => STAGES.find((s) => s.key === activeStage)?.statuses.includes(t.status))
    : pipelineTracks;

  const getLatestOffer = (trackId: string) =>
    offers.filter((o) => o.track_id === trackId).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

  const getLatestContract = (trackId: string) => {
    const trackOffers = offers.filter((o) => o.track_id === trackId);
    const offerIds = trackOffers.map((o: any) => o.id);
    return contracts.filter((c) => offerIds.includes(c.offer_id)).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
  };

  const handleReopen = async (trackId: string) => {
    try {
      await callAdmin("reopen-track", { track_id: trackId });
      toast({ title: "Track reopened" });
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (loading && allTracks.length === 0) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Deal Management</h1>

        <DealPipelineBar stages={stagesWithCounts} active={activeStage} onSelect={setActiveStage} />

        {/* Track Cards */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">
              {activeStage ? STAGES.find((s) => s.key === activeStage)?.label : "All Tracks"}
              <span className="text-muted-foreground font-normal ml-2">({filteredTracks.length})</span>
            </h2>
            {activeStage && (
              <Button variant="ghost" size="sm" onClick={() => setActiveStage(null)}>
                Show All
              </Button>
            )}
          </div>

          {filteredTracks.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                {activeStage ? "No tracks in this stage." : "No tracks in the pipeline yet."}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredTracks.map((t) => (
                <DealTrackCard
                  key={t.id}
                  track={t}
                  offer={getLatestOffer(t.id)}
                  contract={getLatestContract(t.id)}
                  onClick={() => navigate(`/admin/deals/track/${t.id}`)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Signed Contracts */}
        <Collapsible open={contractsOpen} onOpenChange={setContractsOpen}>
          <Card>
            <CardHeader className="pb-3">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                  <CardTitle className="text-lg">Signed Contracts</CardTitle>
                  {contractsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent>
                <DealContractsList contracts={contracts} onRefresh={fetchData} />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Denied Tracks */}
        <Collapsible open={deniedOpen} onOpenChange={setDeniedOpen}>
          <Card>
            <CardHeader className="pb-3">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                  <CardTitle className="text-lg">Denied Tracks ({deniedTracks.length})</CardTitle>
                  {deniedOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent>
                <DeniedTracks tracks={deniedTracks} onReopen={handleReopen} />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>
    </AdminLayout>
  );
}
