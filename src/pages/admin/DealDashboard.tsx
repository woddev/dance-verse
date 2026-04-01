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
import DealTracksQueue from "@/components/deals/admin/DealTracksQueue";
import DealOffersList from "@/components/deals/admin/DealOffersList";
import DealContractsList from "@/components/deals/admin/DealContractsList";
import AcceptedTracks from "@/components/deals/admin/AcceptedTracks";
import DeniedTracks from "@/components/deals/admin/DeniedTracks";

const NEW_STATUSES = ["submitted", "under_review"];
const ACCEPTED_STATUSES = ["offer_pending", "offer_sent", "counter_received", "deal_signed", "active"];

export default function DealDashboard() {
  const { callAdmin } = useAdminApi();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [allTracks, setAllTracks] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deniedOpen, setDeniedOpen] = useState(false);

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

  const newTracks = allTracks.filter((t) => NEW_STATUSES.includes(t.status));
  const acceptedTracks = allTracks.filter((t) => ACCEPTED_STATUSES.includes(t.status));
  const deniedTracks = allTracks.filter((t) => t.status === "denied");

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
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Deal Management</h1>

        {/* Music Submissions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              Music Submissions
              {newTracks.length > 0 && (
                <span className="inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-primary text-primary-foreground text-xs">
                  {newTracks.length}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DealTracksQueue
              tracks={newTracks}
              filter={null}
              onFilterChange={() => {}}
              onSelectTrack={(id) => navigate(`/admin/deals/track/${id}`)}
              onRefresh={fetchData}
            />
          </CardContent>
        </Card>

        {/* Accepted Tracks */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Accepted Tracks ({acceptedTracks.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <AcceptedTracks
              tracks={acceptedTracks}
              offers={offers}
              contracts={contracts}
              onSelectTrack={(id) => navigate(`/admin/deals/track/${id}`)}
            />
          </CardContent>
        </Card>

        {/* Offers */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Offers</CardTitle>
          </CardHeader>
          <CardContent>
            <DealOffersList offers={offers} onRefresh={fetchData} />
          </CardContent>
        </Card>

        {/* Contracts */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Contracts</CardTitle>
          </CardHeader>
          <CardContent>
            <DealContractsList contracts={contracts} onRefresh={fetchData} />
          </CardContent>
        </Card>

        {/* Denied Tracks — Collapsible */}
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
