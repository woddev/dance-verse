import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, ExternalLink, CreditCard, Loader2, AlertCircle, Clock } from "lucide-react";
import AvatarUpload from "@/components/settings/AvatarUpload";
import { LocationAutocomplete } from "@/components/ui/location-autocomplete";

export default function DancerSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    bio: "",
    dance_style: "",
    location: "",
    years_experience: "",
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
          dance_style: data.dance_style ?? "",
          location: data.location ?? "",
          years_experience: data.years_experience?.toString() ?? "",
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
        .update({
          full_name: form.full_name || null,
          bio: form.bio || null,
          dance_style: form.dance_style || null,
          location: form.location || null,
          years_experience: form.years_experience ? parseInt(form.years_experience) : null,
          instagram_handle: form.instagram_handle || null,
          tiktok_handle: form.tiktok_handle || null,
          youtube_handle: form.youtube_handle || null,
        })
        .eq("id", user.id);

      if (error) throw error;
      toast({ title: "Profile updated" });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const handleSubmitForReview = async () => {
    if (!form.full_name.trim() || !form.dance_style.trim()) {
      toast({ title: "Please fill in your name and dance style before submitting", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: form.full_name || null,
          bio: form.bio || null,
          dance_style: form.dance_style || null,
          location: form.location || null,
          years_experience: form.years_experience ? parseInt(form.years_experience) : null,
          instagram_handle: form.instagram_handle || null,
          tiktok_handle: form.tiktok_handle || null,
          youtube_handle: form.youtube_handle || null,
          application_status: "pending" as any,
          application_submitted_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;
      setProfile((p: any) => ({ ...p, application_status: "pending", application_submitted_at: new Date().toISOString() }));
      toast({ title: "Profile submitted for review! We'll be in touch soon." });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
    setSubmitting(false);
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
          body: JSON.stringify({ return_url: window.location.href }),
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

  const appStatus = profile?.application_status ?? "none";
  const needsSubmission = appStatus === "none";
  const isPending = appStatus === "pending";
  const isApproved = appStatus === "approved";
  const isRejected = appStatus === "rejected";

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <h1 className="text-3xl font-bold">Settings</h1>

        {/* Application status banner */}
        {needsSubmission && (
          <Card className="border-2 border-primary bg-primary/5">
            <CardContent className="pt-6 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-foreground">Complete your profile to get approved</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Fill in your details below — at minimum your name and dance style — then click "Submit for Review".
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {isPending && (
          <Card className="border border-border bg-muted">
            <CardContent className="pt-6 flex items-start gap-3">
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-foreground">Application under review</p>
                <p className="text-sm text-muted-foreground mt-1">
                  We're reviewing your profile. You'll be notified once you're approved.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {isRejected && (
          <Card className="border border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-foreground">Application not approved</p>
                {profile?.rejection_reason && (
                  <p className="text-sm text-muted-foreground mt-1">Reason: {profile.rejection_reason}</p>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                  You can update your profile and resubmit.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Profile */}
        <Card className="border border-border">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>
              {needsSubmission || isRejected
                ? "Fill in your details, then submit for review."
                : "Update your profile information."
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AvatarUpload
              userId={profile?.id}
              avatarUrl={profile?.avatar_url}
              fullName={form.full_name}
              onUploaded={(url) => setProfile((p: any) => ({ ...p, avatar_url: url }))}
            />
            <div className="space-y-1">
              <Label>Full Name *</Label>
              <Input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Bio</Label>
              <Textarea placeholder="Tell us about yourself…" value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Dance Style / Genre *</Label>
                <Input placeholder="e.g. hip-hop, contemporary" value={form.dance_style} onChange={(e) => setForm((f) => ({ ...f, dance_style: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Years of Experience</Label>
                <Input type="number" min="0" value={form.years_experience} onChange={(e) => setForm((f) => ({ ...f, years_experience: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Location</Label>
              <LocationAutocomplete value={form.location} onChange={(val) => setForm((f) => ({ ...f, location: val }))} />
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

            <div className="flex gap-3 pt-2">
              {isApproved ? (
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Saving…" : "Save Profile"}
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={handleSave} disabled={saving}>
                    {saving ? "Saving…" : "Save Draft"}
                  </Button>
                  {(needsSubmission || isRejected) && (
                    <Button onClick={handleSubmitForReview} disabled={submitting}>
                      {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting…</> : "Submit for Review"}
                    </Button>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stripe Connect */}
        <Card className="border border-border">
          <CardHeader><CardTitle>Payment Setup</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {profile?.stripe_onboarded ? (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted">
                <CheckCircle className="h-5 w-5 text-primary" />
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
