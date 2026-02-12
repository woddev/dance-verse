import { useEffect, useState } from "react";
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
import {
  Music, BarChart3, FileCheck, DollarSign, Users, Plus, Trash2,
  CheckCircle, XCircle, Clock, ExternalLink,
} from "lucide-react";
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
  campaigns: { title: string; artist_name: string } | null;
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
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [addTrackOpen, setAddTrackOpen] = useState(false);
  const [trackForm, setTrackForm] = useState({ title: "", artist_name: "", genre: "", bpm: "", tiktok_sound_url: "", instagram_sound_url: "" });
  const [saving, setSaving] = useState(false);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectId, setRejectId] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [s, t, sub, p] = await Promise.all([
        callAdmin("dashboard-stats"),
        callAdmin("tracks"),
        callAdmin("submissions"),
        callAdmin("payouts"),
      ]);
      setStats(s);
      setTracks(t);
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
    try {
      const newTrack = await callAdmin("create-track", undefined, {
        title: trackForm.title,
        artist_name: trackForm.artist_name,
        genre: trackForm.genre || null,
        bpm: trackForm.bpm ? parseInt(trackForm.bpm) : null,
        tiktok_sound_url: trackForm.tiktok_sound_url || null,
        instagram_sound_url: trackForm.instagram_sound_url || null,
      });
      setTracks((prev) => [newTrack, ...prev]);
      setTrackForm({ title: "", artist_name: "", genre: "", bpm: "", tiktok_sound_url: "", instagram_sound_url: "" });
      setAddTrackOpen(false);
      toast({ title: "Track added" });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
    setSaving(false);
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
                <DialogContent>
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
                      <Label>TikTok Sound URL</Label>
                      <Input value={trackForm.tiktok_sound_url} onChange={(e) => setTrackForm((f) => ({ ...f, tiktok_sound_url: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label>Instagram Sound URL</Label>
                      <Input value={trackForm.instagram_sound_url} onChange={(e) => setTrackForm((f) => ({ ...f, instagram_sound_url: e.target.value }))} />
                    </div>
                    <Button className="w-full" onClick={handleAddTrack} disabled={saving || !trackForm.title || !trackForm.artist_name}>
                      {saving ? "Saving…" : "Add Track"}
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
