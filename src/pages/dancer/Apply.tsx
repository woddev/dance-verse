import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle } from "lucide-react";
import { LocationAutocomplete } from "@/components/ui/location-autocomplete";

export default function DancerApply() {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    email: "",
    full_name: "",
    bio: "",
    instagram_handle: "",
    tiktok_handle: "",
    youtube_handle: "",
    facebook_handle: "",
    dance_style: "",
    years_experience: "",
    location: "",
  });

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async () => {
    if (!form.full_name.trim() || !form.email.trim() || !form.dance_style.trim() || !form.location.trim()) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    if (!isValidEmail(form.email.trim())) {
      toast({ title: "Please enter a valid email address", variant: "destructive" });
      return;
    }
    setSaving(true);

    const { error } = await supabase.from("applications" as any).insert({
      email: form.email.trim(),
      full_name: form.full_name.trim(),
      bio: form.bio.trim() || null,
      instagram_handle: form.instagram_handle.trim() || null,
      tiktok_handle: form.tiktok_handle.trim() || null,
      youtube_handle: form.youtube_handle.trim() || null,
      facebook_handle: form.facebook_handle.trim() || null,
      dance_style: form.dance_style.trim() || null,
      years_experience: form.years_experience ? parseInt(form.years_experience) : null,
      location: form.location.trim() || null,
    } as any);

    if (error) {
      if (error.message?.includes("duplicate") || error.code === "23505") {
        toast({ title: "You already have a pending application", description: "We'll be in touch soon!", variant: "destructive" });
      } else {
        toast({ title: "Error submitting application", description: error.message, variant: "destructive" });
      }
    } else {
      setSubmitted(true);
    }
    setSaving(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col bg-muted">
        <Navbar />
        <div className="flex-1 flex items-center justify-center pt-20 px-4">
          <Card className="w-full max-w-md text-center">
            <CardContent className="pt-8 pb-8 space-y-4">
              <CheckCircle className="h-12 w-12 text-primary mx-auto" />
              <h2 className="text-2xl font-bold">Application Submitted!</h2>
              <p className="text-muted-foreground">
                Thanks for applying to Dance-Verse. We'll review your application and send you an invite email once you're approved.
              </p>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted">
      <Navbar />
      <div className="flex-1 pt-24 pb-12 max-w-2xl mx-auto px-4 w-full">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Apply to Join</CardTitle>
            <CardDescription>Tell us about yourself so we can review your application.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Email *</Label>
              <Input type="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Full Name *</Label>
              <Input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Bio</Label>
              <Textarea placeholder="Tell us about yourself…" value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} />
            </div>

            <div className="grid grid-cols-2 gap-3">
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
              <Label>Location / City *</Label>
              <LocationAutocomplete value={form.location} onChange={(val) => setForm((f) => ({ ...f, location: val }))} />
            </div>

            <div className="border-t border-border pt-4 mt-2">
              <p className="text-sm font-medium mb-3">Social Media</p>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Instagram Handle</Label>
                  <Input placeholder="@yourhandle" value={form.instagram_handle} onChange={(e) => setForm((f) => ({ ...f, instagram_handle: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>TikTok Handle</Label>
                  <Input placeholder="@yourhandle" value={form.tiktok_handle} onChange={(e) => setForm((f) => ({ ...f, tiktok_handle: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>YouTube Handle</Label>
                  <Input placeholder="@yourchannel" value={form.youtube_handle} onChange={(e) => setForm((f) => ({ ...f, youtube_handle: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Facebook Handle</Label>
                  <Input placeholder="@yourpage" value={form.facebook_handle} onChange={(e) => setForm((f) => ({ ...f, facebook_handle: e.target.value }))} />
                </div>
              </div>
            </div>

            <Button className="w-full" onClick={handleSubmit} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting…</> : "Submit Application"}
            </Button>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
