import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExternalLink, Play, Clock, CheckCircle, XCircle, Upload } from "lucide-react";
import { format } from "date-fns";

type SubmissionRow = {
  id: string;
  platform: string;
  video_url: string;
  submitted_at: string;
  review_status: string;
  rejection_reason: string | null;
  campaigns: { title: string; artist_name: string; cover_image_url: string | null } | null;
};

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive"; icon: React.ElementType }> = {
  pending: { label: "Pending", variant: "secondary", icon: Clock },
  approved: { label: "Approved", variant: "default", icon: CheckCircle },
  rejected: { label: "Rejected", variant: "destructive", icon: XCircle },
};

export default function MySubmissions() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("submissions")
        .select("id, platform, video_url, submitted_at, review_status, rejection_reason, campaigns(title, artist_name, cover_image_url)")
        .eq("dancer_id", user.id)
        .order("submitted_at", { ascending: false });

      if (data) setSubmissions(data as SubmissionRow[]);
      setLoading(false);
    })();
  }, [user]);

  const filtered = filter === "all" ? submissions : submissions.filter((s) => s.review_status === filter);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">My Submissions</h1>
            <p className="text-muted-foreground">Track your video submissions and their review status.</p>
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ({submissions.length})</SelectItem>
              <SelectItem value="pending">Pending ({submissions.filter((s) => s.review_status === "pending").length})</SelectItem>
              <SelectItem value="approved">Approved ({submissions.filter((s) => s.review_status === "approved").length})</SelectItem>
              <SelectItem value="rejected">Rejected ({submissions.filter((s) => s.review_status === "rejected").length})</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                {filter === "all"
                  ? "No submissions yet. Accept a campaign and submit your videos!"
                  : `No ${filter} submissions.`}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Mobile card view */}
            <div className="space-y-3 sm:hidden">
              {filtered.map((sub) => {
                const cfg = statusConfig[sub.review_status] ?? statusConfig.pending;
                const StatusIcon = cfg.icon;
                return (
                  <Card key={sub.id}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-medium truncate">{sub.campaigns?.title ?? "Campaign"}</p>
                        <Badge variant={cfg.variant} className="flex items-center gap-1 shrink-0">
                          <StatusIcon className="h-3 w-3" />
                          {cfg.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {sub.campaigns?.artist_name} · {sub.platform} · {format(new Date(sub.submitted_at), "MMM d, yyyy")}
                      </p>
                      {sub.review_status === "rejected" && sub.rejection_reason && (
                        <p className="text-xs text-destructive">Reason: {sub.rejection_reason}</p>
                      )}
                      <a
                        href={sub.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary flex items-center gap-1 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View Video
                      </a>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Desktop table view */}
            <Card className="hidden sm:block">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campaign</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Video</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((sub) => {
                      const cfg = statusConfig[sub.review_status] ?? statusConfig.pending;
                      const StatusIcon = cfg.icon;
                      return (
                        <TableRow key={sub.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{sub.campaigns?.title ?? "Campaign"}</p>
                              <p className="text-xs text-muted-foreground">{sub.campaigns?.artist_name}</p>
                            </div>
                          </TableCell>
                          <TableCell className="capitalize">{sub.platform}</TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(sub.submitted_at), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Badge variant={cfg.variant} className="flex items-center gap-1 w-fit">
                                <StatusIcon className="h-3 w-3" />
                                {cfg.label}
                              </Badge>
                              {sub.review_status === "rejected" && sub.rejection_reason && (
                                <p className="text-xs text-destructive max-w-[200px] truncate" title={sub.rejection_reason}>
                                  {sub.rejection_reason}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <a
                              href={sub.video_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline flex items-center gap-1 text-sm"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              View
                            </a>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
