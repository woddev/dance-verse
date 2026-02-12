import { useEffect, useState, useRef } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useAdminApi } from "@/hooks/useAdminApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Music, BarChart3, FileCheck, DollarSign, Users, Plus, Trash2,
  CheckCircle, XCircle, Clock, ExternalLink, Play, Pause,
} from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

interface DashboardStats {
  totalTracks: number;
  totalCampaigns: number;
  activeCampaigns: number;
  totalSubmissions: number;
  pendingSubmissions: number;
  approvedSubmissions: number;
  totalPayouts: number;
  totalPayoutAmount: number;
  pendingPayouts: number;
  totalDancers: number;
}

interface Track {
  id: string;
  title: string;
  artist_name: string;
  cover_image_url: string | null;
  audio_url: string | null;
  tiktok_sound_url: string | null;
  instagram_sound_url: string | null;
  genre: string | null;
  bpm: number | null;
  status: string;
  created_at: string;
}

interface Submission {
  id: string;
  video_url: string;
  platform: string;
  review_status: string;
  submitted_at: string;
  rejection_reason: string | null;
  campaigns: { title: string; artist_name: string; pay_scale: any } | null;
  profiles: { full_name: string | null; instagram_handle: string | null; tiktok_handle: string | null } | null;
}

interface Payout {
  id: string;
  amount_cents: number;
  status: string;
  created_at: string;
  profiles: { full_name: string | null } | null;
  submissions: { video_url: string; platform: string; campaigns: { title: string } | null } | null;
}

interface Campaign {
  id: string;
  title: string;
  artist_name: string;
  description: string | null;
  status: string;
  max_creators: number;
  due_days_after_accept: number;
  required_hashtags: string[];
  pay_scale: any;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  tracks: { title: string; artist_name: string } | null;
}

const statCards = [
  { key: "totalTracks", label: "Tracks", icon: Music, color: "text-foreground" },
  { key: "activeCampaigns", label: "Active Campaigns", icon: BarChart3, color: "text-foreground" },
  { key: "pendingSubmissions", label: "Pending Review", icon: FileCheck, color: "text-foreground" },
  { key: "totalDancers", label: "Dancers", icon: Users, color: "text-foreground" },
] as const;

