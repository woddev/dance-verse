import { useState, useEffect } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useAdminApi } from "@/hooks/useAdminApi";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ExternalLink, Check, X, Hash, AtSign } from "lucide-react";
import { format } from "date-fns";

interface Submission {
  id: string;
  platform: string;
  video_url: string;
  review_status: string;
  submitted_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
  dancer_id: string;
  campaign_id: string;
  campaigns: {
    title: string;
    artist_name: string;
    pay_scale: any;
    required_hashtags?: string[];
    required_mentions?: string[];
    required_platforms?: string[];
  } | null;
  profiles: {
    full_name: string | null;
    instagram_handle: string | null;
    tiktok_handle: string | null;
  } | null;
}

export default function ReviewSubmissions() {
  const { callAdmin } = useAdminApi();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending");
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [acting, setActing] = useState<string | null>(null);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const data = await callAdmin("submissions");
      setSubmissions(data);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => { fetchSubmissions(); }, []);

  const handleApprove = async (id: string) => {
    setActing(id);
    try {
      await callAdmin("review-submission", undefined, { submission_id: id, status: "approved" });
      setSubmissions((prev) => prev.map((s) => s.id === id ? { ...s, review_status: "approved", reviewed_at: new Date().toISOString() } : s));
      toast({ title: "Submission approved" });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
    setActing(null);
  };

  const handleReject = async () => {
    if (!rejectId) return;
    setActing(rejectId);
    try {
      await callAdmin("review-submission", undefined, { submission_id: rejectId, status: "rejected", rejection_reason: rejectReason });
      setSubmissions((prev) => prev.map((s) => s.id === rejectId ? { ...s, review_status: "rejected", rejection_reason: rejectReason, reviewed_at: new Date().toISOString() } : s));
      toast({ title: "Submission rejected" });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
    setRejectId(null);
    setRejectReason("");
    setActing(null);
  };

  const filtered = tab === "all" ? submissions : submissions.filter((s) => s.review_status === tab);

  const statusBadge = (status: string) => {
    const variant = status === "approved" ? "default" : status === "rejected" ? "destructive" : "secondary";
    return <Badge variant={variant}>{status}</Badge>;
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Review Submissions</h1>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all">All ({submissions.length})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({submissions.filter((s) => s.review_status === "pending").length})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({submissions.filter((s) => s.review_status === "approved").length})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({submissions.filter((s) => s.review_status === "rejected").length})</TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="mt-4">
            {filtered.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">No {tab === "all" ? "" : tab} submissions.</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dancer</TableHead>
                      <TableHead>Campaign</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Video</TableHead>
                      <TableHead>Compliance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((sub) => (
                      <TableRow key={sub.id}>
                        <TableCell className="font-medium">
                          {sub.profiles?.full_name ?? "Unknown"}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">{sub.campaigns?.title ?? "—"}</p>
                            <p className="text-xs text-muted-foreground">{sub.campaigns?.artist_name}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{sub.platform}</Badge>
                        </TableCell>
                        <TableCell>
                          <a href={sub.video_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                            View <ExternalLink className="h-3 w-3" />
                          </a>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {sub.campaigns?.required_hashtags && sub.campaigns.required_hashtags.length > 0 && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Hash className="h-3 w-3" />
                                {sub.campaigns.required_hashtags.join(", ")}
                              </div>
                            )}
                            {sub.campaigns?.required_mentions && sub.campaigns.required_mentions.length > 0 && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <AtSign className="h-3 w-3" />
                                {sub.campaigns.required_mentions.join(", ")}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{statusBadge(sub.review_status)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(sub.submitted_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          {sub.review_status === "pending" && (
                            <div className="flex justify-end gap-1">
                              <Button size="sm" onClick={() => handleApprove(sub.id)} disabled={acting === sub.id}>
                                <Check className="h-3.5 w-3.5 mr-1" /> Approve
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => setRejectId(sub.id)} disabled={acting === sub.id}>
                                <X className="h-3.5 w-3.5 mr-1" /> Reject
                              </Button>
                            </div>
                          )}
                          {sub.review_status === "rejected" && sub.rejection_reason && (
                            <p className="text-xs text-muted-foreground max-w-[200px] truncate" title={sub.rejection_reason}>
                              {sub.rejection_reason}
                            </p>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Reject Dialog */}
        <Dialog open={!!rejectId} onOpenChange={(open) => { if (!open) { setRejectId(null); setRejectReason(""); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Submission</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Textarea
                placeholder="Reason for rejection (e.g., missing hashtags, wrong song)…"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
              <Button variant="destructive" className="w-full" onClick={handleReject} disabled={!rejectReason.trim() || !!acting}>
                {acting ? "Rejecting…" : "Confirm Rejection"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
