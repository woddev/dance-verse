import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Music, Eye, Zap, DollarSign, AlertTriangle, TrendingUp } from "lucide-react";
import DealActionAlerts from "@/components/deals/DealActionAlerts";

interface Props {
  data: {
    total_tracks: number;
    tracks_under_review: number;
    active_deals: number;
    total_revenue: number;
    pending_payout_liability: number;
    approval_rate: number;
    counter_offers_received?: number;
    contracts_awaiting_countersign?: number;
    tracks_submitted?: number;
  } | null;
}

const metrics = [
  { key: "total_tracks", label: "Total Tracks", icon: Music, format: (v: number) => v.toString() },
  { key: "tracks_under_review", label: "Under Review", icon: Eye, format: (v: number) => v.toString() },
  { key: "active_deals", label: "Active Deals", icon: Zap, format: (v: number) => v.toString() },
  { key: "total_revenue", label: "Total Revenue", icon: DollarSign, format: (v: number) => `$${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2 })}` },
  { key: "pending_payout_liability", label: "Pending Payouts", icon: AlertTriangle, format: (v: number) => `$${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2 })}` },
  { key: "approval_rate", label: "Approval Rate", icon: TrendingUp, format: (v: number) => `${v}%` },
];

export default function DealOverview({ data }: Props) {
  if (!data) return null;

  const adminCounts = {
    tracks_submitted: data.tracks_submitted ?? 0,
    counter_offers_received: data.counter_offers_received ?? 0,
    contracts_awaiting_countersign: data.contracts_awaiting_countersign ?? 0,
    pending_payout_liability: data.pending_payout_liability ?? 0,
  };

  const hasAlerts = adminCounts.tracks_submitted > 0 || adminCounts.counter_offers_received > 0 || adminCounts.contracts_awaiting_countersign > 0;

  return (
    <div className="space-y-4">
      {hasAlerts && <DealActionAlerts role="admin" counts={adminCounts} />}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {metrics.map((m) => (
          <Card key={m.key}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{m.label}</CardTitle>
              <m.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{m.format((data as any)[m.key] ?? 0)}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
