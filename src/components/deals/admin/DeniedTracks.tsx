import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StateBadge from "@/components/deals/StateBadge";
import { format } from "date-fns";
import { RotateCcw } from "lucide-react";

interface Props {
  tracks: any[];
  onReopen?: (id: string) => void;
}

export default function DeniedTracks({ tracks, onReopen }: Props) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{tracks.length} denied track{tracks.length !== 1 ? "s" : ""}</p>

      {tracks.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">No denied tracks.</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Track Title</TableHead>
                <TableHead>Producer</TableHead>
                <TableHead>Denial Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                {onReopen && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {tracks.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.title}</TableCell>
                  <TableCell>{t.producer_name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{t.denial_reason || "—"}</TableCell>
                  <TableCell><StateBadge state={t.status} type="track" /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(t.created_at), "MMM d, yyyy")}
                  </TableCell>
                  {onReopen && (
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => onReopen(t.id)}>
                        <RotateCcw className="h-4 w-4 mr-1" /> Reopen
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
