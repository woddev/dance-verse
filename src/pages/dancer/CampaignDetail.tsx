import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import AudioPlayer from "@/components/campaign/AudioPlayer";
import PlatformSubmissions from "@/components/campaign/PlatformSubmissions";
import {
  Music, Clock, DollarSign, Hash, AtSign,
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

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [track, setTrack] = useState<Track | null>(null);
  const [acceptance, setAcceptance] = useState<Acceptance | null>(null);
  const [loading, setLoading] = useState(true);
  const [allSubmitted, setAllSubmitted] = useState(false);

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
  const alreadySubmitted = acceptance?.status === "submitted" || allSubmitted;
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
            <div className="space-y-3">
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

        {/* Per-Platform Submission */}
        {acceptance && !alreadySubmitted && (
          <PlatformSubmissions
            acceptanceId={acceptance.id}
            campaignId={campaign.id}
            dancerId={user!.id}
            requiredPlatforms={campaign.required_platforms}
            isOverdue={isOverdue}
            onAllSubmitted={() => setAllSubmitted(true)}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
