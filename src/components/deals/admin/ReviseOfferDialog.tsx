import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAdminApi } from "@/hooks/useAdminApi";
import { useToast } from "@/hooks/use-toast";

interface Props {
  offer: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReviseOfferDialog({ offer, onClose, onSuccess }: Props) {
  const { callAdmin } = useAdminApi();
  const { toast } = useToast();
  const [buyoutAmount, setBuyoutAmount] = useState(offer.buyout_amount?.toString() ?? "");
  const [producerSplit, setProducerSplit] = useState(offer.producer_split_percent?.toString() ?? "50");
  const [platformSplit, setPlatformSplit] = useState(offer.platform_split_percent?.toString() ?? "50");
  const [termLength, setTermLength] = useState(offer.term_length ?? "");
  const [territory, setTerritory] = useState(offer.territory ?? "");
  const [exclusivity, setExclusivity] = useState(offer.exclusivity_flag ?? false);
  const [expiresAt, setExpiresAt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const splitValid = offer.deal_type === "buyout" || (Number(producerSplit) + Number(platformSplit) === 100);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await callAdmin("deal-revise-offer", undefined, {
        offer_id: offer.id,
        deal_type: offer.deal_type,
        buyout_amount: offer.deal_type !== "revenue_split" ? Number(buyoutAmount) : null,
        producer_split: offer.deal_type !== "buyout" ? Number(producerSplit) : null,
        platform_split: offer.deal_type !== "buyout" ? Number(platformSplit) : null,
        term_length: termLength || null,
        territory: territory || null,
        exclusivity,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      });
      toast({ title: "Revised offer created and sent" });
      onSuccess();
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
    setSubmitting(false);
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Revise Offer (v{offer.version_number} → v{offer.version_number + 1})</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {offer.deal_type !== "revenue_split" && (
            <div>
              <Label>Buyout Amount ($)</Label>
              <Input type="number" min="0" value={buyoutAmount} onChange={(e) => setBuyoutAmount(e.target.value)} />
            </div>
          )}
          {offer.deal_type !== "buyout" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Producer Split %</Label>
                <Input type="number" min="0" max="100" value={producerSplit} onChange={(e) => {
                  setProducerSplit(e.target.value);
                  setPlatformSplit(String(100 - Number(e.target.value)));
                }} />
              </div>
              <div>
                <Label>Platform Split %</Label>
                <Input type="number" min="0" max="100" value={platformSplit} onChange={(e) => {
                  setPlatformSplit(e.target.value);
                  setProducerSplit(String(100 - Number(e.target.value)));
                }} />
              </div>
              {!splitValid && <p className="text-xs text-destructive col-span-2">Splits must total 100%</p>}
            </div>
          )}
          <div>
            <Label>Term Length</Label>
            <Input value={termLength} onChange={(e) => setTermLength(e.target.value)} />
          </div>
          <div>
            <Label>Territory</Label>
            <Input value={territory} onChange={(e) => setTerritory(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={exclusivity} onCheckedChange={setExclusivity} />
            <Label>Exclusive</Label>
          </div>
          <div>
            <Label>New Expiration Date</Label>
            <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          </div>
          <Button onClick={handleSubmit} disabled={!splitValid || submitting} className="w-full">
            {submitting ? "Revising…" : "Revise & Send"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
