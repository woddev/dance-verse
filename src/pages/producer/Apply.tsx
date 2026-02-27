import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { LocationAutocomplete } from "@/components/ui/location-autocomplete";

export default function ProducerApply() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirm_password: "",
    legal_name: "",
    stage_name: "",
    bio: "",
    genre: "",
    location: "",
    tiktok_url: "",
    instagram_url: "",
    spotify_url: "",
    soundcloud_url: "",
    other_social_url: "",
  });

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.legal_name.trim() || !form.email.trim() || !form.password) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    if (!isValidEmail(form.email.trim())) {
      toast({ title: "Please enter a valid email address", variant: "destructive" });
      return;
    }
    if (form.password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    if (form.password !== form.confirm_password) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // 1. Create auth account
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
      });

      if (signUpError) {
        toast({ title: "Signup failed", description: signUpError.message, variant: "destructive" });
        setSaving(false);
        return;
      }

      // 2. Register producer role + record via edge function
      const session = signUpData.session;
      if (!session) {
        toast({
          title: "Check your email",
          description: "Please verify your email address, then log in at the producer login page.",
        });
        setSaving(false);
        return;
      }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/producer-data?action=register-producer`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            legal_name: form.legal_name.trim(),
            stage_name: form.stage_name.trim() || null,
            email: form.email.trim(),
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Registration failed" }));
        throw new Error(err.error || "Registration failed");
      }

      // 3. Fire-and-forget welcome email
      try {
        const displayName = form.stage_name || form.legal_name;
        const welcomeHtml = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f9fafb;padding:40px 0;">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:40px;border:1px solid #e5e7eb;">
  <h1 style="color:#111;font-size:24px;margin:0 0 16px;">Welcome to DanceVerse! 🎶</h1>
  <p style="color:#374151;font-size:16px;line-height:1.6;">Hi ${displayName},</p>
  <p style="color:#374151;font-size:16px;line-height:1.6;">Your producer account is all set up! You can now log in and start submitting your tracks.</p>
  <p style="color:#374151;font-size:16px;line-height:1.6;">Once you submit a track, our A&R team will review it and you may receive offers — buyout, revenue split, or recoupment deals.</p>
  <p style="color:#6b7280;font-size:14px;margin-top:24px;">— The DanceVerse Team</p>
</div></body></html>`;
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            to: form.email.trim(),
            subject: "Welcome to DanceVerse — Your Producer Account Is Ready!",
            html: welcomeHtml,
          }),
        }).catch(() => {});
      } catch {}

      toast({ title: "Account created! Redirecting to your dashboard…" });
      navigate("/producer/dashboard");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-muted">
      <Navbar />
      <div className="flex-1 pt-24 pb-12 max-w-2xl mx-auto px-4 w-full">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Create Your Producer Account</CardTitle>
            <CardDescription>Sign up and set up your profile. You can start submitting tracks right away.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Account */}
            <div className="space-y-1">
              <Label>Email *</Label>
              <Input type="email" placeholder="you@example.com" value={form.email} onChange={set("email")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Password *</Label>
                <Input type="password" placeholder="Min 6 characters" value={form.password} onChange={set("password")} />
              </div>
              <div className="space-y-1">
                <Label>Confirm Password *</Label>
                <Input type="password" value={form.confirm_password} onChange={set("confirm_password")} />
              </div>
            </div>

            <div className="border-t border-border pt-4 mt-2">
              <p className="text-sm font-medium mb-3">Profile Info</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Legal Name *</Label>
                <Input value={form.legal_name} onChange={set("legal_name")} />
              </div>
              <div className="space-y-1">
                <Label>Stage Name</Label>
                <Input placeholder="Producer tag / alias" value={form.stage_name} onChange={set("stage_name")} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Bio</Label>
              <Textarea placeholder="Tell us about your music, style, and experience…" value={form.bio} onChange={set("bio")} />
            </div>
            <div className="space-y-1">
              <Label>Genre Specialties</Label>
              <Input placeholder="e.g. hip-hop, R&B, afrobeats" value={form.genre} onChange={set("genre")} />
            </div>
            <div className="space-y-1">
              <Label>Location</Label>
              <LocationAutocomplete value={form.location} onChange={(val) => setForm((f) => ({ ...f, location: val }))} />
            </div>

            <div className="border-t border-border pt-4 mt-2">
              <p className="text-sm font-medium mb-3">Social Media & Portfolio</p>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>TikTok URL</Label>
                  <Input placeholder="https://tiktok.com/@…" value={form.tiktok_url} onChange={set("tiktok_url")} />
                </div>
                <div className="space-y-1">
                  <Label>Instagram URL</Label>
                  <Input placeholder="https://instagram.com/…" value={form.instagram_url} onChange={set("instagram_url")} />
                </div>
                <div className="space-y-1">
                  <Label>Spotify URL</Label>
                  <Input placeholder="https://open.spotify.com/artist/…" value={form.spotify_url} onChange={set("spotify_url")} />
                </div>
                <div className="space-y-1">
                  <Label>SoundCloud URL</Label>
                  <Input placeholder="https://soundcloud.com/…" value={form.soundcloud_url} onChange={set("soundcloud_url")} />
                </div>
                <div className="space-y-1">
                  <Label>Other Social URL</Label>
                  <Input placeholder="https://…" value={form.other_social_url} onChange={set("other_social_url")} />
                </div>
              </div>
            </div>

            <Button className="w-full" onClick={handleSubmit} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating Account…</> : "Create Account & Continue"}
            </Button>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
