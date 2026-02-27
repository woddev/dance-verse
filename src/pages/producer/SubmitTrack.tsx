import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ProducerLayout from "@/components/layout/ProducerLayout";
import { useProducerApi } from "@/hooks/useProducerApi";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function SubmitTrack() {
  const api = useProducerApi();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    title: "",
    bpm: "",
    genre: "",
    mood_tags: "",
    isrc: "",
    master_ownership_percent: "100",
    publishing_ownership_percent: "100",
    explicit_flag: false,
    file_url: "",
    artwork_url: "",
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: "file_url" | "artwork_url") => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const path = `${user.id}/${crypto.randomUUID()}-${file.name}`;
      const { error } = await supabase.storage.from("deal-assets").upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("deal-assets").getPublicUrl(path);
      setForm((f) => ({ ...f, [field]: urlData.publicUrl }));
      toast.success("File uploaded");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.title) { toast.error("Title is required"); return; }
    if (!form.file_url) { toast.error("Audio file is required"); return; }
    setSaving(true);
    try {
      const moodTags = form.mood_tags ? form.mood_tags.split(",").map((t) => t.trim()).filter(Boolean) : null;
      await api.submitTrack({
        title: form.title,
        bpm: form.bpm ? parseInt(form.bpm) : null,
        genre: form.genre || null,
        mood_tags: moodTags,
        isrc: form.isrc || null,
        master_ownership_percent: parseFloat(form.master_ownership_percent) || null,
        publishing_ownership_percent: parseFloat(form.publishing_ownership_percent) || null,
        explicit_flag: form.explicit_flag,
        file_url: form.file_url,
        artwork_url: form.artwork_url || null,
      });
      toast.success("Track submitted successfully!");
      navigate("/producer/tracks");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProducerLayout>
      <h1 className="text-2xl font-bold mb-6">Submit New Track</h1>
      <Card className="max-w-2xl">
        <CardHeader><CardTitle>Track Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Title *</Label>
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Track title" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>BPM</Label>
              <Input type="number" value={form.bpm} onChange={(e) => setForm((f) => ({ ...f, bpm: e.target.value }))} placeholder="120" />
            </div>
            <div className="space-y-1">
              <Label>Genre</Label>
              <Input value={form.genre} onChange={(e) => setForm((f) => ({ ...f, genre: e.target.value }))} placeholder="Hip Hop" />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Mood Tags (comma-separated)</Label>
            <Input value={form.mood_tags} onChange={(e) => setForm((f) => ({ ...f, mood_tags: e.target.value }))} placeholder="energetic, dark, melodic" />
          </div>

          <div className="space-y-1">
            <Label>ISRC</Label>
            <Input value={form.isrc} onChange={(e) => setForm((f) => ({ ...f, isrc: e.target.value }))} placeholder="US-S1Z-99-00001" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Master Ownership %</Label>
              <Input type="number" min="0" max="100" value={form.master_ownership_percent} onChange={(e) => setForm((f) => ({ ...f, master_ownership_percent: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Publishing Ownership %</Label>
              <Input type="number" min="0" max="100" value={form.publishing_ownership_percent} onChange={(e) => setForm((f) => ({ ...f, publishing_ownership_percent: e.target.value }))} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={form.explicit_flag} onCheckedChange={(v) => setForm((f) => ({ ...f, explicit_flag: v }))} />
            <Label>Explicit Content</Label>
          </div>

          <div className="space-y-1">
            <Label>Audio File *</Label>
            <Input type="file" accept="audio/*" onChange={(e) => handleFileUpload(e, "file_url")} disabled={uploading} />
            {form.file_url && <p className="text-xs text-muted-foreground truncate">{form.file_url}</p>}
          </div>

          <div className="space-y-1">
            <Label>Artwork</Label>
            <Input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, "artwork_url")} disabled={uploading} />
            {form.artwork_url && <p className="text-xs text-muted-foreground truncate">{form.artwork_url}</p>}
          </div>

          <Button className="w-full" onClick={handleSubmit} disabled={saving || uploading || !form.title || !form.file_url}>
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting…</> : "Submit Track"}
          </Button>
        </CardContent>
      </Card>
    </ProducerLayout>
  );
}