export default function AdminDashboard() {
  const { callAdmin } = useAdminApi();
  const { toast } = useToast();
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [addTrackOpen, setAddTrackOpen] = useState(false);
  const [trackForm, setTrackForm] = useState({ title: "", artist_name: "", genre: "", bpm: "", tiktok_sound_url: "", instagram_sound_url: "", spotify_url: "", usage_rules: "", mood: "" });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [addCampaignOpen, setAddCampaignOpen] = useState(false);
  const [campaignForm, setCampaignForm] = useState({
    title: "", track_id: "", description: "", hashtags: "",
    payout_amount: "", max_creators: "50", due_days_after_accept: "7",
    start_date: undefined as Date | undefined,
    end_date: undefined as Date | undefined,
  });
  const [campaignSaving, setCampaignSaving] = useState(false);
  const [payingOut, setPayingOut] = useState<string | null>(null);
  const [paidSubmissions, setPaidSubmissions] = useState<Set<string>>(new Set());

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [s, t, c, sub, p] = await Promise.all([
        callAdmin("dashboard-stats"),
        callAdmin("tracks"),
        callAdmin("campaigns"),
        callAdmin("submissions"),
        callAdmin("payouts"),
      ]);
      setStats(s);
      setTracks(t);
      setCampaigns(c);
      setSubmissions(sub);
      setPayouts(p);
    } catch (err: any) {
      toast({ title: "Error loading data", description: err.message, variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleAddTrack = async () => {
    setSaving(true);
    setUploading(true);
    try {
      let cover_image_url: string | null = null;
      let audio_url: string | null = null;

      if (coverFile) {
        const ext = coverFile.name.split('.').pop();
        const path = `covers/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("campaign-assets").upload(path, coverFile);
        if (upErr) throw upErr;
        const { data: pubData } = supabase.storage.from("campaign-assets").getPublicUrl(path);
        cover_image_url = pubData.publicUrl;
      }

      if (audioFile) {
        const ext = audioFile.name.split('.').pop();
        const path = `audio/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("campaign-assets").upload(path, audioFile);
        if (upErr) throw upErr;
        const { data: pubData } = supabase.storage.from("campaign-assets").getPublicUrl(path);
        audio_url = pubData.publicUrl;
      }

      const newTrack = await callAdmin("create-track", undefined, {
        title: trackForm.title,
        artist_name: trackForm.artist_name,
        cover_image_url,
        audio_url,
        genre: trackForm.genre || null,
        bpm: trackForm.bpm ? parseInt(trackForm.bpm) : null,
        tiktok_sound_url: trackForm.tiktok_sound_url || null,
        instagram_sound_url: trackForm.instagram_sound_url || null,
        spotify_url: trackForm.spotify_url || null,
        usage_rules: trackForm.usage_rules || null,
        mood: trackForm.mood || null,
      });
      setTracks((prev) => [newTrack, ...prev]);
      setTrackForm({ title: "", artist_name: "", genre: "", bpm: "", tiktok_sound_url: "", instagram_sound_url: "", spotify_url: "", usage_rules: "", mood: "" });
      setCoverFile(null);
      setAudioFile(null);
      setAddTrackOpen(false);
      toast({ title: "Track added" });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
    setSaving(false);
    setUploading(false);
  };

  const handleDeleteTrack = async (id: string) => {
    try {
      await callAdmin("delete-track", { id });
      setTracks((prev) => prev.filter((t) => t.id !== id));
      toast({ title: "Track deleted" });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleCreateCampaign = async () => {
    setCampaignSaving(true);
    try {
      const selectedTrack = tracks.find((t) => t.id === campaignForm.track_id);
      const hashtags = campaignForm.hashtags.split(",").map((h) => h.trim()).filter(Boolean);
      const payAmount = parseInt(campaignForm.payout_amount);
      const newCampaign = await callAdmin("create-campaign", undefined, {
        title: campaignForm.title,
        artist_name: selectedTrack?.artist_name ?? "",
        description: campaignForm.description || null,
        track_id: campaignForm.track_id || null,
        required_hashtags: hashtags,
        pay_scale: payAmount ? [{ views: 0, amount_cents: payAmount * 100 }] : [],
        max_creators: parseInt(campaignForm.max_creators) || 50,
        due_days_after_accept: parseInt(campaignForm.due_days_after_accept) || 7,
        start_date: campaignForm.start_date ? format(campaignForm.start_date, "yyyy-MM-dd") : null,
        end_date: campaignForm.end_date ? format(campaignForm.end_date, "yyyy-MM-dd") : null,
        tiktok_sound_url: selectedTrack?.tiktok_sound_url ?? null,
        instagram_sound_url: selectedTrack?.instagram_sound_url ?? null,
        cover_image_url: selectedTrack?.cover_image_url ?? null,
      });
      setCampaigns((prev) => [newCampaign, ...prev]);
      setCampaignForm({ title: "", track_id: "", description: "", hashtags: "", payout_amount: "", max_creators: "50", due_days_after_accept: "7", start_date: undefined, end_date: undefined });
      setAddCampaignOpen(false);
      toast({ title: "Campaign created as draft" });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
    setCampaignSaving(false);
  };

  const handleCampaignStatus = async (campaignId: string, status: string) => {
    try {
      await callAdmin("update-campaign-status", undefined, { campaign_id: campaignId, status });
      setCampaigns((prev) => prev.map((c) => c.id === campaignId ? { ...c, status } : c));
      toast({ title: `Campaign ${status}` });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleReview = async (submissionId: string, status: "approved" | "rejected") => {
    if (status === "rejected" && !rejectReason) {
      setRejectId(submissionId);
      return;
    }
    setReviewing(submissionId);
    try {
      await callAdmin("review-submission", undefined, {
        submission_id: submissionId,
        status,
        rejection_reason: status === "rejected" ? rejectReason : null,
      });
      setSubmissions((prev) =>
        prev.map((s) => s.id === submissionId ? { ...s, review_status: status } : s)
      );
      setRejectId(null);
      setRejectReason("");
      toast({ title: `Submission ${status}` });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
    setReviewing(null);
  };

  const handlePayout = async (sub: Submission) => {
    const payScale = sub.campaigns?.pay_scale as any[];
    const amountCents = payScale?.[0]?.amount_cents ?? 0;
    if (!amountCents) {
      toast({ title: "No payout amount configured for this campaign", variant: "destructive" });
      return;
    }
    setPayingOut(sub.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payout`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ submission_id: sub.id, amount_cents: amountCents }),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed" }));
        throw new Error(err.error ?? "Failed");
      }

      setPaidSubmissions((prev) => new Set(prev).add(sub.id));
      toast({ title: `Payout of $${(amountCents / 100).toFixed(2)} sent` });
      fetchAll(); // Refresh data
    } catch (err: any) {
      toast({ title: "Payout failed", description: err.message, variant: "destructive" });
    }
    setPayingOut(null);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map(({ key, label, icon: Icon }) => (
              <Card key={key} className="border border-border">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats[key]}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tracks">Tracks</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="submissions">Submissions</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border border-border">
                <CardHeader className="pb-2"><CardTitle className="text-base">Campaigns</CardTitle></CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p>Active: <span className="font-semibold">{stats?.activeCampaigns}</span></p>
                  <p>Total: <span className="font-semibold">{stats?.totalCampaigns}</span></p>
                </CardContent>
              </Card>
              <Card className="border border-border">
                <CardHeader className="pb-2"><CardTitle className="text-base">Submissions</CardTitle></CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p>Pending: <span className="font-semibold">{stats?.pendingSubmissions}</span></p>
                  <p>Approved: <span className="font-semibold">{stats?.approvedSubmissions}</span></p>
                  <p>Total: <span className="font-semibold">{stats?.totalSubmissions}</span></p>
                </CardContent>
              </Card>
              <Card className="border border-border">
                <CardHeader className="pb-2"><CardTitle className="text-base">Payouts</CardTitle></CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p>Pending: <span className="font-semibold">{stats?.pendingPayouts}</span></p>
                  <p>Total paid: <span className="font-semibold">${((stats?.totalPayoutAmount ?? 0) / 100).toFixed(2)}</span></p>
                </CardContent>
              </Card>
              <Card className="border border-border">
                <CardHeader className="pb-2"><CardTitle className="text-base">Dancers</CardTitle></CardHeader>
                <CardContent className="text-sm">
                  <p>Total registered: <span className="font-semibold">{stats?.totalDancers}</span></p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tracks */}
          <TabsContent value="tracks" className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Music Library</h2>
              <Dialog open={addTrackOpen} onOpenChange={setAddTrackOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Track</Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>Add New Track</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label>Title *</Label>
                      <Input value={trackForm.title} onChange={(e) => setTrackForm((f) => ({ ...f, title: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label>Artist *</Label>
                      <Input value={trackForm.artist_name} onChange={(e) => setTrackForm((f) => ({ ...f, artist_name: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label>Cover Image</Label>
                      <Input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Audio Preview</Label>
                      <Input type="file" accept="audio/*" onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label>Genre</Label>
                        <Input value={trackForm.genre} onChange={(e) => setTrackForm((f) => ({ ...f, genre: e.target.value }))} />
                      </div>
                      <div className="space-y-1">
                        <Label>BPM</Label>
                        <Input type="number" value={trackForm.bpm} onChange={(e) => setTrackForm((f) => ({ ...f, bpm: e.target.value }))} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label>Mood</Label>
                      <Input placeholder="e.g. Energetic, Chill, Dark" value={trackForm.mood} onChange={(e) => setTrackForm((f) => ({ ...f, mood: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label>Spotify URL</Label>
                      <Input value={trackForm.spotify_url} onChange={(e) => setTrackForm((f) => ({ ...f, spotify_url: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label>TikTok Sound URL</Label>
                      <Input value={trackForm.tiktok_sound_url} onChange={(e) => setTrackForm((f) => ({ ...f, tiktok_sound_url: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label>Instagram Sound URL</Label>
                      <Input value={trackForm.instagram_sound_url} onChange={(e) => setTrackForm((f) => ({ ...f, instagram_sound_url: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label>Usage Rules</Label>
                      <Textarea placeholder="Describe how dancers should use this track…" value={trackForm.usage_rules} onChange={(e) => setTrackForm((f) => ({ ...f, usage_rules: e.target.value }))} />
                    </div>
                    <Button className="w-full" onClick={handleAddTrack} disabled={saving || !trackForm.title || !trackForm.artist_name}>
                      {saving ? (uploading ? "Uploading…" : "Saving…") : "Add Track"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {tracks.length === 0 ? (
              <p className="text-muted-foreground text-sm">No tracks yet. Add your first track above.</p>
            ) : (
              <div className="space-y-2">
                {tracks.map((track) => (
                  <Card key={track.id} className="border border-border">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="h-10 w-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                        <Music className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{track.title}</p>
                        <p className="text-xs text-muted-foreground">{track.artist_name}{track.genre ? ` · ${track.genre}` : ""}{track.bpm ? ` · ${track.bpm} BPM` : ""}</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteTrack(track.id)}>
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Campaigns */}
          <TabsContent value="campaigns" className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Campaigns</h2>
              <Dialog open={addCampaignOpen} onOpenChange={setAddCampaignOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Create Campaign</Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>Create Campaign from Track</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label>Select Track *</Label>
                      <Select value={campaignForm.track_id} onValueChange={(v) => setCampaignForm((f) => ({ ...f, track_id: v }))}>
                        <SelectTrigger><SelectValue placeholder="Choose a track" /></SelectTrigger>
                        <SelectContent>
                          {tracks.map((t) => (
                            <SelectItem key={t.id} value={t.id}>{t.title} — {t.artist_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Campaign Name *</Label>
                      <Input value={campaignForm.title} onChange={(e) => setCampaignForm((f) => ({ ...f, title: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label>Instructions</Label>
                      <Textarea placeholder="Dance instructions for creators…" value={campaignForm.description} onChange={(e) => setCampaignForm((f) => ({ ...f, description: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label>Hashtags (comma-separated)</Label>
                      <Input placeholder="#dance, #challenge" value={campaignForm.hashtags} onChange={(e) => setCampaignForm((f) => ({ ...f, hashtags: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label>Payout Amount ($)</Label>
                        <Input type="number" value={campaignForm.payout_amount} onChange={(e) => setCampaignForm((f) => ({ ...f, payout_amount: e.target.value }))} />
                      </div>
                      <div className="space-y-1">
                        <Label>Max Creators</Label>
                        <Input type="number" value={campaignForm.max_creators} onChange={(e) => setCampaignForm((f) => ({ ...f, max_creators: e.target.value }))} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label>Days to Submit After Accept</Label>
                      <Input type="number" value={campaignForm.due_days_after_accept} onChange={(e) => setCampaignForm((f) => ({ ...f, due_days_after_accept: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label>Start Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !campaignForm.start_date && "text-muted-foreground")}>
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {campaignForm.start_date ? format(campaignForm.start_date, "PPP") : "Pick a date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={campaignForm.start_date} onSelect={(d) => setCampaignForm((f) => ({ ...f, start_date: d }))} initialFocus className={cn("p-3 pointer-events-auto")} />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-1">
                        <Label>End Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !campaignForm.end_date && "text-muted-foreground")}>
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {campaignForm.end_date ? format(campaignForm.end_date, "PPP") : "Pick a date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={campaignForm.end_date} onSelect={(d) => setCampaignForm((f) => ({ ...f, end_date: d }))} initialFocus className={cn("p-3 pointer-events-auto")} />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                    <Button className="w-full" onClick={handleCreateCampaign} disabled={campaignSaving || !campaignForm.title || !campaignForm.track_id}>
                      {campaignSaving ? "Creating…" : "Create Campaign (Draft)"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {campaigns.length === 0 ? (
              <p className="text-muted-foreground text-sm">No campaigns yet. Create one from a track above.</p>
            ) : (
              <div className="space-y-2">
                {campaigns.map((campaign) => (
                  <Card key={campaign.id} className="border border-border">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-muted flex-shrink-0">
                        <BarChart3 className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{campaign.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {campaign.tracks?.artist_name ?? campaign.artist_name} · {campaign.max_creators} max · {campaign.due_days_after_accept}d deadline
                        </p>
                        {campaign.start_date && (
                          <p className="text-xs text-muted-foreground">
                            {campaign.start_date}{campaign.end_date ? ` → ${campaign.end_date}` : ""}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={campaign.status === "active" ? "default" : campaign.status === "draft" ? "secondary" : campaign.status === "paused" ? "outline" : "destructive"}>
                          {campaign.status}
                        </Badge>
                        {campaign.status === "draft" && (
                          <Button size="sm" onClick={() => handleCampaignStatus(campaign.id, "active")}>
                            <Play className="h-3.5 w-3.5 mr-1" /> Activate
                          </Button>
                        )}
                        {campaign.status === "active" && (
                          <Button size="sm" variant="outline" onClick={() => handleCampaignStatus(campaign.id, "paused")}>
                            <Pause className="h-3.5 w-3.5 mr-1" /> Pause
                          </Button>
                        )}
                        {campaign.status === "paused" && (
                          <Button size="sm" onClick={() => handleCampaignStatus(campaign.id, "active")}>
                            <Play className="h-3.5 w-3.5 mr-1" /> Resume
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Submissions */}
          <TabsContent value="submissions" className="space-y-4 mt-4">
            <h2 className="text-lg font-semibold">Submissions Review</h2>
            {submissions.length === 0 ? (
              <p className="text-muted-foreground text-sm">No submissions yet.</p>
            ) : (
              <div className="space-y-3">
                {submissions.map((sub) => {
                  const isPending = sub.review_status === "pending";
                  return (
                    <Card key={sub.id} className="border border-border">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{sub.profiles?.full_name ?? "Unknown Dancer"}</p>
                            <p className="text-xs text-muted-foreground">
                              {sub.campaigns?.title} · {sub.campaigns?.artist_name} · {sub.platform}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Submitted {new Date(sub.submitted_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <a href={sub.video_url} target="_blank" rel="noopener noreferrer">
                              <Button variant="outline" size="sm">
                                <ExternalLink className="h-3.5 w-3.5 mr-1" /> View
                              </Button>
                            </a>
                            <Badge variant={sub.review_status === "approved" ? "default" : sub.review_status === "rejected" ? "destructive" : "secondary"}>
                              {sub.review_status}
                            </Badge>
                          </div>
                        </div>

                        {isPending && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleReview(sub.id, "approved")}
                              disabled={reviewing === sub.id}
                            >
                              <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleReview(sub.id, "rejected")}
                              disabled={reviewing === sub.id}
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                            </Button>
                          </div>
                        )}

                        {sub.review_status === "approved" && !paidSubmissions.has(sub.id) && (
                          <div className="flex gap-2 items-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePayout(sub)}
                              disabled={payingOut === sub.id}
                            >
                              <DollarSign className="h-3.5 w-3.5 mr-1" />
                              {payingOut === sub.id ? "Processing…" : `Pay $${((sub.campaigns?.pay_scale as any[])?.[0]?.amount_cents / 100 || 0).toFixed(2)}`}
                            </Button>
                          </div>
                        )}

                        {paidSubmissions.has(sub.id) && (
                          <Badge variant="default" className="text-xs">Paid</Badge>
                        )}

                        {rejectId === sub.id && (
                          <div className="flex gap-2">
                            <Input
                              placeholder="Reason for rejection…"
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                            />
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={!rejectReason || reviewing === sub.id}
                              onClick={() => handleReview(sub.id, "rejected")}
                            >
                              Confirm
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Payments */}
          <TabsContent value="payments" className="space-y-4 mt-4">
            <h2 className="text-lg font-semibold">Payouts</h2>
            {payouts.length === 0 ? (
              <p className="text-muted-foreground text-sm">No payouts yet.</p>
            ) : (
              <div className="space-y-2">
                {payouts.map((payout) => (
                  <Card key={payout.id} className="border border-border">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-muted">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{payout.profiles?.full_name ?? "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">
                          {payout.submissions?.campaigns?.title} · {payout.submissions?.platform}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">${(payout.amount_cents / 100).toFixed(2)}</p>
                        <Badge variant={payout.status === "completed" ? "default" : payout.status === "failed" ? "destructive" : "secondary"} className="text-xs">
                          {payout.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
