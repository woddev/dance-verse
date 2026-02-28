import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ProducerLayout from "@/components/layout/ProducerLayout";
import { useProducerApi } from "@/hooks/useProducerApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import StateBadge from "@/components/deals/StateBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Check, X, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function OfferDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const api = useProducerApi();
  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [counterOpen, setCounterOpen] = useState(false);
  const [counterForm, setCounterForm] = useState({
    buyout_amount: "",
    producer_split_percent: "",
    platform_split_percent: "",
    term_length: "",
    territory: "",
  });

  useEffect(() => {
    if (!id) return;
    api.getOfferDetail(id).then(setOffer).finally(() => setLoading(false));
  }, [id]);

  const handleAccept = async () => {
    if (!id) return;
    setActing(true);
    try {
      await api.acceptOffer(id);
      toast.success("Offer accepted! Contract is being generated...");
      navigate("/producer/contracts");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActing(false);
    }
  };

  const handleReject = async () => {
    if (!id) return;
    setActing(true);
    try {
      await api.rejectOffer(id);
      toast.success("Offer rejected");
      navigate("/producer/offers");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActing(false);
    }
  };

  const handleCounter = async () => {
    if (!id) return;
    setActing(true);
    try {
      await api.counterOffer({
        offer_id: id,
        buyout_amount: counterForm.buyout_amount ? parseFloat(counterForm.buyout_amount) : null,
        producer_split_percent: counterForm.producer_split_percent ? parseFloat(counterForm.producer_split_percent) : null,
        platform_split_percent: counterForm.platform_split_percent ? parseFloat(counterForm.platform_split_percent) : null,
        term_length: counterForm.term_length || null,
        territory: counterForm.territory || null,
      });
      toast.success("Counter offer submitted!");
      setCounterOpen(false);
      navigate("/producer/offers");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return <ProducerLayout><Skeleton className="h-64 w-full" /></ProducerLayout>;
  }

  if (!offer) {
    return <ProducerLayout><p className="text-muted-foreground">Offer not found.</p></ProducerLayout>;
  }

  const canAct = offer.status === "sent" || offer.status === "viewed";

  return (
    <ProducerLayout>
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate("/producer/offers")}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Offers
      </Button>

      <Card className="max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{offer.track_title} — v{offer.version_number}</CardTitle>
            <StateBadge state={offer.status} type="offer" />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <dt className="text-muted-foreground">Deal Type</dt><dd className="capitalize">{offer.deal_type?.replace(/_/g, " ")}</dd>
            {offer.buyout_amount != null && <><dt className="text-muted-foreground">Buyout Amount</dt><dd>${Number(offer.buyout_amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}</dd></>}
            {offer.producer_split_percent != null && <><dt className="text-muted-foreground">Producer Split</dt><dd>{offer.producer_split_percent}%</dd></>}
            {offer.platform_split_percent != null && <><dt className="text-muted-foreground">Platform Split</dt><dd>{offer.platform_split_percent}%</dd></>}
            {offer.term_length && <><dt className="text-muted-foreground">Term</dt><dd>{offer.term_length}</dd></>}
            {offer.territory && <><dt className="text-muted-foreground">Territory</dt><dd>{offer.territory}</dd></>}
            <dt className="text-muted-foreground">Exclusivity</dt><dd>{offer.exclusivity_flag ? "Yes" : "No"}</dd>
            {offer.expires_at && <><dt className="text-muted-foreground">Expires</dt><dd>{format(new Date(offer.expires_at), "MMM d, yyyy")}</dd></>}
            <dt className="text-muted-foreground">Created</dt><dd>{format(new Date(offer.created_at), "MMM d, yyyy")}</dd>
          </dl>

          {offer.status === "countered" && (
            <div className="p-4 bg-muted rounded-lg border border-border">
              <p className="text-sm text-muted-foreground">Your counter offer has been submitted. Waiting for the platform to respond.</p>
            </div>
          )}

          {canAct && (
            <div className="flex gap-3 pt-2">
              <Button onClick={handleAccept} disabled={acting} className="flex-1">
                {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4 mr-1" /> Accept</>}
              </Button>
              <Button variant="destructive" onClick={handleReject} disabled={acting} className="flex-1">
                <X className="h-4 w-4 mr-1" /> Reject
              </Button>
              <Button variant="outline" onClick={() => {
                setCounterForm({
                  buyout_amount: offer.buyout_amount?.toString() ?? "",
                  producer_split_percent: offer.producer_split_percent?.toString() ?? "",
                  platform_split_percent: offer.platform_split_percent?.toString() ?? "",
                  term_length: offer.term_length ?? "",
                  territory: offer.territory ?? "",
                });
                setCounterOpen(true);
              }} disabled={acting} className="flex-1">
                <RefreshCw className="h-4 w-4 mr-1" /> Counter
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={counterOpen} onOpenChange={setCounterOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Submit Counter Offer</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {offer.deal_type === "buyout" && (
              <div className="space-y-1">
                <Label>Buyout Amount ($)</Label>
                <Input type="number" value={counterForm.buyout_amount} onChange={(e) => setCounterForm((f) => ({ ...f, buyout_amount: e.target.value }))} />
              </div>
            )}
            {offer.deal_type !== "buyout" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Producer Split %</Label>
                  <Input type="number" min="0" max="100" value={counterForm.producer_split_percent} onChange={(e) => setCounterForm((f) => ({ ...f, producer_split_percent: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Platform Split %</Label>
                  <Input type="number" min="0" max="100" value={counterForm.platform_split_percent} onChange={(e) => setCounterForm((f) => ({ ...f, platform_split_percent: e.target.value }))} />
                </div>
              </div>
            )}
            <div className="space-y-1">
              <Label>Term Length</Label>
              <Input value={counterForm.term_length} onChange={(e) => setCounterForm((f) => ({ ...f, term_length: e.target.value }))} placeholder="2 years" />
            </div>
            <div className="space-y-1">
              <Label>Territory</Label>
              <Input value={counterForm.territory} onChange={(e) => setCounterForm((f) => ({ ...f, territory: e.target.value }))} placeholder="Worldwide" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCounterOpen(false)}>Cancel</Button>
            <Button onClick={handleCounter} disabled={acting}>
              {acting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Submit Counter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProducerLayout>
  );
}
