import { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/layout/AdminLayout";
import { useAdminApi } from "@/hooks/useAdminApi";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Pencil, Trash2, Music, Upload, Loader2, ImagePlus, X, FileUp, ChevronDown, Download, Zap } from "lucide-react";
import BatchTrackImport from "@/components/admin/BatchTrackImport";

interface Track {
  id: string;
  title: string;
  artist_name: string;
  cover_image_url: string | null;
  audio_url: string | null;
  tiktok_sound_url: string | null;
  instagram_sound_url: string | null;
  spotify_url: string | null;
  genre: string | null;
  mood: string | null;
  bpm: number | null;
  duration_seconds: number | null;
  status: string;
  usage_rules: string | null;
  created_at: string;
}

const emptyForm = {
  title: "",
  artist_name: "",
  cover_image_url: "",
  audio_url: "",
  tiktok_sound_url: "",
  instagram_sound_url: "",
  spotify_url: "",
  genre: "",
  mood: "",
  bpm: "",
  duration_seconds: "",
  usage_rules: "",
  status: "active",
  internal_catalog_id: "",
  isrc: "",
  version_name: "",
  master_owner: "",
  publishing_owner: "",
  master_split_percent: "",
  publishing_split_percent: "",
  pro_affiliation: "",
  content_id_status: "",
  sync_clearance: "",
  sample_clearance: "",
  energy_level: "",
  vocal_type: "",
  dance_style_fit: "",
  mood_tags_csv: "",
  battle_friendly: false as boolean | string,
  choreography_friendly: false as boolean | string,
  freestyle_friendly: false as boolean | string,
  drop_time_seconds: "",
  counts: "",
  available_versions: "",
  preview_url: "",
  download_url: "",
  featured: false as boolean | string,
};

