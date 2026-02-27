import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAdminApi } from "@/hooks/useAdminApi";
import { useToast } from "@/hooks/use-toast";

interface Props {
  trackId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateOfferDialog({ trackId, onClose, onSuccess }: Props) {
  const { callAdmin } = useAdminApi();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [dealType, setDealType] = useState("revenue_split");
  const [buyoutAmount, setBuyoutAmount] = useState("");
  const [marketingBudget, setMarketingBudget] = useState("");
  const [producerSplit, setProducerSplit] = useState("50");
  const [platformSplit, setPlatformSplit] = useState("50");
  const [termLength, setTermLength] = useState("1 year");
  const [territory, setTerritory] = useState("Worldwide");
  const [exclusivity, setExclusivity] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const splitValid = dealType === "buyout" || (Number(producerSplit) + Number(platformSplit) === 100);
  const buyoutValid = dealType === "revenue_split" || (Number(buyoutAmount) > 0);
  const marketingValid = dealType !== "recoupment" || (Number(marketingBudget) > 0);
  const expiresValid = !!expiresAt;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await callAdmin("deal-create-offer", undefined, {
        track_id: trackId,
        deal_type: dealType,
        buyout_amount: dealType !== "revenue_split" ? Number(buyoutAmount) : null,
        producer_split: dealType !== "buyout" ? Number(producerSplit) : null,
        platform_split: dealType !== "buyout" ? Number(platformSplit) : null,
        marketing_budget: dealType === "recoupment" ? Number(marketingBudget) : null,
        term_length: termLength || null,
        territory: territory || null,
        exclusivity,
        expires_at: new Date(expiresAt).toISOString(),
      });
      toast({ title: "Offer created and sent" });
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
          <DialogTitle>Create Offer — Step {step}/3</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <Label>Deal Type</Label>
            <Select value={dealType} onValueChange={setDealType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="buyout">Buyout</SelectItem>
                <SelectItem value="revenue_split">Revenue Split</SelectItem>
                <SelectItem value="recoupment">Recoupment</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setStep(2)} className="w-full">Next</Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            {(dealType === "buyout" || dealType === "recoupment") && (
              <div>
                <Label>Buyout Amount ($)</Label>
                <Input type="number" min="0" value={buyoutAmount} onChange={(e) => setBuyoutAmount(e.target.value)} />
              </div>
            )}
            {dealType === "recoupment" && (
              <div>
                <Label>Marketing Budget ($)</Label>
                <Input type="number" min="0" value={marketingBudget} onChange={(e) => setMarketingBudget(e.target.value)} placeholder="Amount to recoup before splits" />
              </div>
            )}
            {(dealType === "revenue_split" || dealType === "recoupment") && (
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
              <Select value={termLength} onValueChange={setTermLength}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1 year">1 Year</SelectItem>
                  <SelectItem value="2 years">2 Years</SelectItem>
                  <SelectItem value="3 years">3 Years</SelectItem>
                  <SelectItem value="5 years">5 Years</SelectItem>
                  <SelectItem value="In perpetuity">In Perpetuity</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Territory</Label>
              <Input value={territory} onChange={(e) => setTerritory(e.target.value)} placeholder="e.g. Worldwide" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={exclusivity} onCheckedChange={setExclusivity} />
              <Label>Exclusive Deal</Label>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => setStep(3)} disabled={!splitValid || !buyoutValid || !marketingValid} className="flex-1">Next</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <Label>Expiration Date</Label>
              <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={handleSubmit} disabled={!expiresValid || submitting} className="flex-1">
                {submitting ? "Creating…" : "Create & Send Offer"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
