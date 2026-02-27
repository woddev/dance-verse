import { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useAdminApi } from "@/hooks/useAdminApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle, Play, Pause, Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useRef, useState as useStateRef } from "react";

interface ProducerApp {
  id: string;
  email: string;
  legal_name: string;
  stage_name: string | null;
  bio: string | null;
  genre: string | null;
  portfolio_url: string | null;
  soundcloud_url: string | null;
  website_url: string | null;
  location: string | null;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  demo_url: string | null;
  demo_signed_url: string | null;
  tiktok_url: string | null;
  instagram_url: string | null;
  spotify_url: string | null;
  other_social_url: string | null;
}

function DemoPlayer({ url, name }: { url: string; name: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useStateRef(false);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaying(!playing);
  };

  return (
    <div className="flex items-center gap-2 mt-2 p-2 rounded-md bg-muted">
      <audio
        ref={audioRef}
        src={url}
        onEnded={() => setPlaying(false)}
        preload="none"
      />
      <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={toggle}>
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>
      <span className="text-sm truncate flex-1">Demo Track</span>
      <a href={url} download={name} target="_blank" rel="noreferrer">
        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0">
          <Download className="h-4 w-4" />
        </Button>
      </a>
    </div>
  );
}

export default function ManageProducerApplications() {
  const { callAdmin } = useAdminApi();
  const { toast } = useToast();
  const [apps, setApps] = useState<ProducerApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchApps = useCallback(async () => {
    try {
      const data = await callAdmin("producer-applications");
      setApps(data);
    } catch (e: any) {
      toast({ title: "Error loading applications", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [callAdmin, toast]);

  useEffect(() => { fetchApps(); }, [fetchApps]);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      await callAdmin("approve-producer", undefined, { application_id: id });
      toast({ title: "Producer approved and invite sent!" });
      fetchApps();
    } catch (e: any) {
      toast({ title: "Error approving", description: e.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectId || !rejectReason.trim()) return;
    setActionLoading(rejectId);
    try {
      await callAdmin("reject-producer", undefined, { application_id: rejectId, rejection_reason: rejectReason.trim() });
      toast({ title: "Application rejected" });
      setRejectId(null);
      setRejectReason("");
      fetchApps();
    } catch (e: any) {
      toast({ title: "Error rejecting", description: e.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const statusColor = (s: string) => s === "approved" ? "default" : s === "rejected" ? "destructive" : "secondary";

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Producer Applications</h1>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : apps.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">No producer applications yet.</p>
        ) : (
          <div className="grid gap-4">
            {apps.map((app) => (
              <Card key={app.id}>
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{app.legal_name}</h3>
                        {app.stage_name && <span className="text-muted-foreground">({app.stage_name})</span>}
                        <Badge variant={statusColor(app.status)}>{app.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{app.email}</p>
                      {app.genre && <p className="text-sm"><span className="font-medium">Genre:</span> {app.genre}</p>}
                      {app.location && <p className="text-sm"><span className="font-medium">Location:</span> {app.location}</p>}
                      {app.bio && <p className="text-sm mt-2">{app.bio}</p>}
                      <div className="flex gap-4 mt-2 flex-wrap">
                        {app.tiktok_url && <a href={app.tiktok_url} target="_blank" rel="noreferrer" className="text-sm text-primary underline">TikTok</a>}
                        {app.instagram_url && <a href={app.instagram_url} target="_blank" rel="noreferrer" className="text-sm text-primary underline">Instagram</a>}
                        {app.spotify_url && <a href={app.spotify_url} target="_blank" rel="noreferrer" className="text-sm text-primary underline">Spotify</a>}
                        {app.other_social_url && <a href={app.other_social_url} target="_blank" rel="noreferrer" className="text-sm text-primary underline">Other</a>}
                        {app.soundcloud_url && <a href={app.soundcloud_url} target="_blank" rel="noreferrer" className="text-sm text-primary underline">SoundCloud</a>}
                        {app.portfolio_url && <a href={app.portfolio_url} target="_blank" rel="noreferrer" className="text-sm text-primary underline">Portfolio</a>}
                        {app.website_url && <a href={app.website_url} target="_blank" rel="noreferrer" className="text-sm text-primary underline">Website</a>}
                      </div>
                      {app.demo_signed_url && (
                        <DemoPlayer url={app.demo_signed_url} name={`${app.legal_name}-demo`} />
                      )}
                      {app.rejection_reason && (
                        <p className="text-sm text-destructive mt-2">Rejection: {app.rejection_reason}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">Applied {new Date(app.created_at).toLocaleDateString()}</p>
                    </div>
                    {app.status === "pending" && (
                      <div className="flex gap-2 shrink-0">
                        <Button size="sm" onClick={() => handleApprove(app.id)} disabled={!!actionLoading}>
                          {actionLoading === app.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle className="h-4 w-4 mr-1" /> Approve</>}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => setRejectId(app.id)} disabled={!!actionLoading}>
                          <XCircle className="h-4 w-4 mr-1" /> Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!rejectId} onOpenChange={(open) => { if (!open) { setRejectId(null); setRejectReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Application</DialogTitle>
          </DialogHeader>
          <Textarea placeholder="Reason for rejection…" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectReason.trim() || !!actionLoading}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
