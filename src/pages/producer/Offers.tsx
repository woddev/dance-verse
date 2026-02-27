import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ProducerLayout from "@/components/layout/ProducerLayout";
import { useProducerApi } from "@/hooks/useProducerApi";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StateBadge from "@/components/deals/StateBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function ProducerOffers() {
  const api = useProducerApi();
  const navigate = useNavigate();
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getOffers().then(setOffers).finally(() => setLoading(false));
  }, []);

  return (
    <ProducerLayout>
      <h1 className="text-2xl font-bold mb-6">Offers</h1>
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : offers.length === 0 ? (
        <p className="text-muted-foreground">No offers yet.</p>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Track</TableHead>
                <TableHead>Deal Type</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expires</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {offers.map((o) => (
                <TableRow key={o.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/producer/offers/${o.id}`)}>
                  <TableCell className="font-medium">{o.track_title}</TableCell>
                  <TableCell className="capitalize">{o.deal_type?.replace(/_/g, " ") ?? "—"}</TableCell>
                  <TableCell>v{o.version_number}</TableCell>
                  <TableCell><StateBadge state={o.status} type="offer" /></TableCell>
                  <TableCell>{o.expires_at ? format(new Date(o.expires_at), "MMM d, yyyy") : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </ProducerLayout>
  );
}
