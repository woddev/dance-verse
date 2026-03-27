import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ProducerLayout from "@/components/layout/ProducerLayout";
import { useProducerApi } from "@/hooks/useProducerApi";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import StateBadge from "@/components/deals/StateBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Check, X, RefreshCw, Loader2, PartyPopper, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function OfferDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const api = useProducerApi();
  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [accepted, setAccepted] = useState(false);
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
      setAccepted(true);
      setTimeout(() => navigate("/producer/deals?tab=contracts"), 2500);
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
      navigate("/producer/deals");
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
      navigate("/producer/deals");
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

  // Accepted success animation
  if (accepted) {
    return (
      <ProducerLayout>
        <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in-95 duration-500">
          <div className="h-24 w-24 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mb-6">
            <Check className="h-12 w-12 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Offer Accepted!</h1>
          <p className="text-muted-foreground text-lg">Your contract is being generated. Redirecting…</p>
        </div>
      </ProducerLayout>
    );
  }

  const canAct = offer.status === "sent" || offer.status === "viewed";

  const termItems = [
    { label: "Deal Type", value: offer.deal_type?.replace(/_/g, " ") },
    offer.buyout_amount != null && { label: "Buyout Amount", value: `$${Number(offer.buyout_amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}` },
    offer.producer_split_percent != null && { label: "Your Split", value: `${offer.producer_split_percent}%` },
    offer.platform_split_percent != null && { label: "Platform Split", value: `${offer.platform_split_percent}%` },
    offer.term_length && { label: "Term", value: offer.term_length },
    offer.territory && { label: "Territory", value: offer.territory },
    { label: "Exclusivity", value: offer.exclusivity_flag ? "Yes" : "No" },
    offer.expires_at && { label: "Expires", value: format(new Date(offer.expires_at), "MMM d, yyyy") },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <ProducerLayout>
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate("/producer/offers")}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Offers
      </Button>

      {/* Celebration Header */}
      {canAct && (
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-amber-100 dark:bg-amber-900/30 mb-4">
            <PartyPopper className="h-10 w-10 text-amber-600" />
          </div>
          <h1 className="text-3xl font-bold mb-1">🎉 You Got an Offer!</h1>
          <p className="text-muted-foreground">Review the deal terms for <span className="font-semibold text-foreground">{offer.track_title}</span></p>
        </div>
      )}

      {!canAct && (
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-2xl font-bold">{offer.track_title} — v{offer.version_number}</h1>
          <StateBadge state={offer.status} type="offer" />
        </div>
      )}

      {/* Deal Terms Cards */}
      <div className="max-w-2xl mx-auto">
        <Card className="mb-6">
          <CardContent className="p-6">
            <h3 className="font-semibold flex items-center gap-2 mb-4">
              <Sparkles className="h-4 w-4 text-primary" /> Deal Terms
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {termItems.map((item) => (
                <div key={item.label} className="rounded-lg bg-muted/50 p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{item.label}</p>
                  <p className="text-lg font-semibold capitalize">{item.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {offer.status === "countered" && (
          <div className="p-4 bg-muted rounded-lg border border-border mb-6">
            <p className="text-sm text-muted-foreground">Your counter offer has been submitted. Waiting for the platform to respond.</p>
          </div>
        )}

        {canAct && (
          <div className="flex gap-3">
            <Button size="lg" onClick={handleAccept} disabled={acting} className="flex-1 h-14 text-base">
              {acting ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Check className="h-5 w-5 mr-2" /> Accept Offer</>}
            </Button>
            <Button size="lg" variant="destructive" onClick={handleReject} disabled={acting} className="flex-1 h-14 text-base">
              <X className="h-5 w-5 mr-2" /> Reject
            </Button>
            <Button size="lg" variant="outline" onClick={() => {
              setCounterForm({
                buyout_amount: offer.buyout_amount?.toString() ?? "",
                producer_split_percent: offer.producer_split_percent?.toString() ?? "",
                platform_split_percent: offer.platform_split_percent?.toString() ?? "",
                term_length: offer.term_length ?? "",
                territory: offer.territory ?? "",
              });
              setCounterOpen(true);
            }} disabled={acting} className="flex-1 h-14 text-base">
              <RefreshCw className="h-5 w-5 mr-2" /> Counter
            </Button>
          </div>
        )}
      </div>

      {/* Counter Dialog */}
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
