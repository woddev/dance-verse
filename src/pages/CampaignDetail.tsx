import { useEffect, useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCampaignCategories } from "@/hooks/useCampaignCategories";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import AudioPlayer from "@/components/campaign/AudioPlayer";
import CampaignDancers from "@/components/campaign/CampaignDancers";
import PlatformSubmissions from "@/components/campaign/PlatformSubmissions";
import { useToast } from "@/hooks/use-toast";
import {
  Music, Clock, DollarSign, Hash, AtSign, ArrowLeft, Download, Instagram, Users, CheckCircle, Ban,
} from "lucide-react";
import CountdownTimer from "@/components/campaign/CountdownTimer";
import type { Tables } from "@/integrations/supabase/types";

type Campaign = Tables<"campaigns">;
type Track = Tables<"tracks">;
type Acceptance = Tables<"campaign_acceptances">;

function formatPayTiers(payScale: any): { views: number; amount: number }[] {
  if (!Array.isArray(payScale)) return [];
  return payScale
    .map((p: any) => ({
      views: p.views ?? 0,
      amount: p.amount_cents ? p.amount_cents / 100 : p.amount ?? 0,
    }))
    .sort((a, b) => a.views - b.views);
}

export default function PublicCampaignDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { user, isDancer, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: categories } = useCampaignCategories();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [track, setTrack] = useState<Track | null>(null);
  const [loading, setLoading] = useState(true);
  const [acceptance, setAcceptance] = useState<Acceptance | null>(null);
  const [accepting, setAccepting] = useState(false);
  const submitRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchData() {
      if (!slug) return;
      const { data } = await supabase.from("campaigns").select("*").eq("slug", slug).single();
      if (data) {
        setCampaign(data);
        if (data.track_id) {
          const { data: trackData } = await supabase.from("tracks").select("*").eq("id", data.track_id).single();
          if (trackData) setTrack(trackData);
        }
      }
      setLoading(false);
    }
    fetchData();
  }, [slug]);

  useEffect(() => {
    async function checkAcceptance() {
      if (!user || !campaign) return;
      const { data } = await supabase
        .from("campaign_acceptances")
        .select("*")
        .eq("campaign_id", campaign.id)
        .eq("dancer_id", user.id)
        .maybeSingle();
      setAcceptance(data ?? null);
    }
    if (!authLoading) checkAcceptance();
  }, [user, campaign, authLoading]);

  const handleAccept = async () => {
    if (!user || !campaign) return;
    setAccepting(true);
    const { error } = await supabase.rpc("create_assignment", {
      p_campaign_id: campaign.id,
      p_user_id: user.id,
    });
    if (error) {
      toast({ title: "Could not accept campaign", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Campaign accepted!" });
      // Re-fetch acceptance
      const { data } = await supabase
        .from("campaign_acceptances")
        .select("*")
        .eq("campaign_id", campaign.id)
        .eq("dancer_id", user.id)
        .maybeSingle();
      setAcceptance(data ?? null);
    }
    setAccepting(false);
  };

  const scrollToSubmit = () => {
    submitRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const acceptanceStatus = acceptance?.status ?? null;
  const isOverdue = acceptance ? new Date(acceptance.deadline) < new Date() : false;
  const isSubmitted = acceptanceStatus === "submitted" || acceptanceStatus === "approved" || acceptanceStatus === "paid";
  const canSubmit = acceptance && !isSubmitted && acceptanceStatus === "accepted";

  const payTiers = campaign ? formatPayTiers(campaign.pay_scale) : [];
  const audioSrc = track?.audio_url || campaign?.song_url;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-6">
          {loading ? (
            <div className="space-y-6">
              <Skeleton className="h-8 w-48" />
              <div className="grid lg:grid-cols-3 gap-8">
                <Skeleton className="aspect-square rounded-2xl" />
                <Skeleton className="h-64 rounded-xl lg:col-span-2" />
              </div>
            </div>
          ) : !campaign ? (
            <div className="text-center py-16">
              <Music className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-4">Campaign not found.</p>
              <Link to="/campaigns">
                <Button variant="outline">Browse Campaigns</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-8">
              <Link to="/campaigns" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" />
                Back to Campaigns
              </Link>

              {/* Hero */}
              <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                  <div className="aspect-square rounded-2xl overflow-hidden bg-muted shadow-md border border-border">
                    {campaign.cover_image_url ? (
                      <img src={campaign.cover_image_url} alt={campaign.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music className="h-16 w-16 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-1 space-y-4">
                  <div>
                    <h1 className="text-xl lg:text-2xl font-bold">{campaign.title}</h1>
                    <p className="text-lg text-muted-foreground mt-1">{campaign.artist_name}</p>
                    {campaign.status === "completed" ? (
                      <Badge className="mt-3 bg-muted text-muted-foreground px-4 py-1.5">
                        <CheckCircle className="h-3 w-3 mr-1" />COMPLETED
                      </Badge>
                    ) : (
                      <Badge className={`mt-3 ${categories?.find(c => c.slug === campaign.category)?.color || "bg-primary"} text-white px-4 py-1.5`}>{categories?.find(c => c.slug === campaign.category)?.label?.toUpperCase() || campaign.category?.toUpperCase() || "CAMPAIGN"}</Badge>
                    )}
                  </div>
                  {campaign.description && (
                    <p className="text-sm text-muted-foreground leading-relaxed">{campaign.description}</p>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    {campaign.status === "completed" ? (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Ban className="h-4 w-4" />Campaign ended
                      </span>
                    ) : (
                      <>
                        <span className="flex items-center gap-1 font-semibold text-green-700">
                          <Users className="h-4 w-4" />ONLY {campaign.max_creators - ((campaign as any).accepted_count ?? 0)} SPOTS LEFT
                        </span>
                        {campaign.end_date && (
                          <CountdownTimer endDate={campaign.end_date} size="lg" />
                        )}
                      </>
                    )}
                  </div>
                  {/* Inline Compensation */}
                  {payTiers.length > 0 && (
                    <div className="pt-2">
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground mb-2">
                        <DollarSign className="h-4 w-4" />Compensation
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {payTiers.map((tier, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-baseline gap-1 rounded-md border border-border bg-muted/40 px-3 py-1.5 text-sm"
                          >
                            <span className="font-bold text-foreground">${tier.amount}</span>
                            {tier.views > 0 && (
                              <span className="text-xs text-muted-foreground">/ {tier.views.toLocaleString()} views</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="lg:col-span-1 space-y-4">
                   <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Official Links</h2>
                    <div className="flex flex-col gap-2">
                      {campaign.song_url && (
                        <a href={campaign.song_url} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" className="w-full text-xs py-3"><Download className="mr-2 h-3.5 w-3.5" />DOWNLOAD MUSIC</Button>
                        </a>
                      )}
                      {campaign.tiktok_sound_url && (
                        <a href={campaign.tiktok_sound_url} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" className="w-full text-xs py-3"><Music className="mr-2 h-3.5 w-3.5" />TIKTOK SOUND</Button>
                        </a>
                      )}
                      {campaign.instagram_sound_url && (
                        <a href={campaign.instagram_sound_url} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" className="w-full text-xs py-3"><Instagram className="mr-2 h-3.5 w-3.5" />INSTAGRAM SOUND</Button>
                        </a>
                      )}
                    </div>
                  {campaign.status === "completed" ? (
                    <Button className="w-full py-6 text-base mt-4 uppercase" disabled>
                      <Ban className="mr-2 h-4 w-4" />Campaign Completed
                    </Button>
                  ) : !user ? (
                    <Link to="/dancer/apply">
                      <Button className="w-full py-6 text-base mt-4 uppercase" style={{ backgroundColor: '#4e804d', color: 'white' }}>Apply to Join</Button>
                    </Link>
                  ) : isSubmitted ? (
                    <Button className="w-full py-6 text-base mt-4 uppercase text-white" style={{ backgroundColor: '#4e804d' }} disabled>
                      <CheckCircle className="mr-2 h-4 w-4" />Submitted
                    </Button>
                  ) : canSubmit ? (
                    <Button variant="outline" className="w-full py-6 text-base mt-4 uppercase bg-background text-foreground border border-border" onClick={scrollToSubmit}>
                      Submit Your Videos
                    </Button>
                  ) : acceptanceStatus ? (
                    <Button className="w-full py-6 text-base mt-4 uppercase text-white" style={{ backgroundColor: '#4e804d' }} disabled>
                      {acceptanceStatus.charAt(0).toUpperCase() + acceptanceStatus.slice(1)}
                    </Button>
                  ) : (
                    <Button className="w-full py-6 text-base mt-4 uppercase text-white" style={{ backgroundColor: '#4e804d' }} onClick={handleAccept} disabled={accepting}>
                      {accepting ? "Accepting…" : "Accept Campaign"}
                    </Button>
                  )}
                </div>
              </div>

              {audioSrc && (
                <AudioPlayer
                  src={audioSrc}
                  title={track?.title ?? campaign.title}
                  artist={track?.artist_name ?? campaign.artist_name}
                  coverUrl={campaign.cover_image_url}
                />
              )}

              {/* Inline Submission Section */}
              {canSubmit && acceptance && (
                <div ref={submitRef}>
                  <PlatformSubmissions
                    acceptanceId={acceptance.id}
                    campaignId={campaign.id}
                    dancerId={user!.id}
                    requiredPlatforms={campaign.required_platforms}
                    isOverdue={isOverdue}
                    onAllSubmitted={() => {
                      setAcceptance((prev) => prev ? { ...prev, status: isOverdue ? "rejected" : "submitted" } : null);
                    }}
                  />
                </div>
              )}

              {/* Requirements */}
              <Card className="bg-muted/30">
                <CardContent className="p-8">
                  <h2 className="text-2xl font-bold mb-1">Requirements</h2>
                  <p className="text-muted-foreground mb-6">Campaign Details</p>
                  <div className="grid md:grid-cols-2 gap-8">
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Post your video on</h3>
                      <ul className="space-y-2">
                        {(campaign.required_platforms.length > 0 ? campaign.required_platforms : ["tiktok", "instagram", "youtube"]).map((p) => (
                          <li key={p} className="flex items-center gap-2 text-sm">
                            <span className="w-2 h-2 bg-primary rounded-full" />{p.charAt(0).toUpperCase() + p.slice(1)}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="space-y-5">
                      {campaign.required_hashtags.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold mb-3">Required Hashtags</h3>
                          <div className="flex flex-wrap gap-2">
                            {campaign.required_hashtags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-sm px-3 py-1"><Hash className="h-3 w-3 mr-1" />{tag}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {campaign.required_mentions.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold mb-3">Required Mentions</h3>
                          <div className="flex flex-wrap gap-2">
                            {campaign.required_mentions.map((m) => (
                              <Badge key={m} variant="outline" className="text-sm px-3 py-1"><AtSign className="h-3 w-3 mr-1" />{m}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>


              {/* Creators */}
              <CampaignDancers campaignId={campaign.id} />
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}