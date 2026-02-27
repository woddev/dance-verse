import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StateBadge from "@/components/deals/StateBadge";
import { useAdminApi } from "@/hooks/useAdminApi";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Check, X, RotateCw } from "lucide-react";
import ReviseOfferDialog from "./ReviseOfferDialog";

interface Props {
  offers: any[];
  onRefresh: () => void;
}

export default function DealOffersList({ offers, onRefresh }: Props) {
  const { callAdmin } = useAdminApi();
  const { toast } = useToast();
  const [acting, setActing] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [reviseOffer, setReviseOffer] = useState<any | null>(null);

  const filtered = offers.filter((o) => {
    if (typeFilter !== "all" && o.deal_type !== typeFilter) return false;
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    return true;
  });

  const handleAcceptCounter = async (offerId: string) => {
    setActing(offerId);
    try {
      await callAdmin("deal-accept-counter", undefined, { offer_id: offerId });
      toast({ title: "Counter accepted" });
      onRefresh();
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
    setActing(null);
  };

  const handleRejectCounter = async (offerId: string) => {
    setActing(offerId);
    try {
      await callAdmin("deal-reject-counter", undefined, { offer_id: offerId });
      toast({ title: "Counter rejected" });
      onRefresh();
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
    setActing(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="buyout">Buyout</SelectItem>
            <SelectItem value="revenue_split">Revenue Split</SelectItem>
            <SelectItem value="hybrid">Hybrid</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="viewed">Viewed</SelectItem>
            <SelectItem value="countered">Countered</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="signed">Signed</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{filtered.length} offers</span>
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">No offers found.</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Track</TableHead>
                <TableHead>Producer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>V#</TableHead>
                <TableHead>Terms</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">{o.track_title}</TableCell>
                  <TableCell>{o.producer_name}</TableCell>
                  <TableCell><Badge variant="outline">{o.deal_type}</Badge></TableCell>
                  <TableCell className="text-center">{o.version_number}</TableCell>
                  <TableCell className="text-sm">
                    {o.buyout_amount ? `$${Number(o.buyout_amount).toLocaleString()}` : ""}
                    {o.producer_split_percent != null && ` ${o.producer_split_percent}/${o.platform_split_percent}`}
                  </TableCell>
                  <TableCell><StateBadge state={o.status} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {o.expires_at ? format(new Date(o.expires_at), "MMM d") : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {/* Show actions for counter offers (draft state from producer counter) */}
                    {o.status === "draft" && o.version_number > 1 && (
                      <div className="flex justify-end gap-1">
                        <Button size="sm" onClick={() => handleAcceptCounter(o.id)} disabled={acting === o.id}>
                          <Check className="h-3.5 w-3.5 mr-1" /> Accept
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setReviseOffer(o)} disabled={acting === o.id}>
                          <RotateCw className="h-3.5 w-3.5 mr-1" /> Revise
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleRejectCounter(o.id)} disabled={acting === o.id}>
                          <X className="h-3.5 w-3.5 mr-1" /> Reject
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {reviseOffer && (
        <ReviseOfferDialog
          offer={reviseOffer}
          onClose={() => setReviseOffer(null)}
          onSuccess={() => { setReviseOffer(null); onRefresh(); }}
        />
      )}
    </div>
  );
}
