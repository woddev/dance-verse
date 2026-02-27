import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StateBadge from "@/components/deals/StateBadge";
import { format } from "date-fns";
import { Eye } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "all", label: "All States" },
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "Under Review" },
  { value: "denied", label: "Denied" },
  { value: "offer_pending", label: "Offer Pending" },
  { value: "offer_sent", label: "Offer Sent" },
  { value: "counter_received", label: "Counter Received" },
  { value: "deal_signed", label: "Deal Signed" },
  { value: "active", label: "Active" },
];

interface Props {
  tracks: any[];
  filter: string | null;
  onFilterChange: (f: string | null) => void;
  onSelectTrack: (id: string) => void;
  onRefresh: () => void;
}

export default function DealTracksQueue({ tracks, filter, onFilterChange, onSelectTrack }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={filter ?? "all"} onValueChange={(v) => onFilterChange(v === "all" ? null : v)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{tracks.length} tracks</span>
      </div>

      {tracks.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">No tracks found.</p>
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
