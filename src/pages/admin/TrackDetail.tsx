import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/layout/AdminLayout";
import { useAdminApi } from "@/hooks/useAdminApi";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Music, Save, Loader2, Upload, Image, X, Zap } from "lucide-react";
import { useState, useEffect, useRef } from "react";

export default function AdminTrackDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { callAdmin } = useAdminApi();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: tracks, isLoading } = useQuery({
    queryKey: ["admin-tracks"],
    queryFn: () => callAdmin("tracks"),
  });

  const track = tracks?.find((t: any) => t.id === id);

  const [form, setForm] = useState<Record<string, any>>({});
  const [dirty, setDirty] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [detectingBpm, setDetectingBpm] = useState(false);

  async function handleDetectBpm() {
    if (!form.audio_url) {
      toast({ title: "No audio URL", description: "Upload or enter an audio URL first.", variant: "destructive" });
      return;
    }
    setDetectingBpm(true);
    try {
      const { detectBpmFromUrl } = await import("@/lib/bpmDetect");
      const result = await detectBpmFromUrl(form.audio_url);
      setField("bpm", result.bpm.toString());
      if (result.durationSeconds) setField("duration_seconds", result.durationSeconds.toString());
      if (result.energyLevel) setField("energy_level", result.energyLevel);
      if (result.dropTimeSeconds !== null) setField("drop_time_seconds", result.dropTimeSeconds.toString());
      toast({ title: `Detected — BPM: ${result.bpm}, Duration: ${result.durationSeconds}s, Energy: ${result.energyLevel}${result.dropTimeSeconds ? `, Drop: ${result.dropTimeSeconds}s` : ""}` });
    } catch (err: any) {
      toast({ title: "Audio analysis failed", description: err.message, variant: "destructive" });
    }
    setDetectingBpm(false);
  }

  async function uploadFileToStorage(file: File, folder: string): Promise<string> {
    const ext = file.name.split(".").pop() ?? "bin";
    const fileName = `${folder}/${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const { error } = await supabase.storage
      .from("campaign-assets")
      .upload(fileName, file, { contentType: file.type, cacheControl: "3600" });
    if (error) throw new Error("Failed to upload: " + error.message);
    const { data } = supabase.storage.from("campaign-assets").getPublicUrl(fileName);
    return data.publicUrl;
  }

  async function handleAudioUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAudio(true);
    try {
      const { getAudioDuration } = await import("@/lib/audioUtils");
      const [url, duration] = await Promise.all([
        uploadFileToStorage(file, "tracks"),
        getAudioDuration(file).catch(() => null),
      ]);
      setField("audio_url", url);
      if (duration && (!form.duration_seconds || form.duration_seconds === "0" || form.duration_seconds === "")) {
        setField("duration_seconds", duration.toString());
      }
      toast({ title: `Audio uploaded${duration ? ` (${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, "0")})` : ""}` });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
    setUploadingAudio(false);
  }

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    try {
      const url = await uploadFileToStorage(file, "covers");
      setField("cover_image_url", url);
      toast({ title: "Cover image uploaded" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
    setUploadingCover(false);
  }

  useEffect(() => {
    if (track) {
      setForm({
        title: track.title ?? "",
        artist_name: track.artist_name ?? "",
        genre: track.genre ?? "",
        mood: track.mood ?? "",
        bpm: track.bpm?.toString() ?? "",
        duration_seconds: track.duration_seconds?.toString() ?? "",
        status: track.status ?? "active",
        audio_url: track.audio_url ?? "",
        cover_image_url: track.cover_image_url ?? "",
        tiktok_sound_url: track.tiktok_sound_url ?? "",
        instagram_sound_url: track.instagram_sound_url ?? "",
        spotify_url: track.spotify_url ?? "",
        usage_rules: track.usage_rules ?? "",
        internal_catalog_id: track.internal_catalog_id ?? "",
        isrc: track.isrc ?? "",
        version_name: track.version_name ?? "",
        master_owner: track.master_owner ?? "",
        publishing_owner: track.publishing_owner ?? "",
        master_split_percent: track.master_split_percent?.toString() ?? "",
        publishing_split_percent: track.publishing_split_percent?.toString() ?? "",
        pro_affiliation: track.pro_affiliation ?? "",
        content_id_status: track.content_id_status ?? "",
        sync_clearance: track.sync_clearance ?? "",
        sample_clearance: track.sample_clearance ?? "",
        energy_level: track.energy_level ?? "",
        vocal_type: track.vocal_type ?? "",
        dance_style_fit: Array.isArray(track.dance_style_fit) ? track.dance_style_fit.join(", ") : "",
        mood_tags_csv: Array.isArray(track.mood_tags) ? track.mood_tags.join(", ") : "",
        battle_friendly: track.battle_friendly ?? false,
        choreography_friendly: track.choreography_friendly ?? false,
        freestyle_friendly: track.freestyle_friendly ?? false,
        drop_time_seconds: track.drop_time_seconds?.toString() ?? "",
        counts: track.counts ?? "",
        available_versions: Array.isArray(track.available_versions) ? track.available_versions.join(", ") : "",
        preview_url: track.preview_url ?? "",
        download_url: track.download_url ?? "",
        usage_count: track.usage_count?.toString() ?? "0",
        revenue_generated: track.revenue_generated?.toString() ?? "0",
      });
      setDirty(false);
    }
  }, [track]);

  const setField = (key: string, val: any) => {
    setForm(f => ({ ...f, [key]: val }));
    setDirty(true);
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const parseArr = (s: string) => s ? s.split(",").map(x => x.trim()).filter(Boolean) : [];
      return callAdmin("update-track", {}, {
        track_id: id,
        title: form.title,
        artist_name: form.artist_name,
        genre: form.genre || null,
        mood: form.mood || null,
        bpm: form.bpm ? parseInt(form.bpm) : null,
        duration_seconds: form.duration_seconds ? parseInt(form.duration_seconds) : null,
        status: form.status,
        audio_url: form.audio_url || null,
        cover_image_url: form.cover_image_url || null,
        tiktok_sound_url: form.tiktok_sound_url || null,
        instagram_sound_url: form.instagram_sound_url || null,
        spotify_url: form.spotify_url || null,
        usage_rules: form.usage_rules || null,
        internal_catalog_id: form.internal_catalog_id || null,
        isrc: form.isrc || null,
        version_name: form.version_name || null,
        master_owner: form.master_owner || null,
        publishing_owner: form.publishing_owner || null,
        master_split_percent: form.master_split_percent ? parseFloat(form.master_split_percent) : null,
        publishing_split_percent: form.publishing_split_percent ? parseFloat(form.publishing_split_percent) : null,
        pro_affiliation: form.pro_affiliation || null,
        content_id_status: form.content_id_status || null,
        sync_clearance: form.sync_clearance || null,
        sample_clearance: form.sample_clearance || null,
        energy_level: form.energy_level || null,
        vocal_type: form.vocal_type || null,
        dance_style_fit: parseArr(form.dance_style_fit),
        mood_tags: parseArr(form.mood_tags_csv),
        battle_friendly: !!form.battle_friendly,
        choreography_friendly: !!form.choreography_friendly,
        freestyle_friendly: !!form.freestyle_friendly,
        drop_time_seconds: form.drop_time_seconds ? parseInt(form.drop_time_seconds) : null,
        counts: form.counts || null,
        available_versions: parseArr(form.available_versions),
        preview_url: form.preview_url || null,
        download_url: form.download_url || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tracks"] });
      toast({ title: "Track updated" });
      setDirty(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </AdminLayout>
    );
  }

  if (!track) {
    return (
      <AdminLayout>
        <div className="text-center py-20">
          <p className="text-muted-foreground">Track not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/admin/music")}>Back to Music Library</Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/music")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              {track.cover_image_url ? (
                <img src={track.cover_image_url} alt="" className="w-14 h-14 rounded-lg object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center"><Music className="h-6 w-6 text-muted-foreground" /></div>
              )}
              <div>
                <h1 className="text-2xl font-bold">{track.title}</h1>
                <p className="text-muted-foreground">{track.artist_name}</p>
              </div>
              <Badge variant={track.status === "active" ? "default" : "secondary"} className="ml-2">{track.status}</Badge>
            </div>
          </div>
          <Button onClick={() => saveMutation.mutate()} disabled={!dirty || saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
        </div>

        {/* Basic Info */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Basic Info</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Title</Label><Input value={form.title} onChange={e => setField("title", e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Artist</Label><Input value={form.artist_name} onChange={e => setField("artist_name", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-1.5"><Label>Genre</Label><Input value={form.genre} onChange={e => setField("genre", e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Mood</Label><Input value={form.mood} onChange={e => setField("mood", e.target.value)} /></div>
              <div className="space-y-1.5">
                <Label>BPM</Label>
                <div className="flex gap-2">
                  <Input type="number" value={form.bpm} onChange={e => setField("bpm", e.target.value)} />
                  <Button type="button" variant="outline" size="icon" onClick={handleDetectBpm} disabled={detectingBpm || !form.audio_url} title="Auto-detect BPM">
                    {detectingBpm ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5"><Label>Duration (sec)</Label><Input type="number" value={form.duration_seconds} onChange={e => setField("duration_seconds", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setField("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Internal Catalog ID</Label><Input value={form.internal_catalog_id} onChange={e => setField("internal_catalog_id", e.target.value)} /></div>
            </div>
            <div className="space-y-1.5"><Label>Usage Rules</Label><Textarea value={form.usage_rules} onChange={e => setField("usage_rules", e.target.value)} rows={3} /></div>
          </CardContent>
        </Card>

        {/* Rights & Ownership */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Rights & Ownership</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>ISRC</Label><Input value={form.isrc} onChange={e => setField("isrc", e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Version Name</Label><Input value={form.version_name} onChange={e => setField("version_name", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Master Owner</Label><Input value={form.master_owner} onChange={e => setField("master_owner", e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Publishing Owner</Label><Input value={form.publishing_owner} onChange={e => setField("publishing_owner", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Master Split %</Label><Input type="number" value={form.master_split_percent} onChange={e => setField("master_split_percent", e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Publishing Split %</Label><Input type="number" value={form.publishing_split_percent} onChange={e => setField("publishing_split_percent", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5"><Label>PRO Affiliation</Label><Input value={form.pro_affiliation} onChange={e => setField("pro_affiliation", e.target.value)} placeholder="e.g. ASCAP, BMI" /></div>
              <div className="space-y-1.5"><Label>Content ID Status</Label><Input value={form.content_id_status} onChange={e => setField("content_id_status", e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Sync Clearance</Label><Input value={form.sync_clearance} onChange={e => setField("sync_clearance", e.target.value)} /></div>
            </div>
            <div className="space-y-1.5"><Label>Sample Clearance</Label><Input value={form.sample_clearance} onChange={e => setField("sample_clearance", e.target.value)} /></div>
          </CardContent>
        </Card>

        {/* Music Metadata */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Music Metadata</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5"><Label>Energy Level</Label><Input value={form.energy_level} onChange={e => setField("energy_level", e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Vocal Type</Label><Input value={form.vocal_type} onChange={e => setField("vocal_type", e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Drop Time (sec)</Label><Input type="number" value={form.drop_time_seconds} onChange={e => setField("drop_time_seconds", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Counts</Label><Input value={form.counts} onChange={e => setField("counts", e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Mood Tags (comma-separated)</Label><Input value={form.mood_tags_csv} onChange={e => setField("mood_tags_csv", e.target.value)} /></div>
            </div>
          </CardContent>
        </Card>

        {/* Dance Fit */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Dance Fit</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5"><Label>Dance Style Fit (comma-separated)</Label><Input value={form.dance_style_fit} onChange={e => setField("dance_style_fit", e.target.value)} /></div>
            <div className="flex gap-8 flex-wrap">
              <div className="flex items-center gap-2"><Switch checked={!!form.battle_friendly} onCheckedChange={v => setField("battle_friendly", v)} /><Label>Battle Friendly</Label></div>
              <div className="flex items-center gap-2"><Switch checked={!!form.choreography_friendly} onCheckedChange={v => setField("choreography_friendly", v)} /><Label>Choreography Friendly</Label></div>
              <div className="flex items-center gap-2"><Switch checked={!!form.freestyle_friendly} onCheckedChange={v => setField("freestyle_friendly", v)} /><Label>Freestyle Friendly</Label></div>
            </div>
          </CardContent>
        </Card>

        {/* Versions & Links */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Versions & Links</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5"><Label>Available Versions (comma-separated)</Label><Input value={form.available_versions} onChange={e => setField("available_versions", e.target.value)} /></div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Audio File</Label>
                {form.audio_url ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Input value={form.audio_url} onChange={e => setField("audio_url", e.target.value)} className="flex-1" />
                      <Button variant="ghost" size="icon" onClick={() => setField("audio_url", "")}><X className="h-4 w-4" /></Button>
                    </div>
                    <audio controls src={form.audio_url} className="w-full h-10" />
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input value={form.audio_url} onChange={e => setField("audio_url", e.target.value)} placeholder="Paste URL or upload file" className="flex-1" />
                    <Button variant="outline" size="sm" onClick={() => audioInputRef.current?.click()} disabled={uploadingAudio}>
                      {uploadingAudio ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Upload className="h-4 w-4 mr-1" />Upload</>}
                    </Button>
                    <input ref={audioInputRef} type="file" accept=".mp3,.wav,.m4a" className="hidden" onChange={handleAudioUpload} />
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Cover Image</Label>
                {form.cover_image_url ? (
                  <div className="flex items-start gap-3">
                    <img src={form.cover_image_url} alt="Cover" className="w-20 h-20 rounded-lg object-cover" />
                    <div className="flex-1 space-y-2">
                      <Input value={form.cover_image_url} onChange={e => setField("cover_image_url", e.target.value)} />
                      <Button variant="ghost" size="sm" onClick={() => setField("cover_image_url", "")}><X className="h-3 w-3 mr-1" />Remove</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input value={form.cover_image_url} onChange={e => setField("cover_image_url", e.target.value)} placeholder="Paste URL or upload image" className="flex-1" />
                    <Button variant="outline" size="sm" onClick={() => coverInputRef.current?.click()} disabled={uploadingCover}>
                      {uploadingCover ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Image className="h-4 w-4 mr-1" />Upload</>}
                    </Button>
                    <input ref={coverInputRef} type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={handleCoverUpload} />
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Preview URL</Label><Input value={form.preview_url} onChange={e => setField("preview_url", e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Download URL</Label><Input value={form.download_url} onChange={e => setField("download_url", e.target.value)} /></div>
            </div>
            <Separator />
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5"><Label>TikTok Sound URL</Label><Input value={form.tiktok_sound_url} onChange={e => setField("tiktok_sound_url", e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Instagram Sound URL</Label><Input value={form.instagram_sound_url} onChange={e => setField("instagram_sound_url", e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Spotify URL</Label><Input value={form.spotify_url} onChange={e => setField("spotify_url", e.target.value)} /></div>
            </div>
          </CardContent>
        </Card>

        {/* Stats (read-only) */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Stats</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Usage Count</Label><Input value={form.usage_count} disabled className="bg-muted" /></div>
              <div className="space-y-1.5"><Label>Revenue Generated</Label><Input value={form.revenue_generated} disabled className="bg-muted" /></div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Created: {new Date(track.created_at).toLocaleDateString()} · Updated: {new Date(track.updated_at).toLocaleDateString()}</p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
