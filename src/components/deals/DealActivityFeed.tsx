import { useEffect, useState } from "react";
import { useProducerApi } from "@/hooks/useProducerApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Music, FileText, FileCheck, DollarSign, Clock } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";

interface FeedItem {
  id: string;
  icon: React.ElementType;
  label: string;
  detail: string;
  time: string;
  color: string;
}

export default function DealActivityFeed() {
  const api = useProducerApi();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [tracks, offers, contracts] = await Promise.all([
          api.getTracks(),
          api.getOffers(),
          api.getContracts(),
        ]);

        const feed: FeedItem[] = [];

        (tracks ?? []).slice(0, 5).forEach((t: any) => {
          feed.push({
            id: `t-${t.id}`,
            icon: Music,
            label: "Track Submitted",
            detail: t.title,
            time: t.created_at,
            color: "text-blue-500",
          });
        });

        (offers ?? []).slice(0, 5).forEach((o: any) => {
          const statusLabels: Record<string, string> = {
            sent: "Offer Received",
            accepted: "Offer Accepted",
            rejected: "Offer Rejected",
            countered: "Counter-Offer Sent",
            revised: "Offer Revised",
          };
          feed.push({
            id: `o-${o.id}`,
            icon: FileText,
            label: statusLabels[o.status] ?? `Offer ${o.status}`,
            detail: o.track_title,
            time: o.created_at,
            color: o.status === "accepted" ? "text-green-500" : o.status === "rejected" ? "text-red-500" : "text-amber-500",
          });
        });

        (contracts ?? []).slice(0, 5).forEach((c: any) => {
          const statusLabels: Record<string, string> = {
            sent_for_signature: "Contract Ready to Sign",
            signed_by_producer: "Contract Signed by You",
            fully_executed: "Contract Fully Executed",
          };
          feed.push({
            id: `c-${c.id}`,
            icon: FileCheck,
            label: statusLabels[c.status] ?? `Contract ${c.status}`,
            detail: c.track_title,
            time: c.created_at,
            color: c.status === "fully_executed" ? "text-green-500" : "text-primary",
          });
        });

        feed.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
        setItems(feed.slice(0, 10));
      } catch {
        // silently fail
      }
      setLoading(false);
    }
    load();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-4 w-4" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 rounded" />)}
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No deal activity yet.</p>
        ) : (
          <div className="space-y-1">
            {items.map((item) => (
              <div key={item.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                <item.icon className={`h-4 w-4 mt-0.5 shrink-0 ${item.color}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-tight">{item.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.detail}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(parseISO(item.time), { addSuffix: true })}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
