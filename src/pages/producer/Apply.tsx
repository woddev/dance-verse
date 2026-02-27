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
import { Loader2, CheckCircle, Upload, Music } from "lucide-react";
import { LocationAutocomplete } from "@/components/ui/location-autocomplete";

export default function ProducerApply() {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [demoFileName, setDemoFileName] = useState("");
  const [form, setForm] = useState({
    email: "",
    legal_name: "",
    stage_name: "",
    bio: "",
    genre: "",
    portfolio_url: "",
    soundcloud_url: "",
    website_url: "",
    location: "",
    demo_url: "",
    tiktok_url: "",
    instagram_url: "",
    spotify_url: "",
    other_social_url: "",
  });

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleDemoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["audio/mpeg", "audio/wav", "audio/x-wav", "audio/wave"];
    if (!validTypes.includes(file.type)) {
      toast({ title: "Please upload a WAV or MP3 file", variant: "destructive" });
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast({ title: "File must be under 50MB", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const path = `${crypto.randomUUID()}-${file.name}`;
      const { error } = await supabase.storage.from("producer-demos").upload(path, file);
      if (error) throw error;
      setForm((f) => ({ ...f, demo_url: path }));
      setDemoFileName(file.name);
      toast({ title: "Demo uploaded successfully" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (!form.legal_name.trim() || !form.email.trim()) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    if (!isValidEmail(form.email.trim())) {
      toast({ title: "Please enter a valid email address", variant: "destructive" });
      return;
    }
    setSaving(true);

    const { error } = await supabase.from("producer_applications" as any).insert({
      email: form.email.trim(),
      legal_name: form.legal_name.trim(),
      stage_name: form.stage_name.trim() || null,
      bio: form.bio.trim() || null,
      genre: form.genre.trim() || null,
      portfolio_url: form.portfolio_url.trim() || null,
      soundcloud_url: form.soundcloud_url.trim() || null,
      website_url: form.website_url.trim() || null,
      location: form.location.trim() || null,
      demo_url: form.demo_url || null,
      tiktok_url: form.tiktok_url.trim() || null,
      instagram_url: form.instagram_url.trim() || null,
      spotify_url: form.spotify_url.trim() || null,
      other_social_url: form.other_social_url.trim() || null,
    } as any);

    if (error) {
      toast({ title: "Error submitting application", description: error.message, variant: "destructive" });
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
                Thanks for applying to the Dance-Verse producer program. We'll review your application and send you an invite email once you're approved.
              </p>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <div className="min-h-screen flex flex-col bg-muted">
      <Navbar />
      <div className="flex-1 pt-24 pb-12 max-w-2xl mx-auto px-4 w-full">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Producer Application</CardTitle>
            <CardDescription>Tell us about yourself and your music so we can review your application.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Email *</Label>
              <Input type="email" placeholder="you@example.com" value={form.email} onChange={set("email")} />
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
            <div className="space-y-1">
              <Label>Demo Track (WAV or MP3, max 50MB)</Label>
              <div className="relative">
                <Input
                  type="file"
                  accept=".wav,.mp3,audio/mpeg,audio/wav"
                  onChange={handleDemoUpload}
                  disabled={uploading}
                  className="hidden"
                  id="demo-upload"
                />
                <label
                  htmlFor="demo-upload"
                  className="flex items-center gap-2 cursor-pointer border border-input rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
                >
                  {uploading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</>
                  ) : demoFileName ? (
                    <><Music className="h-4 w-4 text-primary" /> {demoFileName}</>
                  ) : (
                    <><Upload className="h-4 w-4 text-muted-foreground" /> Choose a file…</>
                  )}
                </label>
              </div>
            </div>

            <div className="border-t border-border pt-4 mt-2">
              <p className="text-sm font-medium mb-3">Social Media Profiles</p>
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
                  <Label>Other Social URL</Label>
                  <Input placeholder="https://…" value={form.other_social_url} onChange={set("other_social_url")} />
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-4 mt-2">
              <p className="text-sm font-medium mb-3">Portfolio Links</p>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>SoundCloud URL</Label>
                  <Input placeholder="https://soundcloud.com/…" value={form.soundcloud_url} onChange={set("soundcloud_url")} />
                </div>
                <div className="space-y-1">
                  <Label>Portfolio / Beatstore URL</Label>
                  <Input placeholder="https://…" value={form.portfolio_url} onChange={set("portfolio_url")} />
                </div>
                <div className="space-y-1">
                  <Label>Website</Label>
                  <Input placeholder="https://…" value={form.website_url} onChange={set("website_url")} />
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
