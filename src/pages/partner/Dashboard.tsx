import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PartnerLayout from "@/components/layout/PartnerLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePartnerApi } from "@/hooks/usePartnerApi";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Users, TrendingUp, DollarSign, Copy, QrCode, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QRCodeSVG } from "qrcode.react";

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function PartnerDashboard() {
  const api = usePartnerApi();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);
  const [showQr, setShowQr] = useState(false);

  useEffect(() => {
    api.getOverview().then((data) => {
      if (!data.terms_accepted_at) {
        navigate("/partner/terms", { replace: true });
        return;
      }
      setOverview(data);
      setLoading(false);
    }).catch((e) => {
      toast({ title: "Error loading dashboard", description: e.message, variant: "destructive" });
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <PartnerLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PartnerLayout>
    );
  }

  if (!overview) return null;

  const referralUrl = `https://dance-verse.com/dancer/apply?ref=${overview.referral_code}`;
  const currentPct = (overview.current_rate * 100).toFixed(0);

  const copyUrl = () => {
    navigator.clipboard.writeText(referralUrl);
    toast({ title: "Referral URL copied!" });
  };

  const downloadQr = () => {
    const svg = document.getElementById("partner-qr");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      ctx?.drawImage(img, 0, 0, 512, 512);
      const a = document.createElement("a");
      a.download = `danceverse-referral-${overview.referral_code}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  return (
    <PartnerLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Welcome, {overview.partner_name}</h1>
          <p className="text-muted-foreground text-sm mt-1">Partner Dashboard</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" /> Total Referrals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{overview.total_dancers}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Active (30d)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{overview.active_dancers}</p>
              <p className="text-xs text-muted-foreground">Current tier: {currentPct}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" /> Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{fmt(overview.pending_cents)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" /> Total Earned
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{fmt(overview.paid_cents)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Stripe status */}
        {!overview.stripe_onboarded && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="py-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Stripe not connected</p>
                <p className="text-sm text-muted-foreground">Connect your Stripe account to receive commission payouts.</p>
              </div>
              <Button onClick={() => navigate("/partner/settings")}>
                Connect Stripe
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Referral Link */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Referral Link</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input readOnly value={referralUrl} className="font-mono text-xs" />
              <Button size="icon" variant="outline" onClick={copyUrl} title="Copy URL">
                <Copy className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="outline" onClick={() => setShowQr(true)} title="Show QR Code">
                <QrCode className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Share this link with dancers. Anyone who signs up through it will be automatically linked to you.
            </p>
          </CardContent>
        </Card>

        {/* Commission Tiers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Commission Tiers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[...(overview.commission_tiers ?? [])]
                .sort((a: any, b: any) => a.min_dancers - b.min_dancers)
                .map((tier: any, i: number) => {
                  const isActive = overview.active_dancers >= tier.min_dancers &&
                    (tier.max_dancers === null || overview.active_dancers <= tier.max_dancers);
                  return (
                    <div
                      key={i}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        isActive ? "border-primary bg-primary/5" : "border-border"
                      }`}
                    >
                      <span className="text-sm">
                        {tier.max_dancers
                          ? `${tier.min_dancers}–${tier.max_dancers} active dancers`
                          : `${tier.min_dancers}+ active dancers`}
                      </span>
                      <span className={`font-bold ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                        {(tier.rate * 100).toFixed(0)}%
                      </span>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* QR Modal */}
      <Dialog open={showQr} onOpenChange={setShowQr}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Your Referral QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <QRCodeSVG
              id="partner-qr"
              value={referralUrl}
              size={200}
              level="M"
              includeMargin
              bgColor="transparent"
              fgColor="currentColor"
              className="text-foreground"
            />
            <p className="font-mono text-sm text-muted-foreground">{overview.referral_code}</p>
            <Button variant="outline" className="w-full" onClick={downloadQr}>
              Download QR Code
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PartnerLayout>
  );
}
