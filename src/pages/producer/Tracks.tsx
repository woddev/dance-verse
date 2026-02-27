import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ProducerLayout from "@/components/layout/ProducerLayout";
import { useProducerApi } from "@/hooks/useProducerApi";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import StateBadge from "@/components/deals/StateBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import { format } from "date-fns";

export default function ProducerTracks() {
  const api = useProducerApi();
  const navigate = useNavigate();
  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getTracks().then(setTracks).finally(() => setLoading(false));
  }, []);

  return (
    <ProducerLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Tracks</h1>
        <Button onClick={() => navigate("/producer/tracks/new")}>
          <Plus className="h-4 w-4 mr-2" /> Submit Track
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : tracks.length === 0 ? (
        <p className="text-muted-foreground">No tracks submitted yet.</p>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Deal Type</TableHead>
                <TableHead className="text-right">Earnings</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tracks.map((t) => (
                <TableRow key={t.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/producer/tracks/${t.id}`)}>
                  <TableCell className="font-medium">{t.title}</TableCell>
                  <TableCell>{format(new Date(t.created_at), "MMM d, yyyy")}</TableCell>
                  <TableCell><StateBadge state={t.status} type="track" /></TableCell>
                  <TableCell>{t.deal_type ? <span className="capitalize">{t.deal_type.replace(/_/g, " ")}</span> : <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="text-right">${Number(t.earnings).toLocaleString("en-US", { minimumFractionDigits: 2 })}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </ProducerLayout>
  );
}
