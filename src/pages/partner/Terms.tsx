import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePartnerApi } from "@/hooks/usePartnerApi";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/layout/Navbar";

export default function PartnerTerms() {
  const api = usePartnerApi();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);

  useEffect(() => {
    api.getOverview().then((data) => {
      setOverview(data);
      if (data.terms_accepted_at) {
        navigate("/partner/dashboard", { replace: true });
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleAccept = async () => {
    setSaving(true);
    try {
      await api.acceptTerms();
      toast({ title: "Terms accepted! Welcome to the partner program." });
      navigate("/partner/dashboard");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center pt-32">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 px-4 max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">DanceVerse Partner Program Agreement</CardTitle>
            <p className="text-muted-foreground text-sm mt-1">
              Please review and accept the following terms to access your partner dashboard.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="prose prose-sm max-w-none text-foreground/90 space-y-4">
              <h3 className="text-lg font-semibold text-foreground">1. Program Overview</h3>
              <p>
                The DanceVerse Partner Program allows approved partners to earn commissions
                by referring dance creators to the DanceVerse platform. As a partner, you
                receive a unique referral link and code to share with potential creators.
              </p>

              <h3 className="text-lg font-semibold text-foreground">2. Commission Structure</h3>
              <p>
                Commissions are calculated as a percentage of each approved dancer payout
                for dancers referred by you. Your commission rate is determined by a tiered
                structure based on the number of your referred dancers who are "active"
                (at least one approved submission in the last 30 days).
              </p>
              {overview?.commission_tiers && (
                <div className="bg-muted rounded-lg p-4">
                  <p className="font-medium text-sm mb-2">Your Commission Tiers:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    {[...overview.commission_tiers]
                      .sort((a: any, b: any) => a.min_dancers - b.min_dancers)
                      .map((t: any, i: number) => (
                        <li key={i}>
                          {t.max_dancers
                            ? `${t.min_dancers}–${t.max_dancers} active dancers`
                            : `${t.min_dancers}+ active dancers`}
                          : <strong>{(t.rate * 100).toFixed(0)}% commission</strong>
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              <h3 className="text-lg font-semibold text-foreground">3. Earnings Window</h3>
              <p>
                You earn commissions on referred dancer payouts for a period of 12 months
                from the date the dancer was linked to your account. After this window, the
                referral remains but commissions cease unless renewed.
              </p>

              <h3 className="text-lg font-semibold text-foreground">4. Payment Terms</h3>
              <p>
                Commissions are paid via Stripe Connect. You must connect a valid Stripe
                account to receive payments. Pending commissions are paid after the underlying
                dancer payout has been processed. DanceVerse reserves the right to withhold
                payment in cases of suspected fraud or terms violation.
              </p>

              <h3 className="text-lg font-semibold text-foreground">5. Partner Obligations</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>You will not engage in spam, misleading advertising, or deceptive practices when promoting DanceVerse.</li>
                <li>You will not create fake accounts or artificially inflate referral metrics.</li>
                <li>You will represent DanceVerse accurately and professionally.</li>
                <li>You are responsible for compliance with local laws regarding referral marketing.</li>
              </ul>

              <h3 className="text-lg font-semibold text-foreground">6. Termination</h3>
              <p>
                DanceVerse may suspend or terminate your partner account at any time for
                violation of these terms. Upon termination, pending commissions may be
                forfeited if the termination was due to fraudulent activity.
              </p>

              <h3 className="text-lg font-semibold text-foreground">7. Modifications</h3>
              <p>
                DanceVerse reserves the right to modify commission rates, tier thresholds,
                and program terms with 30 days notice. Continued participation after notice
                constitutes acceptance of modified terms.
              </p>
            </div>

            <div className="border-t border-border pt-6">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="agree-terms"
                  checked={agreed}
                  onCheckedChange={(checked) => setAgreed(checked === true)}
                  className="mt-0.5"
                />
                <label htmlFor="agree-terms" className="text-sm text-foreground leading-snug">
                  I have read and agree to the DanceVerse Partner Program Agreement. I understand
                  the commission structure, payment terms, and my obligations as a partner.
                </label>
              </div>

              <Button
                className="w-full mt-6 h-11 text-base font-semibold"
                onClick={handleAccept}
                disabled={!agreed || saving}
              >
                {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Accepting…</> : "Accept & Continue"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
