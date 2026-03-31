import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import AdminLayout from "@/components/layout/AdminLayout";
import { useAdminApi } from "@/hooks/useAdminApi";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
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
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab") || "submissions";
  const [tab, setTab] = useState(tabFromUrl);

  useEffect(() => { setTab(tabFromUrl); }, [tabFromUrl]);

  const [allTracks, setAllTracks] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="submissions">
              Music Submissions {newTracks.length > 0 && <span className="ml-1.5 inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-primary text-primary-foreground text-xs">{newTracks.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="accepted">Accepted ({acceptedTracks.length})</TabsTrigger>
            <TabsTrigger value="denied">Denied ({deniedTracks.length})</TabsTrigger>
            <TabsTrigger value="offers">Offers</TabsTrigger>
            <TabsTrigger value="contracts">Contracts</TabsTrigger>
          </TabsList>

          <TabsContent value="submissions" className="mt-4">
            <DealTracksQueue
              tracks={newTracks}
              filter={null}
              onFilterChange={() => {}}
              onSelectTrack={(id) => setSelectedTrackId(id)}
              onRefresh={fetchData}
            />
          </TabsContent>

          <TabsContent value="accepted" className="mt-4">
            <AcceptedTracks
              tracks={acceptedTracks}
              offers={offers}
              contracts={contracts}
              onSelectTrack={(id) => setSelectedTrackId(id)}
            />
          </TabsContent>

          <TabsContent value="denied" className="mt-4">
            <DeniedTracks tracks={deniedTracks} onReopen={handleReopen} />
          </TabsContent>

          <TabsContent value="offers" className="mt-4">
            <DealOffersList offers={offers} onRefresh={fetchData} />
          </TabsContent>

          <TabsContent value="contracts" className="mt-4">
            <DealContractsList contracts={contracts} onRefresh={fetchData} />
          </TabsContent>
        </Tabs>

        {selectedTrackId && (
          <TrackReviewPanel
            trackId={selectedTrackId}
            onClose={() => setSelectedTrackId(null)}
            onRefresh={fetchData}
          />
        )}
      </div>
    </AdminLayout>
  );
}