function formatDuration(sec: number | null) {
  if (!sec) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function ManageMusic() {
  const { callAdmin } = useAdminApi();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [genreFilter, setGenreFilter] = useState("all");
  const [moodFilter, setMoodFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: tracks = [], isLoading } = useQuery<Track[]>({
    queryKey: ["admin-tracks"],
    queryFn: () => callAdmin("tracks"),
  });

  // Derive unique genres/moods for filter dropdowns
  const genres = useMemo(() => [...new Set(tracks.map((t) => t.genre).filter(Boolean))].sort() as string[], [tracks]);
  const moods = useMemo(() => [...new Set(tracks.map((t) => t.mood).filter(Boolean))].sort() as string[], [tracks]);

  const filtered = useMemo(() => {
    return tracks.filter((t) => {
      const q = search.toLowerCase();
      if (q && !t.title.toLowerCase().includes(q) && !t.artist_name.toLowerCase().includes(q)) return false;
      if (genreFilter !== "all" && t.genre !== genreFilter) return false;
      if (moodFilter !== "all" && t.mood !== moodFilter) return false;
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      return true;
    });
  }, [tracks, search, genreFilter, moodFilter, statusFilter]);

  const saveMutation = useMutation({
    mutationFn: (payload: any) => {
      if (editingTrack) {
        return callAdmin("update-track", {}, { track_id: editingTrack.id, ...payload });
      }
      return callAdmin("create-track", {}, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tracks"] });
      toast({ title: editingTrack ? "Track updated" : "Track created" });
      closeDialog();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => callAdmin("delete-track", { id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tracks"] });
      toast({ title: "Track deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  function openAdd() {
    setEditingTrack(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(t: Track) {
    setEditingTrack(t);
    setForm({
      title: t.title,
      artist_name: t.artist_name,
      cover_image_url: t.cover_image_url ?? "",
      audio_url: t.audio_url ?? "",
      tiktok_sound_url: t.tiktok_sound_url ?? "",
      instagram_sound_url: t.instagram_sound_url ?? "",
      spotify_url: t.spotify_url ?? "",
      genre: t.genre ?? "",
      mood: t.mood ?? "",
      bpm: t.bpm?.toString() ?? "",
      duration_seconds: t.duration_seconds?.toString() ?? "",
      usage_rules: t.usage_rules ?? "",
      status: t.status,
      internal_catalog_id: (t as any).internal_catalog_id ?? "",
      isrc: (t as any).isrc ?? "",
      version_name: (t as any).version_name ?? "",
      master_owner: (t as any).master_owner ?? "",
      publishing_owner: (t as any).publishing_owner ?? "",
      master_split_percent: (t as any).master_split_percent?.toString() ?? "",
      publishing_split_percent: (t as any).publishing_split_percent?.toString() ?? "",
      pro_affiliation: (t as any).pro_affiliation ?? "",
      content_id_status: (t as any).content_id_status ?? "",
      sync_clearance: (t as any).sync_clearance ?? "",
      sample_clearance: (t as any).sample_clearance ?? "",
      energy_level: (t as any).energy_level ?? "",
      vocal_type: (t as any).vocal_type ?? "",
      dance_style_fit: Array.isArray((t as any).dance_style_fit) ? (t as any).dance_style_fit.join(", ") : "",
      mood_tags_csv: Array.isArray((t as any).mood_tags) ? (t as any).mood_tags.join(", ") : "",
      battle_friendly: (t as any).battle_friendly ?? false,
      choreography_friendly: (t as any).choreography_friendly ?? false,
      freestyle_friendly: (t as any).freestyle_friendly ?? false,
      drop_time_seconds: (t as any).drop_time_seconds?.toString() ?? "",
      counts: (t as any).counts ?? "",
      available_versions: Array.isArray((t as any).available_versions) ? (t as any).available_versions.join(", ") : "",
      preview_url: (t as any).preview_url ?? "",
      download_url: (t as any).download_url ?? "",
      featured: (t as any).featured ?? false,
    });
    setDialogOpen(true);
  }

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [detectingBpm, setDetectingBpm] = useState(false);

  async function handleDetectBpm() {
    const url = form.audio_url;
    if (!url) {
      toast({ title: "No audio URL", description: "Enter an audio URL or upload a file first.", variant: "destructive" });
      return;
    }
    setDetectingBpm(true);
    try {
      const { detectBpmFromUrl } = await import("@/lib/bpmDetect");
      const bpm = await detectBpmFromUrl(url);
      setField("bpm", bpm.toString());
      toast({ title: `BPM detected: ${bpm}` });
    } catch (err: any) {
      toast({ title: "BPM detection failed", description: err.message, variant: "destructive" });
    } finally {
      setDetectingBpm(false);
    }
  }
  const [uploadingCover, setUploadingCover] = useState(false);
  const audioInputRef = useRef<HTMLInputElement>(null);

  function closeDialog() {
    setDialogOpen(false);
    setEditingTrack(null);
    setForm(emptyForm);
    setAudioFile(null);
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setUploading(true);
    try {
      let audioUrl = form.audio_url || null;
      let autoDuration = form.duration_seconds;
      if (audioFile) {
        const { getAudioDuration } = await import("@/lib/audioUtils");
        const [url, dur] = await Promise.all([
          uploadFileToStorage(audioFile, "tracks"),
          getAudioDuration(audioFile).catch(() => null),
        ]);
        audioUrl = url;
        if (dur && (!autoDuration || autoDuration === "0" || autoDuration === "")) {
          autoDuration = dur.toString();
        }
      }
      const parseArr = (s: string) => s ? s.split(",").map(x => x.trim()).filter(Boolean) : [];
      saveMutation.mutate({
        title: form.title,
        artist_name: form.artist_name,
        cover_image_url: form.cover_image_url || null,
        audio_url: audioUrl,
        tiktok_sound_url: form.tiktok_sound_url || null,
        instagram_sound_url: form.instagram_sound_url || null,
        spotify_url: form.spotify_url || null,
        genre: form.genre || null,
        mood: form.mood || null,
        bpm: form.bpm ? parseInt(form.bpm as string) : null,
        duration_seconds: autoDuration ? parseInt(autoDuration as string) : null,
        usage_rules: form.usage_rules || null,
        status: form.status,
        internal_catalog_id: form.internal_catalog_id || null,
        isrc: form.isrc || null,
        version_name: form.version_name || null,
        master_owner: form.master_owner || null,
        publishing_owner: form.publishing_owner || null,
        master_split_percent: form.master_split_percent ? parseFloat(form.master_split_percent as string) : null,
        publishing_split_percent: form.publishing_split_percent ? parseFloat(form.publishing_split_percent as string) : null,
        pro_affiliation: form.pro_affiliation || null,
        content_id_status: form.content_id_status || null,
        sync_clearance: form.sync_clearance || null,
        sample_clearance: form.sample_clearance || null,
        energy_level: form.energy_level || null,
        vocal_type: form.vocal_type || null,
        dance_style_fit: parseArr(form.dance_style_fit as string),
        mood_tags: parseArr(form.mood_tags_csv as string),
        battle_friendly: !!form.battle_friendly,
        choreography_friendly: !!form.choreography_friendly,
        freestyle_friendly: !!form.freestyle_friendly,
        drop_time_seconds: form.drop_time_seconds ? parseInt(form.drop_time_seconds as string) : null,
        counts: form.counts || null,
        available_versions: parseArr(form.available_versions as string),
        preview_url: form.preview_url || null,
        download_url: form.download_url || null,
        featured: !!form.featured,
      });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  const setField = (key: string, val: any) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Music Library</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => {
              const headers = ["id","title","artist_name","album","genre","bpm","duration_seconds","audio_url","cover_image_url","isrc","status"];
              const csvRows = [headers.join(",")];
              for (const t of tracks) {
                const row = headers.map(h => {
                  const val = (t as any)[h] ?? "";
                  const s = String(val);
                  return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
                });
                csvRows.push(row.join(","));
              }
              const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a"); a.href = url; a.download = "catalog_export.csv"; a.click();
              URL.revokeObjectURL(url);
            }}><Download className="h-4 w-4 mr-2" />Export CSV</Button>
            <Button variant="outline" onClick={() => setBatchOpen(true)}><FileUp className="h-4 w-4 mr-2" />Batch Import</Button>
            <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" />Add Track</Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search title or artist…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={genreFilter} onValueChange={setGenreFilter}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Genre" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Genres</SelectItem>
              {genres.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={moodFilter} onValueChange={setMoodFilter}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Mood" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Moods</SelectItem>
              {moods.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-md border bg-background overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Artist</TableHead>
                <TableHead>Genre</TableHead>
                <TableHead>Mood</TableHead>
                <TableHead>BPM</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No tracks found</TableCell></TableRow>
              ) : (
                filtered.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      {t.cover_image_url ? (
                        <img src={t.cover_image_url} alt="" className="w-10 h-10 rounded object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center"><Music className="h-4 w-4 text-muted-foreground" /></div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium"><button className="hover:underline text-left" onClick={() => navigate(`/admin/music/${t.id}`)}>{t.title}</button></TableCell>
                    <TableCell>{t.artist_name}</TableCell>
                    <TableCell>{t.genre ?? "—"}</TableCell>
                    <TableCell>{t.mood ?? "—"}</TableCell>
                    <TableCell>{t.bpm ?? "—"}</TableCell>
                    <TableCell>{formatDuration(t.duration_seconds)}</TableCell>
                    <TableCell>
                      <Badge variant={t.status === "active" ? "default" : "secondary"}>{t.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/music/${t.id}`)}><Pencil className="h-4 w-4" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete track?</AlertDialogTitle>
                              <AlertDialogDescription>This will permanently delete "{t.title}". This cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMutation.mutate(t.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) closeDialog(); else setDialogOpen(true); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTrack ? "Edit Track" : "Add Track"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Title *</Label>
                <Input required value={form.title} onChange={(e) => setField("title", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Artist *</Label>
                <Input required value={form.artist_name} onChange={(e) => setField("artist_name", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Genre</Label>
                <Input value={form.genre} onChange={(e) => setField("genre", e.target.value)} placeholder="e.g. Pop" />
              </div>
              <div className="space-y-1.5">
                <Label>Mood</Label>
                <Input value={form.mood} onChange={(e) => setField("mood", e.target.value)} placeholder="e.g. Energetic" />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setField("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>BPM</Label>
                <div className="flex gap-2">
                  <Input type="number" value={form.bpm} onChange={(e) => setField("bpm", e.target.value)} className="flex-1" />
                  <Button type="button" variant="outline" size="sm" onClick={handleDetectBpm} disabled={detectingBpm || !form.audio_url}>
                    {detectingBpm ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Zap className="h-4 w-4 mr-1" />Detect</>}
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Duration (seconds)</Label>
                <Input type="number" value={form.duration_seconds} onChange={(e) => setField("duration_seconds", e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Cover Image</Label>
              {form.cover_image_url ? (
                <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted">
                  <img src={form.cover_image_url} alt="Cover" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setField("cover_image_url", "")} className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full aspect-video rounded-lg border-2 border-dashed border-muted-foreground/30 cursor-pointer hover:border-muted-foreground/50 transition-colors">
                  <ImagePlus className="h-8 w-8 text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground">{uploadingCover ? "Uploading…" : "Click to upload cover art"}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} disabled={uploadingCover} />
                </label>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Audio File (MP3)</Label>
              <div className="flex items-center gap-2">
                <input
                  ref={audioInputRef}
                  type="file"
                  accept="audio/mpeg,audio/mp3,audio/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setAudioFile(file);
                  }}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => audioInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  {audioFile ? audioFile.name : "Choose file"}
                </Button>
                {form.audio_url && !audioFile && (
                  <span className="text-xs text-muted-foreground truncate max-w-[200px]">Current: {form.audio_url.split("/").pop()}</span>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Audio URL (or paste link)</Label>
              <Input value={form.audio_url} onChange={(e) => setField("audio_url", e.target.value)} placeholder="Leave empty if uploading file above" />
            </div>
            <div className="space-y-1.5">
              <Label>TikTok Sound URL</Label>
              <Input value={form.tiktok_sound_url} onChange={(e) => setField("tiktok_sound_url", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Instagram Sound URL</Label>
              <Input value={form.instagram_sound_url} onChange={(e) => setField("instagram_sound_url", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Spotify URL</Label>
              <Input value={form.spotify_url} onChange={(e) => setField("spotify_url", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Usage Rules</Label>
              <Textarea value={form.usage_rules} onChange={(e) => setField("usage_rules", e.target.value)} rows={3} />
            </div>

            {/* Rights & Ownership */}
            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm font-semibold w-full py-2 hover:text-primary transition-colors">
                <ChevronDown className="h-4 w-4" />Rights & Ownership
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5"><Label>Master Owner</Label><Input value={form.master_owner} onChange={(e) => setField("master_owner", e.target.value)} /></div>
                  <div className="space-y-1.5"><Label>Publishing Owner</Label><Input value={form.publishing_owner} onChange={(e) => setField("publishing_owner", e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5"><Label>Master Split %</Label><Input type="number" value={form.master_split_percent} onChange={(e) => setField("master_split_percent", e.target.value)} /></div>
                  <div className="space-y-1.5"><Label>Publishing Split %</Label><Input type="number" value={form.publishing_split_percent} onChange={(e) => setField("publishing_split_percent", e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5"><Label>PRO Affiliation</Label><Input value={form.pro_affiliation} onChange={(e) => setField("pro_affiliation", e.target.value)} placeholder="e.g. ASCAP, BMI" /></div>
                  <div className="space-y-1.5"><Label>Content ID Status</Label><Input value={form.content_id_status} onChange={(e) => setField("content_id_status", e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5"><Label>Sync Clearance</Label><Input value={form.sync_clearance} onChange={(e) => setField("sync_clearance", e.target.value)} /></div>
                  <div className="space-y-1.5"><Label>Sample Clearance</Label><Input value={form.sample_clearance} onChange={(e) => setField("sample_clearance", e.target.value)} /></div>
                </div>
                <div className="space-y-1.5"><Label>ISRC</Label><Input value={form.isrc} onChange={(e) => setField("isrc", e.target.value)} /></div>
              </CollapsibleContent>
            </Collapsible>

            {/* Music Metadata */}
            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm font-semibold w-full py-2 hover:text-primary transition-colors">
                <ChevronDown className="h-4 w-4" />Music Metadata
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-2">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5"><Label>Energy Level</Label><Input value={form.energy_level} onChange={(e) => setField("energy_level", e.target.value)} placeholder="e.g. High" /></div>
                  <div className="space-y-1.5"><Label>Vocal Type</Label><Input value={form.vocal_type} onChange={(e) => setField("vocal_type", e.target.value)} placeholder="e.g. Male, Instrumental" /></div>
                  <div className="space-y-1.5"><Label>Drop Time (sec)</Label><Input type="number" value={form.drop_time_seconds} onChange={(e) => setField("drop_time_seconds", e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5"><Label>Counts</Label><Input value={form.counts} onChange={(e) => setField("counts", e.target.value)} /></div>
                  <div className="space-y-1.5"><Label>Mood Tags (comma-separated)</Label><Input value={form.mood_tags_csv} onChange={(e) => setField("mood_tags_csv", e.target.value)} placeholder="e.g. happy, upbeat" /></div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Dance Fit */}
            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm font-semibold w-full py-2 hover:text-primary transition-colors">
                <ChevronDown className="h-4 w-4" />Dance Fit
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-2">
                <div className="space-y-1.5"><Label>Dance Style Fit (comma-separated)</Label><Input value={form.dance_style_fit} onChange={(e) => setField("dance_style_fit", e.target.value)} placeholder="e.g. hip-hop, latin" /></div>
                <div className="flex gap-6 flex-wrap">
                  <div className="flex items-center gap-2"><Switch checked={!!form.battle_friendly} onCheckedChange={(v) => setField("battle_friendly", v)} /><Label>Battle Friendly</Label></div>
                  <div className="flex items-center gap-2"><Switch checked={!!form.choreography_friendly} onCheckedChange={(v) => setField("choreography_friendly", v)} /><Label>Choreography Friendly</Label></div>
                  <div className="flex items-center gap-2"><Switch checked={!!form.freestyle_friendly} onCheckedChange={(v) => setField("freestyle_friendly", v)} /><Label>Freestyle Friendly</Label></div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Versions & Links */}
            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm font-semibold w-full py-2 hover:text-primary transition-colors">
                <ChevronDown className="h-4 w-4" />Versions & Links
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5"><Label>Internal Catalog ID</Label><Input value={form.internal_catalog_id} onChange={(e) => setField("internal_catalog_id", e.target.value)} /></div>
                  <div className="space-y-1.5"><Label>Version Name</Label><Input value={form.version_name} onChange={(e) => setField("version_name", e.target.value)} placeholder="e.g. Radio Edit" /></div>
                </div>
                <div className="space-y-1.5"><Label>Available Versions (comma-separated)</Label><Input value={form.available_versions} onChange={(e) => setField("available_versions", e.target.value)} placeholder="e.g. Original, Clean, Instrumental" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5"><Label>Preview URL</Label><Input value={form.preview_url} onChange={(e) => setField("preview_url", e.target.value)} /></div>
                  <div className="space-y-1.5"><Label>Download URL</Label><Input value={form.download_url} onChange={(e) => setField("download_url", e.target.value)} /></div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" disabled={saveMutation.isPending || uploading}>
                {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading…</> : saveMutation.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <BatchTrackImport
        open={batchOpen}
        onOpenChange={setBatchOpen}
        existingTracks={tracks.map(t => ({ id: t.id, title: t.title, artist_name: t.artist_name, isrc: (t as any).isrc, audio_url: (t as any).audio_url, genre: (t as any).genre, bpm: (t as any).bpm, album: (t as any).album, status: t.status }))}
        callAdmin={callAdmin}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["admin-tracks"] })}
      />
    </AdminLayout>
  );
}
