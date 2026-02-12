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
import {
  Music, Clock, DollarSign, Hash, AtSign, Upload, Link2,
  CheckCircle, AlertTriangle, ArrowLeft,
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Campaign = Tables<"campaigns">;
type Acceptance = Tables<"campaign_acceptances">;

function daysLeft(deadline: string) {
  const diff = new Date(deadline).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatPay(payScale: any): string {
  if (!Array.isArray(payScale) || payScale.length === 0) return "—";
  const sorted = [...payScale].sort((a: any, b: any) => (a.amount ?? 0) - (b.amount ?? 0));
  const min = sorted[0]?.amount ?? 0;
  const max = sorted[sorted.length - 1]?.amount ?? 0;
  if (min === max) return `$${min}`;
  return `$${min}–$${max}`;
}

type SubmitMode = "upload" | "url";

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
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

    if (campaignRes.data) setCampaign(campaignRes.data);
    if (acceptanceRes.data) setAcceptance(acceptanceRes.data);
    setLoading(false);
  }, [id, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !campaign || !acceptance) return;

    setSubmitting(true);

    let finalVideoUrl = videoUrl;

    // Upload video file if in upload mode
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

      const { data: urlData } = supabase.storage
        .from("submission-videos")
        .getPublicUrl(path);

      finalVideoUrl = urlData.publicUrl;
    }

    if (!finalVideoUrl) {
      toast({ title: "Missing video", description: "Please paste a URL or upload a video.", variant: "destructive" });
      setSubmitting(false);
      return;
    }

    // Determine if late
    const isLate = new Date(acceptance.deadline).getTime() < Date.now();

    // Create submission
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

    // Update acceptance status
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
        <div className="space-y-6 max-w-3xl">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  if (!campaign) {
    return (
      <DashboardLayout>
        <div className="text-center py-16">
          <p className="text-muted-foreground mb-4">Campaign not found.</p>
          <Link to="/dancer/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const remaining = acceptance ? daysLeft(acceptance.deadline) : null;
  const isOverdue = remaining !== null && remaining <= 0;
  const alreadySubmitted = acceptance?.status === "submitted" || submitted;

  return (
    <DashboardLayout>
      <div className="max-w-3xl space-y-6">
        {/* Back link */}
        <Link to="/dancer/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        {/* Campaign Info */}
        <Card className="border border-border overflow-hidden">
          <div className="flex flex-col sm:flex-row">
            <div className="sm:w-48 aspect-square bg-muted flex-shrink-0">
              {campaign.cover_image_url ? (
                <img src={campaign.cover_image_url} alt={campaign.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Music className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
            </div>
            <CardContent className="p-5 flex-1 space-y-3">
              <div>
                <h1 className="text-2xl font-bold">{campaign.title}</h1>
                <p className="text-muted-foreground">{campaign.artist_name}</p>
              </div>
              {campaign.description && (
                <p className="text-sm text-muted-foreground">{campaign.description}</p>
              )}
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <DollarSign className="h-3.5 w-3.5" />
                  {formatPay(campaign.pay_scale)}
                </span>
                {remaining !== null && (
                  <Badge variant={isOverdue ? "destructive" : "secondary"} className="flex items-center gap-1">
                    {isOverdue ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                    {isOverdue ? "Overdue" : `${remaining}d left`}
                  </Badge>
                )}
              </div>
              {/* Hashtags & mentions */}
              <div className="flex flex-wrap gap-2">
                {campaign.required_hashtags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    <Hash className="h-3 w-3 mr-0.5" />{tag}
                  </Badge>
                ))}
                {campaign.required_mentions.map((mention) => (
                  <Badge key={mention} variant="outline" className="text-xs">
                    <AtSign className="h-3 w-3 mr-0.5" />{mention}
                  </Badge>
                ))}
              </div>
              {/* Sound links */}
              <div className="flex flex-wrap gap-2">
                {campaign.tiktok_sound_url && (
                  <a href={campaign.tiktok_sound_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm">TikTok Sound</Button>
                  </a>
                )}
                {campaign.instagram_sound_url && (
                  <a href={campaign.instagram_sound_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm">Instagram Sound</Button>
                  </a>
                )}
              </div>
            </CardContent>
          </div>
        </Card>

        {/* Submission Form */}
        {!acceptance ? (
          <Card className="border border-border">
            <CardContent className="p-6 text-center text-muted-foreground">
              <p>You haven't accepted this campaign yet. Go back to the dashboard to accept it first.</p>
            </CardContent>
          </Card>
        ) : alreadySubmitted ? (
          <Card className="border border-border">
            <CardContent className="p-8 text-center space-y-3">
              <CheckCircle className="h-12 w-12 mx-auto text-primary" />
              <h2 className="text-xl font-semibold">Submission Received!</h2>
              <p className="text-muted-foreground">
                Your video has been submitted for review. You'll be notified once it's reviewed.
              </p>
              <Link to="/dancer/dashboard">
                <Button variant="outline" className="mt-2">Back to Dashboard</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card className="border border-border">
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
                {/* Video input mode */}
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
                    <Input
                      id="videoUrl"
                      placeholder="https://www.tiktok.com/@you/video/..."
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      required={mode === "url"}
                    />
                  </TabsContent>

                  <TabsContent value="upload" className="mt-4 space-y-2">
                    <Label htmlFor="videoFile">Video File</Label>
                    <Input
                      id="videoFile"
                      type="file"
                      accept="video/*"
                      onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
                      required={mode === "upload"}
                    />
                    {videoFile && (
                      <p className="text-xs text-muted-foreground">
                        {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(1)} MB)
                      </p>
                    )}
                  </TabsContent>
                </Tabs>

                {/* Platform */}
                <div className="space-y-2">
                  <Label htmlFor="platform">Platform</Label>
                  <select
                    id="platform"
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {campaign.required_platforms.length > 0
                      ? campaign.required_platforms.map((p) => (
                          <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                        ))
                      : (
                        <>
                          <option value="tiktok">TikTok</option>
                          <option value="instagram">Instagram</option>
                          <option value="youtube">YouTube</option>
                        </>
                      )}
                  </select>
                </div>

                {/* Caption */}
                <div className="space-y-2">
                  <Label htmlFor="caption">Caption (optional)</Label>
                  <Textarea
                    id="caption"
                    placeholder="Describe your video or add notes for the reviewer..."
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    rows={3}
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground text-right">{caption.length}/500</p>
                </div>

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                      Submitting…
                    </span>
                  ) : (
                    "Submit Video"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
