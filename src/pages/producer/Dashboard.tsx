import { useEffect, useState } from "react";
import ProducerLayout from "@/components/layout/ProducerLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProducerApi } from "@/hooks/useProducerApi";
import { Music, Eye, Handshake, DollarSign, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import DealActionAlerts from "@/components/deals/DealActionAlerts";
import DealActivityFeed from "@/components/deals/DealActivityFeed";

export default function ProducerDashboard() {
  const api = useProducerApi();
  const [stats, setStats] = useState<any>(null);
  const [actionCounts, setActionCounts] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getOverview().then(setStats),
      api.getActionCounts().then(setActionCounts).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const cards = [
    { label: "Total Tracks", value: stats?.total_tracks ?? 0, icon: Music },
    { label: "Under Review", value: stats?.tracks_under_review ?? 0, icon: Eye },
    { label: "Active Deals", value: stats?.active_deals ?? 0, icon: Handshake },
    { label: "Total Earned", value: `$${Number(stats?.total_earned ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`, icon: DollarSign },
    { label: "Pending Earnings", value: `$${Number(stats?.pending_earnings ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`, icon: Clock },
  ];

  return (
    <ProducerLayout>
      <h1 className="text-2xl font-bold mb-6">Producer Dashboard</h1>

      {actionCounts && <div className="mb-6"><DealActionAlerts role="producer" counts={actionCounts} /></div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
              <c.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-8 w-20" /> : <div className="text-2xl font-bold">{c.value}</div>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6">
        <DealActivityFeed />
      </div>
    </ProducerLayout>
  );
}
