import { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useAdminApi } from "@/hooks/useAdminApi";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import DealOverview from "@/components/deals/admin/DealOverview";
import DealTracksQueue from "@/components/deals/admin/DealTracksQueue";
import DealOffersList from "@/components/deals/admin/DealOffersList";
import DealRevenueMonitor from "@/components/deals/admin/DealRevenueMonitor";
import DealContractsList from "@/components/deals/admin/DealContractsList";
import TrackReviewPanel from "@/components/deals/admin/TrackReviewPanel";

export default function DealDashboard() {
  const { callAdmin } = useAdminApi();
  const { toast } = useToast();
  const [tab, setTab] = useState("overview");
  const [overview, setOverview] = useState<any>(null);
  const [tracks, setTracks] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [revenue, setRevenue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [trackFilter, setTrackFilter] = useState<string | null>(null);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, tr, of, con, rev] = await Promise.all([
        callAdmin("deal-overview"),
        callAdmin("deal-tracks", trackFilter ? { status: trackFilter } : undefined),
        callAdmin("deal-offers"),
        callAdmin("deal-contracts"),
        callAdmin("deal-revenue"),
      ]);
      setOverview(ov);
      setTracks(tr);
      setOffers(of);
      setContracts(con);
      setRevenue(rev);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setLoading(false);
  }, [callAdmin, toast, trackFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading && !overview) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
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
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tracks">Submissions Queue</TabsTrigger>
            <TabsTrigger value="offers">Offers</TabsTrigger>
            <TabsTrigger value="contracts">Contracts</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <DealOverview data={overview} />
          </TabsContent>

          <TabsContent value="tracks" className="mt-4">
            <DealTracksQueue
              tracks={tracks}
              filter={trackFilter}
              onFilterChange={(f) => setTrackFilter(f)}
              onSelectTrack={(id) => setSelectedTrackId(id)}
              onRefresh={fetchData}
            />
          </TabsContent>

          <TabsContent value="contracts" className="mt-4">
            <DealContractsList contracts={contracts} onRefresh={fetchData} />
          </TabsContent>

          <TabsContent value="offers" className="mt-4">
            <DealOffersList offers={offers} onRefresh={fetchData} />
          </TabsContent>

          <TabsContent value="revenue" className="mt-4">
            <DealRevenueMonitor revenue={revenue} />
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
