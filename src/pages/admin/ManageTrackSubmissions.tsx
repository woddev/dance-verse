import { useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useAdminApi } from "@/hooks/useAdminApi";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExternalLink, Trash2, Search, Video } from "lucide-react";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface TrackSubmission {
  id: string;
  track_id: string;
  dancer_id: string;
  video_url: string;
  platform: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  submitted_at: string;
  tracks: { title: string; artist_name: string; cover_image_url: string | null } | null;
  profiles: { id: string; full_name: string | null; avatar_url: string | null; instagram_handle: string | null; tiktok_handle: string | null } | null;
}

const platformIcon = (p: string) => {
  switch (p.toLowerCase()) {
    case "tiktok": return "🎵";
    case "instagram": return "📸";
    case "youtube": return "▶️";
    default: return "🔗";
  }
};

export default function ManageTrackSubmissions() {
  const { callAdmin } = useAdminApi();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<TrackSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    callAdmin("track-submissions")
      .then(setSubmissions)
      .catch((err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await callAdmin("delete-track-submission", undefined, { submission_id: id });
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
      toast({ title: "Submission removed" });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
    setDeleting(null);
  };

  const filtered = submissions.filter((s) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      s.tracks?.title?.toLowerCase().includes(q) ||
      s.tracks?.artist_name?.toLowerCase().includes(q) ||
      s.profiles?.full_name?.toLowerCase().includes(q) ||
      s.platform.toLowerCase().includes(q)
    );
  });

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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-3xl font-bold">Track Submissions</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {submissions.length} direct video submissions to tracks (non-campaign)
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tracks, dancers…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Video className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>{search ? "No submissions match your search" : "No track submissions yet"}</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dancer</TableHead>
                  <TableHead>Track</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={s.profiles?.avatar_url ?? undefined} />
                          <AvatarFallback className="text-xs">
                            {(s.profiles?.full_name ?? "?")[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{s.profiles?.full_name ?? "Unknown"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{s.tracks?.title ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{s.tracks?.artist_name}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="gap-1">
                        {platformIcon(s.platform)} {s.platform}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(s.submitted_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" asChild>
                          <a href={s.video_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove submission?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete this video submission from {s.profiles?.full_name ?? "this dancer"}.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(s.id)}
                                disabled={deleting === s.id}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                {deleting === s.id ? "Removing…" : "Remove"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
