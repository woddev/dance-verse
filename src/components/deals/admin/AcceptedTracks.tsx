import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StateBadge from "@/components/deals/StateBadge";
import { format } from "date-fns";
import { Eye } from "lucide-react";

interface Props {
  tracks: any[];
  offers: any[];
  contracts: any[];
  onSelectTrack: (id: string) => void;
}

export default function AcceptedTracks({ tracks, offers, contracts, onSelectTrack }: Props) {
  // Match offers/contracts to tracks
  const getTrackOffer = (trackId: string) => offers.find((o) => o.track_id === trackId);
  const getTrackContract = (trackId: string) => contracts.find((c) => {
    const offer = offers.find((o) => o.track_id === trackId);
    return offer && c.offer_id === offer.id;
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{tracks.length} accepted track{tracks.length !== 1 ? "s" : ""}</p>

      {tracks.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">No accepted tracks yet.</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Track Title</TableHead>
                <TableHead>Producer</TableHead>
                <TableHead>Track Status</TableHead>
                <TableHead>Offer Status</TableHead>
                <TableHead>Contract Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tracks.map((t) => {
                const offer = getTrackOffer(t.id);
                const contract = getTrackContract(t.id);
                return (
                  <TableRow key={t.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onSelectTrack(t.id)}>
                    <TableCell className="font-medium">{t.title}</TableCell>
                    <TableCell>{t.producer_name}</TableCell>
                    <TableCell><StateBadge state={t.status} type="track" /></TableCell>
                    <TableCell>
                      {offer ? <StateBadge state={offer.status} type="offer" /> : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {contract ? <StateBadge state={contract.status} type="contract" /> : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(t.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onSelectTrack(t.id); }}>
                        <Eye className="h-4 w-4 mr-1" /> View
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
