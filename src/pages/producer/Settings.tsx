import { useState, useEffect } from "react";
import ProducerLayout from "@/components/layout/ProducerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useProducerApi } from "@/hooks/useProducerApi";

export default function ProducerSettings() {
  const { toast } = useToast();
  const { getProfile, updateProfile } = useProducerApi();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
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

  useEffect(() => {
    (async () => {
      try {
        const data = await getProfile();
        if (data) {
          setForm({
            legal_name: data.legal_name ?? "",
            stage_name: data.stage_name ?? "",
            bio: data.bio ?? "",
            genre: data.genre ?? "",
            location: data.location ?? "",
            tiktok_url: data.tiktok_url ?? "",
            instagram_url: data.instagram_url ?? "",
            spotify_url: data.spotify_url ?? "",
            soundcloud_url: data.soundcloud_url ?? "",
            other_social_url: data.other_social_url ?? "",
          });
        }
      } catch {
        toast({ title: "Failed to load profile", variant: "destructive" });
      }
      setLoading(false);
    })();
  }, []);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSave = async () => {
    if (!form.legal_name.trim()) {
      toast({ title: "Legal name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await updateProfile(form);
      toast({ title: "Profile updated!" });
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <ProducerLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </ProducerLayout>
    );
  }

  return (
    <ProducerLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Settings</h1>

        <Card>
          <CardHeader>
            <CardTitle>Profile Info</CardTitle>
            <CardDescription>Update your public profile details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
              <Input placeholder="City, Country" value={form.location} onChange={set("location")} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Social Media & Portfolio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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
          </CardContent>
        </Card>

        <Button className="w-full" onClick={handleSave} disabled={saving}>
          {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</> : "Save Changes"}
        </Button>
      </div>
    </ProducerLayout>
  );
}
