import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProducerApi } from "@/hooks/useProducerApi";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, ImagePlus, X, Music, CheckCircle2 } from "lucide-react";
import ProducerTermsDialog from "@/components/legal/ProducerTermsDialog";
import { cn } from "@/lib/utils";
import dvLogo from "@/assets/dance-verse-logo-new.png";

export default function SubmitPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // If not authenticated, redirect to auth with redirect back
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth?redirect=/submit", { replace: true });
    }
  }, [authLoading, user, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  return <SubmitTrackForm />;
}

function SubmitTrackForm() {
  const api = useProducerApi();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [artworkUploading, setArtworkUploading] = useState(false);
  const [artworkFileName, setArtworkFileName] = useState("");
  const [artworkDragging, setArtworkDragging] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const artworkInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    title: "",
    bpm: "",
    genre: "",
    mood_tags: "",
    isrc: "",
    explicit_flag: false,
    file_url: "",
    artwork_url: "",
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${user.id}/${crypto.randomUUID()}-${safeName}`;
      const { error } = await supabase.storage.from("deal-assets").upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("deal-assets").getPublicUrl(path);
      setForm((f) => ({ ...f, file_url: urlData.publicUrl }));
      toast.success("File uploaded");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const processArtwork = async (file: File) => {
    const validTypes = ["image/jpeg", "image/png"];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload a JPG or PNG file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10MB");
      return;
    }
    setArtworkUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${user.id}/${crypto.randomUUID()}-${safeName}`;
      const { error } = await supabase.storage.from("deal-assets").upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("deal-assets").getPublicUrl(path);
      setForm((f) => ({ ...f, artwork_url: urlData.publicUrl }));
      setArtworkFileName(file.name);
      toast.success("Artwork uploaded");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setArtworkUploading(false);
    }
  };

  const handleArtworkDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setArtworkDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processArtwork(file);
  };

  const removeArtwork = () => {
    setForm((f) => ({ ...f, artwork_url: "" }));
    setArtworkFileName("");
  };

  const syncToDrive = async (trackId: string, producerName: string) => {
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const extractPath = (url: string) => {
        const match = url.match(/deal-assets\/(.+)$/);
        return match ? match[1] : null;
      };
      const audioPath = extractPath(form.file_url);
      if (audioPath) {
        const ext = form.file_url.split(".").pop() || "mp3";
        fetch(`https://${projectId}.supabase.co/functions/v1/sync-to-drive`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({
            producer_name: producerName,
            file_type: "track",
            file_name: `${form.title}.${ext}`,
            mime_type: `audio/${ext}`,
            storage_path: audioPath,
            track_id: trackId,
          }),
        }).catch((e) => console.error("Drive sync (audio) failed:", e));
      }
      if (form.artwork_url) {
        const artPath = extractPath(form.artwork_url);
        if (artPath) {
          const ext = form.artwork_url.split(".").pop() || "jpg";
          fetch(`https://${projectId}.supabase.co/functions/v1/sync-to-drive`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({
              producer_name: producerName,
              file_type: "artwork",
              file_name: `${form.title} - Artwork.${ext}`,
              mime_type: `image/${ext === "jpg" ? "jpeg" : ext}`,
              storage_path: artPath,
            }),
          }).catch((e) => console.error("Drive sync (artwork) failed:", e));
        }
      }
    } catch (e) {
      console.error("Drive sync error:", e);
    }
  };

  const handleSubmit = async () => {
    if (!form.first_name.trim()) { toast.error("First name is required"); return; }
    if (!form.last_name.trim()) { toast.error("Last name is required"); return; }
    if (!form.title) { toast.error("Title is required"); return; }
    if (!form.file_url) { toast.error("Audio file is required"); return; }
    setSaving(true);
    try {
      const moodTags = form.mood_tags ? form.mood_tags.split(",").map((t) => t.trim()).filter(Boolean) : null;
      const result = await api.submitTrack({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        title: form.title,
        bpm: form.bpm ? parseInt(form.bpm) : null,
        genre: form.genre || null,
        mood_tags: moodTags,
        isrc: form.isrc || null,
        explicit_flag: form.explicit_flag,
        file_url: form.file_url,
        artwork_url: form.artwork_url || null,
      });

      const producerName = `${form.first_name.trim()} ${form.last_name.trim()}`;
      if (result?.track_id) {
        syncToDrive(result.track_id, producerName);
      }

      setSubmitted(true);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (submitted) {
    return (
      <MinimalLayout>
        <Card className="max-w-lg mx-auto text-center">
          <CardContent className="pt-10 pb-8 space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold">Track Submitted!</h2>
            <p className="text-muted-foreground">
              Your track has been received and is under review. We'll be in touch once our team has evaluated it.
            </p>
            <div className="flex flex-col gap-2 pt-4">
              <Button onClick={() => { setSubmitted(false); setForm({ first_name: form.first_name, last_name: form.last_name, title: "", bpm: "", genre: "", mood_tags: "", isrc: "", explicit_flag: false, file_url: "", artwork_url: "" }); setTermsAccepted(false); setArtworkFileName(""); }}>
                Submit Another Track
              </Button>
              <Button variant="outline" asChild>
                <Link to="/">Back to Home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </MinimalLayout>
    );
  }

  return (
    <MinimalLayout>
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
            <Music className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Submit Your Track</h1>
          <p className="text-muted-foreground mt-2">
            Upload your music for review by the Dance-Verse team
          </p>
        </div>

        <Card>
          <CardHeader><CardTitle>Track Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>First Name *</Label>
                <Input value={form.first_name} onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))} placeholder="John" />
              </div>
              <div className="space-y-1">
                <Label>Last Name *</Label>
                <Input value={form.last_name} onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))} placeholder="Doe" />
              </div>
            </div>

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
              <Input type="file" accept="audio/*" onChange={handleFileUpload} disabled={uploading} />
              {uploading && <p className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Uploading…</p>}
              {form.file_url && !uploading && <p className="text-xs text-green-600">✓ Audio uploaded</p>}
            </div>

            <div className="space-y-1">
              <Label>Cover Art <span className="text-xs text-muted-foreground font-normal">(1:1, JPG or PNG)</span></Label>
              <input
                ref={artworkInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) processArtwork(f); }}
                disabled={artworkUploading}
                className="hidden"
              />
              {artworkFileName ? (
                <div className="flex items-center justify-between gap-2 rounded-md border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
                  <span className="flex items-center gap-2 truncate">
                    <ImagePlus className="h-4 w-4 shrink-0 text-primary" />
                    <span className="truncate">{artworkFileName}</span>
                  </span>
                  <button type="button" onClick={removeArtwork} className="text-muted-foreground hover:text-destructive transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div
                  onDragOver={(e) => { e.preventDefault(); setArtworkDragging(true); }}
                  onDragLeave={() => setArtworkDragging(false)}
                  onDrop={handleArtworkDrop}
                  onClick={() => artworkInputRef.current?.click()}
                  className={cn(
                    "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors aspect-square max-w-[200px]",
                    artworkDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/50"
                  )}
                >
                  {artworkUploading ? (
                    <>
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Uploading…</p>
                    </>
                  ) : (
                    <>
                      <ImagePlus className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm font-medium">Drag & drop artwork</p>
                      <p className="text-xs text-muted-foreground">or click · JPG/PNG, 1:1</p>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-start gap-3 rounded-md border border-border bg-muted/30 p-4">
              <Checkbox
                id="terms-submit"
                checked={termsAccepted}
                onCheckedChange={(v) => setTermsAccepted(v === true)}
                className="mt-0.5"
              />
              <label htmlFor="terms-submit" className="text-sm leading-snug cursor-pointer">
                I have read and agree to the{" "}
                <ProducerTermsDialog
                  trigger={
                    <button type="button" className="underline text-primary hover:text-primary/80 font-medium">
                      Producer Submission &amp; Option Agreement
                    </button>
                  }
                />
              </label>
            </div>

            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={saving || uploading || !termsAccepted || !form.first_name.trim() || !form.last_name.trim() || !form.title || !form.file_url}
            >
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting…</> : "Submit Track"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </MinimalLayout>
  );
}

function MinimalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/">
            <img src={dvLogo} alt="Dance-Verse" className="h-6" />
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Back to site
          </Link>
        </div>
      </header>
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-10">
        {children}
      </main>
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Dance-Verse. All rights reserved.
      </footer>
    </div>
  );
}
