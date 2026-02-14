import { useState, useMemo, useRef } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Pencil, Trash2, Music, Upload, Loader2, ImagePlus, X } from "lucide-react";

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

  const [search, setSearch] = useState("");
  const [genreFilter, setGenreFilter] = useState("all");
  const [moodFilter, setMoodFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [dialogOpen, setDialogOpen] = useState(false);
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
    });
    setDialogOpen(true);
  }

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
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
      if (audioFile) {
        audioUrl = await uploadFileToStorage(audioFile, "tracks");
      }
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
        bpm: form.bpm ? parseInt(form.bpm) : null,
        duration_seconds: form.duration_seconds ? parseInt(form.duration_seconds) : null,
        usage_rules: form.usage_rules || null,
        status: form.status,
      });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  const setField = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Music Library</h1>
          <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" />Add Track</Button>
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
                    <TableCell className="font-medium">{t.title}</TableCell>
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
                        <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
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
                <Input type="number" value={form.bpm} onChange={(e) => setField("bpm", e.target.value)} />
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" disabled={saveMutation.isPending || uploading}>
                {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading…</> : saveMutation.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
