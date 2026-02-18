import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, ExternalLink, CreditCard, Loader2 } from "lucide-react";
import AvatarUpload from "@/components/settings/AvatarUpload";

export default function DancerSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    bio: "",
    instagram_handle: "",
    tiktok_handle: "",
    youtube_handle: "",
  });

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) {
        // Sync Stripe status if they have an account but aren't marked onboarded
        if (data.stripe_account_id && !data.stripe_onboarded) {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
              const res = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-stripe-status`,
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${session.access_token}`,
                    "Content-Type": "application/json",
                    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                  },
                }
              );
              if (res.ok) {
                const { onboarded } = await res.json();
                if (onboarded) {
                  data.stripe_onboarded = true;
                }
              }
            }
          } catch (e) {
            console.error("Failed to check Stripe status:", e);
          }
        }

        setProfile(data);
        setForm({
          full_name: data.full_name ?? "",
          bio: data.bio ?? "",
          instagram_handle: data.instagram_handle ?? "",
          tiktok_handle: data.tiktok_handle ?? "",
          youtube_handle: data.youtube_handle ?? "",
        });
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update(form)
        .eq("id", user.id);

      if (error) throw error;
      toast({ title: "Profile updated" });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const handleStripeOnboarding = async () => {
    setStripeLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-stripe-account`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            return_url: window.location.href,
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed" }));
        throw new Error(err.error ?? "Failed");
      }

      const { url } = await res.json();
      window.location.href = url;
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
      setStripeLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <h1 className="text-3xl font-bold">Settings</h1>

        {/* Profile */}
        <Card className="border border-border">
          <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <AvatarUpload
              userId={profile?.id}
              avatarUrl={profile?.avatar_url}
              fullName={form.full_name}
              onUploaded={(url) => setProfile((p: any) => ({ ...p, avatar_url: url }))}
            />
            <div className="space-y-1">
              <Label>Full Name</Label>
              <Input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Bio</Label>
              <Textarea value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Instagram</Label>
                <Input placeholder="@handle" value={form.instagram_handle} onChange={(e) => setForm((f) => ({ ...f, instagram_handle: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>TikTok</Label>
                <Input placeholder="@handle" value={form.tiktok_handle} onChange={(e) => setForm((f) => ({ ...f, tiktok_handle: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>YouTube</Label>
                <Input placeholder="@handle" value={form.youtube_handle} onChange={(e) => setForm((f) => ({ ...f, youtube_handle: e.target.value }))} />
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save Profile"}
            </Button>
          </CardContent>
        </Card>

        {/* Stripe Connect */}
        <Card className="border border-border">
          <CardHeader><CardTitle>Payment Setup</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {profile?.stripe_onboarded ? (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium">Stripe Connected</p>
                  <p className="text-sm text-muted-foreground">
                    Your account is set up to receive payouts.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Connect your Stripe account to receive payments for approved dance submissions.
                  You'll be redirected to Stripe to complete the setup.
                </p>
                <Button onClick={handleStripeOnboarding} disabled={stripeLoading}>
                  {stripeLoading ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Connecting…</>
                  ) : (
                    <><CreditCard className="h-4 w-4 mr-2" /> {profile?.stripe_account_id ? "Continue Stripe Setup" : "Connect Stripe Account"}</>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
