import { Badge } from "@/components/ui/badge";
import StateBadge from "@/components/deals/StateBadge";
import { format } from "date-fns";
import { Music } from "lucide-react";

interface Props {
  track: any;
  offer?: any;
  contract?: any;
  onClick: () => void;
}

export default function DealTrackCard({ track, offer, contract, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-lg border bg-card p-4 hover:shadow-md hover:border-primary/40 transition-all space-y-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center shrink-0">
            <Music className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold truncate">{track.title}</p>
            <p className="text-xs text-muted-foreground truncate">{track.producer_name}</p>
          </div>
        </div>
        <StateBadge state={track.status} type="track" />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {track.genre && (
          <Badge variant="outline" className="text-xs">
            {track.genre}
          </Badge>
        )}
        {offer && (
          <StateBadge state={offer.status} type="offer" />
        )}
        {contract && (
          <StateBadge state={contract.status} type="contract" />
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {format(new Date(track.created_at), "MMM d, yyyy")}
      </p>
    </button>
  );
}
