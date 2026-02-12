import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AudioPlayer from "@/components/campaign/AudioPlayer";
import {
  Music, Clock, DollarSign, Hash, AtSign, Upload, Link2,
  CheckCircle, AlertTriangle, ArrowLeft, Download, Instagram,
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Campaign = Tables<"campaigns">;
type Acceptance = Tables<"campaign_acceptances">;
type Track = Tables<"tracks">;

function daysLeft(deadline: string) {
  const diff = new Date(deadline).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatPayTiers(payScale: any): { views: number; amount: number }[] {
  if (!Array.isArray(payScale)) return [];
  return payScale.map((p: any) => ({
    views: p.views ?? 0,
    amount: p.amount_cents ? p.amount_cents / 100 : p.amount ?? 0,
  })).sort((a, b) => a.views - b.views);
}

type SubmitMode = "upload" | "url";

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [track, setTrack] = useState<Track | null>(null);
  const [acceptance, setAcceptance] = useState<Acceptance | null>(null);
  const [loading, setLoading] = useState(true);

  // Submission form state
  const [mode, setMode] = useState<SubmitMode>("url");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [platform, setPlatform] = useState("tiktok");
  const [caption, setCaption] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id || !user) return;

    const [campaignRes, acceptanceRes] = await Promise.all([
      supabase.from("campaigns").select("*").eq("id", id).single(),
      supabase
        .from("campaign_acceptances")
        .select("*")
        .eq("campaign_id", id)
        .eq("dancer_id", user.id)
        .maybeSingle(),
    ]);

    if (campaignRes.data) {
      setCampaign(campaignRes.data);
      // Fetch linked track for audio
      if (campaignRes.data.track_id) {
        const { data: trackData } = await supabase
          .from("tracks")
          .select("*")
          .eq("id", campaignRes.data.track_id)
          .single();
        if (trackData) setTrack(trackData);
      }
    }
    if (acceptanceRes.data) setAcceptance(acceptanceRes.data);
    setLoading(false);
  }, [id, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAccept = async () => {
    if (!user || !campaign) return;
    const { error } = await supabase.rpc("create_assignment", {
      p_campaign_id: campaign.id,
      p_user_id: user.id,
    });
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Campaign accepted!" });
      fetchData();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !campaign || !acceptance) return;

    setSubmitting(true);
    let finalVideoUrl = videoUrl;

    if (mode === "upload" && videoFile) {
      const ext = videoFile.name.split(".").pop();
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("submission-videos")
        .upload(path, videoFile);
      if (uploadError) {
        toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
        setSubmitting(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("submission-videos").getPublicUrl(path);
      finalVideoUrl = urlData.publicUrl;
    }

    if (!finalVideoUrl) {
      toast({ title: "Missing video", description: "Please paste a URL or upload a video.", variant: "destructive" });
      setSubmitting(false);
      return;
    }

    const isLate = new Date(acceptance.deadline).getTime() < Date.now();
    const { error: subError } = await supabase.from("submissions").insert({
      acceptance_id: acceptance.id,
      campaign_id: campaign.id,
      dancer_id: user.id,
      video_url: finalVideoUrl,
      platform,
    });

    if (subError) {
      toast({ title: "Submission failed", description: subError.message, variant: "destructive" });
      setSubmitting(false);
      return;
    }

    await supabase
      .from("campaign_acceptances")
      .update({ status: isLate ? "rejected" : "submitted" })
      .eq("id", acceptance.id);

    setSubmitted(true);
    setSubmitting(false);
    toast({ title: isLate ? "Submitted (late)" : "Submitted!", description: "Your video has been sent for review." });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid lg:grid-cols-3 gap-8">
            <Skeleton className="aspect-square rounded-2xl" />
            <Skeleton className="h-64 rounded-xl lg:col-span-2" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!campaign) {
    return (
      <DashboardLayout>
        <div className="text-center py-16">
          <p className="text-muted-foreground mb-4">Campaign not found.</p>
          <Link to="/dancer/campaigns">
            <Button variant="outline">Browse Campaigns</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const remaining = acceptance ? daysLeft(acceptance.deadline) : null;
  const isOverdue = remaining !== null && remaining <= 0;
  const alreadySubmitted = acceptance?.status === "submitted" || submitted;
  const payTiers = formatPayTiers(campaign.pay_scale);
  const audioSrc = track?.audio_url || campaign.song_url;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Back link */}
        <Link to="/dancer/campaigns" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Campaigns
        </Link>

        {/* Hero Section */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Album Cover */}
          <div className="lg:col-span-1">
            <div className="aspect-square rounded-2xl overflow-hidden bg-muted shadow-2xl">
              {campaign.cover_image_url ? (
                <img src={campaign.cover_image_url} alt={campaign.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Music className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
            </div>
          </div>

          {/* Campaign Info */}
          <div className="lg:col-span-1 space-y-4">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold">{campaign.title}</h1>
              <p className="text-lg text-muted-foreground mt-1">{campaign.artist_name}</p>
              <Badge className="mt-3 bg-primary text-primary-foreground px-4 py-1.5">
                MUSIC CAMPAIGN
              </Badge>
            </div>
            {campaign.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">{campaign.description}</p>
            )}
            {/* Deadline badge */}
            {remaining !== null && (
              <Badge variant={isOverdue ? "destructive" : "secondary"} className="flex items-center gap-1 w-fit">
                {isOverdue ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                {isOverdue ? "Overdue" : `${remaining} days left`}
              </Badge>
            )}
          </div>

          {/* Official Links */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-xl font-bold">Official Links</h2>
            <div className="space-y-2">
              {campaign.song_url && (
                <a href={campaign.song_url} target="_blank" rel="noopener noreferrer">
                  <Button className="w-full justify-start text-sm py-5 bg-primary text-primary-foreground hover:bg-primary/90">
                    <Download className="mr-3 h-4 w-4" />
                    DOWNLOAD MUSIC
                  </Button>
                </a>
              )}
              {campaign.tiktok_sound_url && (
                <a href={campaign.tiktok_sound_url} target="_blank" rel="noopener noreferrer">
                  <Button className="w-full justify-start text-sm py-5 bg-primary text-primary-foreground hover:bg-primary/90">
                    <Music className="mr-3 h-4 w-4" />
                    TIKTOK SOUND
                  </Button>
                </a>
              )}
              {campaign.instagram_sound_url && (
                <a href={campaign.instagram_sound_url} target="_blank" rel="noopener noreferrer">
                  <Button className="w-full justify-start text-sm py-5 bg-primary text-primary-foreground hover:bg-primary/90">
                    <Instagram className="mr-3 h-4 w-4" />
                    INSTAGRAM SOUND
                  </Button>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Audio Player */}
        {audioSrc && (
          <AudioPlayer
            src={audioSrc}
            title={track?.title ?? campaign.title}
            artist={track?.artist_name ?? campaign.artist_name}
            coverUrl={campaign.cover_image_url}
          />
        )}

        {/* Requirements Section */}
        <Card className="bg-muted/30">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold mb-1">Requirements</h2>
            <p className="text-muted-foreground mb-6">Campaign Details</p>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Post on platforms */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Post your video on</h3>
                <ul className="space-y-2">
                  {(campaign.required_platforms.length > 0
                    ? campaign.required_platforms
                    : ["tiktok", "instagram", "youtube"]
                  ).map((p) => (
                    <li key={p} className="flex items-center gap-2 text-sm">
                      <span className="w-2 h-2 bg-primary rounded-full" />
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Hashtags & Mentions */}
              <div className="space-y-5">
                {campaign.required_hashtags.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Required Hashtags</h3>
                    <div className="flex flex-wrap gap-2">
                      {campaign.required_hashtags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-sm px-3 py-1">
                          <Hash className="h-3 w-3 mr-1" />{tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {campaign.required_mentions.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Required Mentions</h3>
                    <div className="flex flex-wrap gap-2">
                      {campaign.required_mentions.map((mention) => (
                        <Badge key={mention} variant="outline" className="text-sm px-3 py-1">
                          <AtSign className="h-3 w-3 mr-1" />{mention}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Compensation & Status */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Compensation */}
          <Card>
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold mb-6">Compensation</h2>
              {payTiers.length > 0 ? (
                <div className="space-y-4">
                  {payTiers.map((tier, idx) => (
                    <div key={idx} className="flex justify-between items-center pb-4 border-b border-border last:border-0">
                      <span className="font-semibold">{tier.views.toLocaleString()} VIEWS</span>
                      <span className="text-xl font-bold text-primary">${tier.amount}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Compensation details coming soon.</p>
              )}
            </CardContent>
          </Card>

          {/* Status / Submit */}
          <Card>
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold mb-6">Your Status</h2>

              {!acceptance ? (
                <div className="space-y-4">
                  <p className="text-muted-foreground text-sm">Accept this campaign to get started.</p>
                  <Button className="w-full py-6 text-base" onClick={handleAccept}>
                    Accept Campaign
                  </Button>
                </div>
              ) : alreadySubmitted ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-primary/10 rounded-lg border border-primary/30">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-primary">Video Submitted</p>
                      <p className="text-sm text-muted-foreground">Your video is under review.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 bg-muted rounded-lg text-sm">
                    <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {isOverdue ? "Deadline has passed — submit ASAP" : `${remaining} days to submit your video`}
                    </span>
                  </div>
                  <Button className="w-full py-6 text-base" onClick={() => document.getElementById("submit-section")?.scrollIntoView({ behavior: "smooth" })}>
                    Submit Video
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Submission Form */}
        {acceptance && !alreadySubmitted && (
          <Card id="submit-section" className="border border-border">
            <CardHeader>
              <CardTitle className="text-lg">Submit Your Video</CardTitle>
              {isOverdue && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  This submission is past the deadline and will be marked as late.
                </p>
              )}
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <Tabs value={mode} onValueChange={(v) => setMode(v as SubmitMode)}>
                  <TabsList className="w-full">
                    <TabsTrigger value="url" className="flex-1 gap-1.5">
                      <Link2 className="h-4 w-4" />
                      Paste URL
                    </TabsTrigger>
                    <TabsTrigger value="upload" className="flex-1 gap-1.5">
                      <Upload className="h-4 w-4" />
                      Upload Video
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="url" className="mt-4 space-y-2">
                    <Label htmlFor="videoUrl">Social Post URL</Label>
                    <Input id="videoUrl" placeholder="https://www.tiktok.com/@you/video/..." value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} required={mode === "url"} />
                  </TabsContent>
                  <TabsContent value="upload" className="mt-4 space-y-2">
                    <Label htmlFor="videoFile">Video File</Label>
                    <Input id="videoFile" type="file" accept="video/*" onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)} required={mode === "upload"} />
                    {videoFile && <p className="text-xs text-muted-foreground">{videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(1)} MB)</p>}
                  </TabsContent>
                </Tabs>

                <div className="space-y-2">
                  <Label htmlFor="platform">Platform</Label>
                  <select id="platform" value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    {campaign.required_platforms.length > 0
                      ? campaign.required_platforms.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)
                      : <>
                          <option value="tiktok">TikTok</option>
                          <option value="instagram">Instagram</option>
                          <option value="youtube">YouTube</option>
                        </>}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="caption">Caption (optional)</Label>
                  <Textarea id="caption" placeholder="Notes for the reviewer…" value={caption} onChange={(e) => setCaption(e.target.value)} rows={3} maxLength={500} />
                  <p className="text-xs text-muted-foreground text-right">{caption.length}/500</p>
                </div>

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                      Submitting…
                    </span>
                  ) : "Submit Video"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
