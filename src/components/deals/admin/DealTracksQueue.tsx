import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StateBadge from "@/components/deals/StateBadge";
import { format } from "date-fns";
import { Eye } from "lucide-react";

interface Props {
  tracks: any[];
  filter: string | null;
  onFilterChange: (f: string | null) => void;
  onSelectTrack: (id: string) => void;
  onRefresh: () => void;
}

export default function DealTracksQueue({ tracks, onSelectTrack }: Props) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{tracks.length} new submission{tracks.length !== 1 ? "s" : ""}</p>

      {tracks.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">No new submissions to review.</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Track Title</TableHead>
                <TableHead>Producer</TableHead>
                <TableHead>Genre</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tracks.map((t) => (
                <TableRow key={t.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onSelectTrack(t.id)}>
                  <TableCell className="font-medium">{t.title}</TableCell>
                  <TableCell>{t.producer_name}</TableCell>
                  <TableCell><Badge variant="outline">{t.genre ?? "—"}</Badge></TableCell>
                  <TableCell><StateBadge state={t.status} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(t.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onSelectTrack(t.id); }}>
                      <Eye className="h-4 w-4 mr-1" /> Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
