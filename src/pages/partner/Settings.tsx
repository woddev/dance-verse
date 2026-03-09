import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PartnerLayout from "@/components/layout/PartnerLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePartnerApi } from "@/hooks/usePartnerApi";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

export default function PartnerSettings() {
  const api = usePartnerApi();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    api.getOverview().then((data) => {
      if (!data.terms_accepted_at) {
        navigate("/partner/terms", { replace: true });
        return;
      }
      setOverview(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleConnectStripe = async () => {
    setConnecting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${FUNCTION_URL}/create-stripe-account`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ role: "partner" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create Stripe account");
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
      setConnecting(false);
    }
  };

  if (loading) {
    return (
      <PartnerLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PartnerLayout>
    );
  }

  return (
    <PartnerLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your partner account</p>
        </div>

        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{overview?.partner_name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{user?.email}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Referral Code</span>
              <span className="font-mono font-medium">{overview?.referral_code}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Status</span>
              <span className="font-medium capitalize">{overview?.status}</span>
            </div>
          </CardContent>
        </Card>

        {/* Stripe */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payment Setup</CardTitle>
          </CardHeader>
          <CardContent>
            {overview?.stripe_onboarded ? (
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-foreground">Stripe Connected</p>
                  <p className="text-sm text-muted-foreground">Your account is set up to receive commission payouts.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Connect your Stripe account to receive commission payouts. You'll be redirected to Stripe to complete the setup.
                </p>
                <Button onClick={handleConnectStripe} disabled={connecting}>
                  {connecting ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Connecting…</>
                  ) : (
                    <><ExternalLink className="h-4 w-4 mr-2" /> Connect Stripe Account</>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sign Out */}
        <Card>
          <CardContent className="py-4">
            <Button variant="outline" onClick={signOut}>
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </PartnerLayout>
  );
}
