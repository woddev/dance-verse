import { useState, useEffect } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ExternalLink, CheckCircle, XCircle, Eye } from "lucide-react";

interface Submission {
  id: string;
  artist_name: string;
  song_title: string;
  email: string;
  phone: string | null;
  audio_url: string | null;
  cover_image_url: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  spotify_url: string | null;
  youtube_url: string | null;
  hashtags: string[];
  notes: string | null;
  payment_status: string;
  review_status: string;
  review_notes: string | null;
  created_at: string;
  package_name?: string;
}

export default function ArtistSubmissions() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [detailSub, setDetailSub] = useState<Submission | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [acting, setActing] = useState(false);

  const fetchSubmissions = async () => {
    let query = supabase
      .from("artist_submissions")
      .select("*, promotion_packages(name)")
      .order("created_at", { ascending: false });

    if (filter !== "all") {
      query = query.eq("review_status", filter);
    }

    const { data } = await query;
    if (data) {
      setSubmissions(
        data.map((s: any) => ({
          ...s,
          package_name: s.promotion_packages?.name || "Unknown",
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSubmissions();
  }, [filter]);

  const handleReview = async (id: string, status: "approved" | "rejected") => {
    setActing(true);
    const { error } = await supabase
      .from("artist_submissions")
      .update({
        review_status: status,
        review_notes: reviewNotes || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) toast.error(error.message);
    else {
      toast.success(`Submission ${status}`);
      setDetailSub(null);
      fetchSubmissions();
    }
    setActing(false);
  };

  const paymentBadge = (status: string) => {
    switch (status) {
      case "paid": return <Badge className="bg-green-600 text-white">Paid</Badge>;
      case "unpaid": return <Badge variant="destructive">Unpaid</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const reviewBadge = (status: string) => {
    switch (status) {
      case "approved": return <Badge className="bg-green-600 text-white">Approved</Badge>;
      case "rejected": return <Badge variant="destructive">Rejected</Badge>;
      case "pending": return <Badge variant="secondary">Pending</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Artist Submissions</h1>
        <div className="flex gap-2">
          {["all", "pending", "approved", "rejected"].map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : submissions.length === 0 ? (
        <p className="text-muted-foreground text-center py-20">No submissions found.</p>
      ) : (
        <div className="space-y-3">
          {submissions.map((sub) => (
            <Card key={sub.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{sub.artist_name}</span>
                    <span className="text-muted-foreground">—</span>
                    <span className="text-sm">{sub.song_title}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{sub.email}</span>
                    <span>·</span>
                    <span>{sub.package_name}</span>
                    <span>·</span>
                    <span>{new Date(sub.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {paymentBadge(sub.payment_status)}
                  {reviewBadge(sub.review_status)}
                  <Button variant="outline" size="sm" onClick={() => { setDetailSub(sub); setReviewNotes(sub.review_notes || ""); }}>
                    <Eye className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!detailSub} onOpenChange={() => setDetailSub(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submission Detail</DialogTitle>
          </DialogHeader>
          {detailSub && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="font-medium">Artist:</span> {detailSub.artist_name}</div>
                <div><span className="font-medium">Song:</span> {detailSub.song_title}</div>
                <div><span className="font-medium">Email:</span> {detailSub.email}</div>
                <div><span className="font-medium">Phone:</span> {detailSub.phone || "—"}</div>
                <div><span className="font-medium">Package:</span> {detailSub.package_name}</div>
                <div><span className="font-medium">Payment:</span> {detailSub.payment_status}</div>
              </div>

              <div className="space-y-2 text-sm">
                {detailSub.audio_url && (
                  <a href={detailSub.audio_url} target="_blank" className="flex items-center gap-1 text-primary hover:underline">
                    <ExternalLink className="h-3 w-3" /> Audio
                  </a>
                )}
                {detailSub.instagram_url && (
                  <a href={detailSub.instagram_url} target="_blank" className="flex items-center gap-1 text-primary hover:underline">
                    <ExternalLink className="h-3 w-3" /> Instagram
                  </a>
                )}
                {detailSub.tiktok_url && (
                  <a href={detailSub.tiktok_url} target="_blank" className="flex items-center gap-1 text-primary hover:underline">
                    <ExternalLink className="h-3 w-3" /> TikTok
                  </a>
                )}
                {detailSub.spotify_url && (
                  <a href={detailSub.spotify_url} target="_blank" className="flex items-center gap-1 text-primary hover:underline">
                    <ExternalLink className="h-3 w-3" /> Spotify
                  </a>
                )}
                {detailSub.youtube_url && (
                  <a href={detailSub.youtube_url} target="_blank" className="flex items-center gap-1 text-primary hover:underline">
                    <ExternalLink className="h-3 w-3" /> YouTube
                  </a>
                )}
              </div>

              {detailSub.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {detailSub.hashtags.map((h, i) => (
                    <Badge key={i} variant="outline" className="text-xs">{h}</Badge>
                  ))}
                </div>
              )}

              {detailSub.notes && (
                <div className="text-sm">
                  <span className="font-medium">Notes:</span> {detailSub.notes}
                </div>
              )}

              {detailSub.review_status === "pending" && detailSub.payment_status === "paid" && (
                <>
                  <div className="space-y-2">
                    <Label>Review Notes</Label>
                    <Textarea
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Optional notes..."
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={() => handleReview(detailSub.id, "approved")}
                      disabled={acting}
                    >
                      {acting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => handleReview(detailSub.id, "rejected")}
                      disabled={acting}
                    >
                      {acting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                      Reject
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
