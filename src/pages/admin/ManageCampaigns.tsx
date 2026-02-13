import { useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useAdminApi } from "@/hooks/useAdminApi";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, Plus, Play, Pause, Pencil } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Track {
  id: string;
  title: string;
  artist_name: string;
  cover_image_url: string | null;
  tiktok_sound_url: string | null;
  instagram_sound_url: string | null;
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
  required_mentions: string[];
  required_platforms: string[];
  pay_scale: any;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  track_id: string | null;
  cover_image_url: string | null;
  tiktok_sound_url: string | null;
  instagram_sound_url: string | null;
  song_url: string | null;
  tracks: { title: string; artist_name: string } | null;
}

const emptyForm = {
  title: "", track_id: "", description: "", hashtags: "", mentions: "",
  payout_amount: "", max_creators: "50", due_days_after_accept: "7",
  start_date: undefined as Date | undefined,
  end_date: undefined as Date | undefined,
};

export default function ManageCampaigns() {
  const { callAdmin } = useAdminApi();
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [c, t] = await Promise.all([callAdmin("campaigns"), callAdmin("tracks")]);
      setCampaigns(c);
      setTracks(t);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async () => {
    setSaving(true);
    try {
      const selectedTrack = tracks.find((t) => t.id === form.track_id);
      const hashtags = form.hashtags.split(",").map((h) => h.trim()).filter(Boolean);
      const payAmount = parseInt(form.payout_amount);
      const newCampaign = await callAdmin("create-campaign", undefined, {
        title: form.title,
        artist_name: selectedTrack?.artist_name ?? "",
        description: form.description || null,
        track_id: form.track_id || null,
        required_hashtags: hashtags,
        pay_scale: payAmount ? [{ views: 0, amount_cents: payAmount * 100 }] : [],
        max_creators: parseInt(form.max_creators) || 50,
        due_days_after_accept: parseInt(form.due_days_after_accept) || 7,
        start_date: form.start_date ? format(form.start_date, "yyyy-MM-dd") : null,
        end_date: form.end_date ? format(form.end_date, "yyyy-MM-dd") : null,
        tiktok_sound_url: selectedTrack?.tiktok_sound_url ?? null,
        instagram_sound_url: selectedTrack?.instagram_sound_url ?? null,
        cover_image_url: selectedTrack?.cover_image_url ?? null,
      });
      setCampaigns((prev) => [newCampaign, ...prev]);
      setForm({ ...emptyForm });
      setAddOpen(false);
      toast({ title: "Campaign created as draft" });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const openEdit = (c: Campaign) => {
    const payAmount = c.pay_scale?.[0]?.amount_cents ? (c.pay_scale[0].amount_cents / 100).toString() : "";
    setForm({
      title: c.title,
      track_id: c.track_id ?? "",
      description: c.description ?? "",
      hashtags: c.required_hashtags.join(", "),
      mentions: (c.required_mentions ?? []).join(", "),
      payout_amount: payAmount,
      max_creators: c.max_creators.toString(),
      due_days_after_accept: c.due_days_after_accept.toString(),
      start_date: c.start_date ? new Date(c.start_date) : undefined,
      end_date: c.end_date ? new Date(c.end_date) : undefined,
    });
    setEditingId(c.id);
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      const selectedTrack = tracks.find((t) => t.id === form.track_id);
      const hashtags = form.hashtags.split(",").map((h) => h.trim()).filter(Boolean);
      const mentions = form.mentions.split(",").map((m) => m.trim()).filter(Boolean);
      const payAmount = parseInt(form.payout_amount);
      const updated = await callAdmin("update-campaign", undefined, {
        campaign_id: editingId,
        title: form.title,
        artist_name: selectedTrack?.artist_name ?? "",
        description: form.description || null,
        track_id: form.track_id || null,
        required_hashtags: hashtags,
        required_mentions: mentions,
        pay_scale: payAmount ? [{ views: 0, amount_cents: payAmount * 100 }] : [],
        max_creators: parseInt(form.max_creators) || 50,
        due_days_after_accept: parseInt(form.due_days_after_accept) || 7,
        start_date: form.start_date ? format(form.start_date, "yyyy-MM-dd") : null,
        end_date: form.end_date ? format(form.end_date, "yyyy-MM-dd") : null,
        tiktok_sound_url: selectedTrack?.tiktok_sound_url ?? null,
        instagram_sound_url: selectedTrack?.instagram_sound_url ?? null,
        cover_image_url: selectedTrack?.cover_image_url ?? null,
      });
      setCampaigns((prev) => prev.map((c) => c.id === editingId ? updated : c));
      setEditOpen(false);
      setEditingId(null);
      toast({ title: "Campaign updated" });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const handleStatus = async (id: string, status: string) => {
    try {
      await callAdmin("update-campaign-status", undefined, { campaign_id: id, status });
      setCampaigns((prev) => prev.map((c) => c.id === id ? { ...c, status } : c));
      toast({ title: `Campaign ${status}` });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Create Campaign</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Create Campaign from Track</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Select Track *</Label>
                  <Select value={form.track_id} onValueChange={(v) => setForm((f) => ({ ...f, track_id: v }))}>
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
                  <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Instructions</Label>
                  <Textarea placeholder="Dance instructions for creators…" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Hashtags (comma-separated)</Label>
                  <Input placeholder="#dance, #challenge" value={form.hashtags} onChange={(e) => setForm((f) => ({ ...f, hashtags: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Payout Amount ($)</Label>
                    <Input type="number" value={form.payout_amount} onChange={(e) => setForm((f) => ({ ...f, payout_amount: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Max Creators</Label>
                    <Input type="number" value={form.max_creators} onChange={(e) => setForm((f) => ({ ...f, max_creators: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Days to Submit After Accept</Label>
                  <Input type="number" value={form.due_days_after_accept} onChange={(e) => setForm((f) => ({ ...f, due_days_after_accept: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.start_date && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {form.start_date ? format(form.start_date, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={form.start_date} onSelect={(d) => setForm((f) => ({ ...f, start_date: d }))} initialFocus className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-1">
                    <Label>End Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.end_date && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {form.end_date ? format(form.end_date, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={form.end_date} onSelect={(d) => setForm((f) => ({ ...f, end_date: d }))} initialFocus className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <Button className="w-full" onClick={handleCreate} disabled={saving || !form.title || !form.track_id}>
                  {saving ? "Creating…" : "Create Campaign (Draft)"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {campaigns.length === 0 ? (
          <p className="text-muted-foreground text-sm">No campaigns yet. Create one above.</p>
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
                    {campaign.pay_scale?.[0]?.amount_cents && (
                      <p className="text-xs text-muted-foreground">Payout: ${(campaign.pay_scale[0].amount_cents / 100).toFixed(2)}</p>
                    )}
                    {campaign.start_date && (
                      <p className="text-xs text-muted-foreground">
                        {campaign.start_date}{campaign.end_date ? ` → ${campaign.end_date}` : ""}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(campaign)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Badge variant={campaign.status === "active" ? "default" : campaign.status === "draft" ? "secondary" : campaign.status === "paused" ? "outline" : "destructive"}>
                      {campaign.status}
                    </Badge>
                    {campaign.status === "draft" && (
                      <Button size="sm" onClick={() => handleStatus(campaign.id, "active")}>
                        <Play className="h-3.5 w-3.5 mr-1" /> Activate
                      </Button>
                    )}
                    {campaign.status === "active" && (
                      <Button size="sm" variant="outline" onClick={() => handleStatus(campaign.id, "paused")}>
                        <Pause className="h-3.5 w-3.5 mr-1" /> Pause
                      </Button>
                    )}
                    {campaign.status === "paused" && (
                      <Button size="sm" onClick={() => handleStatus(campaign.id, "active")}>
                        <Play className="h-3.5 w-3.5 mr-1" /> Resume
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) setEditingId(null); }}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Edit Campaign</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Select Track *</Label>
                <Select value={form.track_id} onValueChange={(v) => setForm((f) => ({ ...f, track_id: v }))}>
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
                <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Instructions</Label>
                <Textarea placeholder="Dance instructions for creators…" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Hashtags (comma-separated)</Label>
                <Input placeholder="#dance, #challenge" value={form.hashtags} onChange={(e) => setForm((f) => ({ ...f, hashtags: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Mentions (comma-separated)</Label>
                <Input placeholder="@artist, @brand" value={form.mentions} onChange={(e) => setForm((f) => ({ ...f, mentions: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Payout Amount ($)</Label>
                  <Input type="number" value={form.payout_amount} onChange={(e) => setForm((f) => ({ ...f, payout_amount: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Max Creators</Label>
                  <Input type="number" value={form.max_creators} onChange={(e) => setForm((f) => ({ ...f, max_creators: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Days to Submit After Accept</Label>
                <Input type="number" value={form.due_days_after_accept} onChange={(e) => setForm((f) => ({ ...f, due_days_after_accept: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.start_date && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {form.start_date ? format(form.start_date, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={form.start_date} onSelect={(d) => setForm((f) => ({ ...f, start_date: d }))} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1">
                  <Label>End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.end_date && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {form.end_date ? format(form.end_date, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={form.end_date} onSelect={(d) => setForm((f) => ({ ...f, end_date: d }))} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <Button className="w-full" onClick={handleEdit} disabled={saving || !form.title}>
                {saving ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
