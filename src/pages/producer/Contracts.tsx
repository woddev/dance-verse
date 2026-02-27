import { useEffect, useState } from "react";
import ProducerLayout from "@/components/layout/ProducerLayout";
import { useProducerApi } from "@/hooks/useProducerApi";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import StateBadge from "@/components/deals/StateBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Download } from "lucide-react";
import { format } from "date-fns";

export default function ProducerContracts() {
  const api = useProducerApi();
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getContracts().then(setContracts).finally(() => setLoading(false));
  }, []);

  return (
    <ProducerLayout>
      <h1 className="text-2xl font-bold mb-6">Contracts</h1>
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : contracts.length === 0 ? (
        <p className="text-muted-foreground">No contracts yet.</p>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Track</TableHead>
                <TableHead>Offer Version</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Signed</TableHead>
                <TableHead>PDF</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.track_title}</TableCell>
                  <TableCell>v{c.offer_version}</TableCell>
                  <TableCell><StateBadge state={c.status} type="contract" /></TableCell>
                  <TableCell>{c.producer_signed_at ? format(new Date(c.producer_signed_at), "MMM d, yyyy") : "—"}</TableCell>
                  <TableCell>
                    {c.pdf_url ? (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={c.pdf_url} target="_blank" rel="noopener noreferrer"><Download className="h-4 w-4" /></a>
                      </Button>
                    ) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </ProducerLayout>
  );
}
