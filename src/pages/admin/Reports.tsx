import { useEffect, useState, useMemo, useRef } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useAdminApi } from "@/hooks/useAdminApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Eye, Users, DollarSign, Loader2, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Submission {
  id: string;
  video_url: string;
  platform: string;
  view_count: number;
  comment_count: number;
  like_count: number;
  review_status: string;
  submitted_at: string;
  dancer_id: string;
  campaign_id: string;
  campaigns: { title: string; artist_name: string; pay_scale: any; start_date: string | null; end_date: string | null } | null;
  profiles: { full_name: string | null; instagram_handle: string | null; tiktok_handle: string | null } | null;
}

export default function Reports() {
  const { callAdmin } = useAdminApi();
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [campaignOptions, setCampaignOptions] = useState<{ id: string; title: string }[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const tableRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (selectedCampaign !== "all") params.campaign_id = selectedCampaign;
      if (selectedStatus !== "all") params.status = selectedStatus;
      const data = await callAdmin("report-data", params);
      setSubmissions(data.submissions ?? []);
      setCampaignOptions(data.campaigns ?? []);
    } catch (e: any) {
      console.error("Report fetch error:", e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [selectedCampaign, selectedStatus]);

  const refreshStats = async () => {
    setScraping(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const res = await supabase.functions.invoke("scrape-stats", {
        body: {},
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.error) throw res.error;

      const result = res.data;
      toast({
        title: "Stats refreshed",
        description: `Scraped ${result.processed} submissions. ${result.results?.filter((r: any) => !r.error).length ?? 0} succeeded.`,
      });

      // Reload report data
      await fetchData();
    } catch (e: any) {
      console.error("Scrape error:", e);
      toast({ title: "Scrape failed", description: e.message, variant: "destructive" });
    } finally {
      setScraping(false);
    }
  };

  const computeBudget = (payScale: any): number => {
    if (!Array.isArray(payScale)) return 0;
    return payScale.reduce((sum: number, tier: any) => sum + (Number(tier.amount ?? tier.pay ?? 0)), 0);
  };

  const stats = useMemo(() => {
    const uniqueDancers = new Set(submissions.map((s) => s.dancer_id)).size;
    const totalViews = submissions.reduce((s, sub) => s + sub.view_count, 0);
    const campaignBudgets = new Map<string, number>();
    submissions.forEach((sub) => {
      if (sub.campaigns && !campaignBudgets.has(sub.campaign_id)) {
        campaignBudgets.set(sub.campaign_id, computeBudget(sub.campaigns.pay_scale));
      }
    });
    const totalBudget = Array.from(campaignBudgets.values()).reduce((a, b) => a + b, 0);
    return { uniqueDancers, totalViews, totalBudget };
  }, [submissions]);

  const exportCSV = () => {
    const headers = ["Dancer", "Campaign", "Artist", "Platform", "Video Link", "Views", "Comments", "Likes", "Status", "Submitted"];
    const rows = submissions.map((s) => [
      s.profiles?.full_name ?? "Unknown",
      s.campaigns?.title ?? "",
      s.campaigns?.artist_name ?? "",
      s.platform,
      s.video_url,
      s.view_count,
      s.comment_count,
      s.like_count,
      s.review_status,
      format(new Date(s.submitted_at), "yyyy-MM-dd"),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const rows = submissions.map((s) => `
      <tr>
        <td>${s.profiles?.full_name ?? "Unknown"}</td>
        <td>${s.campaigns?.title ?? ""}</td>
        <td>${s.platform}</td>
        <td><a href="${s.video_url}">${s.video_url}</a></td>
        <td>${s.view_count}</td>
        <td>${s.comment_count}</td>
        <td>${s.like_count}</td>
        <td>${s.review_status}</td>
        <td>${format(new Date(s.submitted_at), "MMM d, yyyy")}</td>
      </tr>
    `).join("");
    printWindow.document.write(`
      <html><head><title>Campaign Report</title>
      <style>
        body { font-family: sans-serif; padding: 20px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
        th { background: #111; color: #fff; }
        h1 { font-size: 18px; }
        .stats { display: flex; gap: 24px; margin-bottom: 16px; }
        .stat { font-size: 14px; }
        .stat strong { font-size: 20px; }
      </style></head><body>
      <h1>DanceVerse Campaign Report — ${format(new Date(), "MMM d, yyyy")}</h1>
      <div class="stats">
        <div class="stat"><strong>$${stats.totalBudget}</strong><br/>Total Budget</div>
        <div class="stat"><strong>${stats.totalViews.toLocaleString()}</strong><br/>Total Views</div>
        <div class="stat"><strong>${stats.uniqueDancers}</strong><br/>Dancers</div>
      </div>
      <table><thead><tr>
        <th>Dancer</th><th>Campaign</th><th>Platform</th><th>Video Link</th><th>Views</th><th>Comments</th><th>Likes</th><th>Status</th><th>Date</th>
      </tr></thead><tbody>${rows}</tbody></table>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const statusColor = (s: string) => {
    if (s === "approved") return "default";
    if (s === "rejected") return "destructive";
    return "secondary";
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold">Reports</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={refreshStats} disabled={scraping}>
              <RefreshCw className={`h-4 w-4 mr-1 ${scraping ? "animate-spin" : ""}`} />
              {scraping ? "Scraping..." : "Refresh Stats"}
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV} disabled={submissions.length === 0}>
              <Download className="h-4 w-4 mr-1" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={exportPDF} disabled={submissions.length === 0}>
              <FileText className="h-4 w-4 mr-1" /> PDF
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger className="w-[220px]"><SelectValue placeholder="All Campaigns" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Campaigns</SelectItem>
              {campaignOptions.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Budget</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><p className="text-2xl font-bold">${stats.totalBudget.toLocaleString()}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Views</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><p className="text-2xl font-bold">{stats.totalViews.toLocaleString()}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Dancers Involved</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><p className="text-2xl font-bold">{stats.uniqueDancers}</p></CardContent>
          </Card>
        </div>

        {/* Data Table */}
        <div ref={tableRef}>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : submissions.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No submissions found.</p>
          ) : (
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dancer</TableHead>
                      <TableHead>Campaign</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Video Link</TableHead>
                      <TableHead className="text-right">Views</TableHead>
                      <TableHead className="text-right">Comments</TableHead>
                      <TableHead className="text-right">Likes</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.profiles?.full_name ?? "Unknown"}</TableCell>
                        <TableCell>{s.campaigns?.title ?? "—"}</TableCell>
                        <TableCell className="capitalize">{s.platform}</TableCell>
                        <TableCell>
                          <a href={s.video_url} target="_blank" rel="noopener noreferrer" className="text-primary underline truncate max-w-[200px] block">
                            {s.video_url}
                          </a>
                        </TableCell>
                        <TableCell className="text-right">{s.view_count.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{s.comment_count.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{s.like_count.toLocaleString()}</TableCell>
                        <TableCell><Badge variant={statusColor(s.review_status)}>{s.review_status}</Badge></TableCell>
                        <TableCell>{format(new Date(s.submitted_at), "MMM d, yyyy")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
