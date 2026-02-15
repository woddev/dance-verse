import { useEffect, useState, useMemo, useRef } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useAdminApi } from "@/hooks/useAdminApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Download, FileText, Eye, Users, DollarSign, Loader2, RefreshCw, ChevronDown, ChevronRight, Plus, Trash2, Link as LinkIcon, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ReportLink {
  label: string;
  url: string;
  scraped_content?: string | null;
  scraped_at?: string | null;
  scrape_error?: string | null;
}

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
  campaigns: {
    title: string;
    artist_name: string;
    pay_scale: any;
    start_date: string | null;
    end_date: string | null;
    report_links: ReportLink[];
  } | null;
  profiles: { full_name: string | null; instagram_handle: string | null; tiktok_handle: string | null } | null;
}

interface CampaignGroup {
  campaign_id: string;
  title: string;
  artist_name: string;
  pay_scale: any;
  report_links: ReportLink[];
  submissions: Submission[];
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  dancerCount: number;
}

export default function Reports() {
  const { callAdmin } = useAdminApi();
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [campaignOptions, setCampaignOptions] = useState<{ id: string; title: string }[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [editingLinks, setEditingLinks] = useState<string | null>(null);
  const [linkDraft, setLinkDraft] = useState<ReportLink[]>([]);
  const [savingLinks, setSavingLinks] = useState(false);
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

  const computeBudget = (payScale: any): number => {
    if (!Array.isArray(payScale)) return 0;
    return payScale.reduce((sum: number, tier: any) => sum + (Number(tier.amount ?? tier.pay ?? 0)), 0);
  };

  const campaignGroups = useMemo((): CampaignGroup[] => {
    const map = new Map<string, CampaignGroup>();
    for (const s of submissions) {
      const cid = s.campaign_id;
      if (!map.has(cid)) {
        map.set(cid, {
          campaign_id: cid,
          title: s.campaigns?.title ?? "Unknown Campaign",
          artist_name: s.campaigns?.artist_name ?? "",
          pay_scale: s.campaigns?.pay_scale,
          report_links: Array.isArray(s.campaigns?.report_links) ? s.campaigns.report_links : [],
          submissions: [],
          totalViews: 0,
          totalLikes: 0,
          totalComments: 0,
          dancerCount: 0,
        });
      }
      const group = map.get(cid)!;
      group.submissions.push(s);
      group.totalViews += s.view_count;
      group.totalLikes += s.like_count;
      group.totalComments += s.comment_count;
    }
    // Calculate unique dancers per group
    for (const group of map.values()) {
      group.dancerCount = new Set(group.submissions.map((s) => s.dancer_id)).size;
    }
    return Array.from(map.values());
  }, [submissions]);

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
      toast({
        title: "Stats refreshed",
        description: `Scraped ${res.data.processed} submissions.`,
      });
      await fetchData();
    } catch (e: any) {
      toast({ title: "Scrape failed", description: e.message, variant: "destructive" });
    } finally {
      setScraping(false);
    }
  };

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const startEditLinks = (group: CampaignGroup) => {
    setEditingLinks(group.campaign_id);
    setLinkDraft([...group.report_links]);
  };

  const saveLinks = async (campaignId: string) => {
    setSavingLinks(true);
    try {
      const res = await callAdmin("save-report-links", undefined, {
        campaign_id: campaignId,
        links: linkDraft.filter((l) => l.url.trim()),
      });
      setEditingLinks(null);
      const scraped = res.links?.filter((l: any) => l.scraped_content).length ?? 0;
      toast({ title: "Links saved & scraped", description: `${scraped} of ${res.links?.length ?? 0} links scraped successfully.` });
      await fetchData();
    } catch (e: any) {
      toast({ title: "Failed to save links", description: e.message, variant: "destructive" });
    } finally {
      setSavingLinks(false);
    }
  };

  const exportCSV = () => {
    const headers = ["Campaign", "Dancer", "Artist", "Platform", "Video Link", "Views", "Comments", "Likes", "Status", "Submitted"];
    const rows = submissions.map((s) => [
      s.campaigns?.title ?? "",
      s.profiles?.full_name ?? "Unknown",
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
    const campaignSections = campaignGroups.map((g) => {
      const rows = g.submissions.map((s) => `
        <tr>
          <td>${s.profiles?.full_name ?? "Unknown"}</td>
          <td>${s.platform}</td>
          <td><a href="${s.video_url}">${s.video_url}</a></td>
          <td>${s.view_count}</td>
          <td>${s.comment_count}</td>
          <td>${s.like_count}</td>
          <td>${s.review_status}</td>
          <td>${format(new Date(s.submitted_at), "MMM d, yyyy")}</td>
        </tr>
      `).join("");
      const links = g.report_links.length > 0
        ? `<p style="margin:4px 0;font-size:12px;">Links: ${g.report_links.map((l) => `<a href="${l.url}">${l.label || l.url}</a>`).join(" | ")}</p>`
        : "";
      return `
        <h2 style="margin-top:24px;">${g.title} — ${g.artist_name}</h2>
        ${links}
        <p style="font-size:12px;color:#666;">${g.submissions.length} submissions · ${g.dancerCount} dancers · ${g.totalViews.toLocaleString()} views</p>
        <table><thead><tr>
          <th>Dancer</th><th>Platform</th><th>Video</th><th>Views</th><th>Comments</th><th>Likes</th><th>Status</th><th>Date</th>
        </tr></thead><tbody>${rows}</tbody></table>
      `;
    }).join("");
    printWindow.document.write(`
      <html><head><title>Campaign Report</title>
      <style>
        body { font-family: sans-serif; padding: 20px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 16px; }
        th, td { border: 1px solid #ddd; padding: 5px 7px; text-align: left; }
        th { background: #111; color: #fff; }
        h1 { font-size: 18px; } h2 { font-size: 15px; }
      </style></head><body>
      <h1>DanceVerse Campaign Report — ${format(new Date(), "MMM d, yyyy")}</h1>
      ${campaignSections}
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

        {/* Campaign Groups */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : campaignGroups.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">No submissions found.</p>
        ) : (
          <div className="space-y-4">
            {campaignGroups.map((group) => {
              const isOpen = openGroups.has(group.campaign_id);
              const isEditingThisGroup = editingLinks === group.campaign_id;

              return (
                <Card key={group.campaign_id}>
                  <Collapsible open={isOpen} onOpenChange={() => toggleGroup(group.campaign_id)}>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            <div>
                              <CardTitle className="text-base">{group.title}</CardTitle>
                              <p className="text-sm text-muted-foreground">{group.artist_name}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{group.submissions.length} submissions</span>
                            <span>{group.dancerCount} dancers</span>
                            <span>{group.totalViews.toLocaleString()} views</span>
                            <span>${computeBudget(group.pay_scale).toLocaleString()}</span>
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <CardContent className="pt-0 space-y-4">
                        {/* Report Links */}
                        <div className="border rounded-md p-3 bg-muted/30">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium flex items-center gap-1.5">
                              <LinkIcon className="h-3.5 w-3.5" /> Report Links
                            </span>
                            {!isEditingThisGroup && (
                              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); startEditLinks(group); }}>
                                Edit
                              </Button>
                            )}
                          </div>

                          {isEditingThisGroup ? (
                            <div className="space-y-2">
                              {linkDraft.map((link, i) => (
                                <div key={i} className="flex gap-2">
                                  <Input
                                    placeholder="Label"
                                    value={link.label}
                                    onChange={(e) => {
                                      const next = [...linkDraft];
                                      next[i] = { ...next[i], label: e.target.value };
                                      setLinkDraft(next);
                                    }}
                                    className="w-[140px]"
                                  />
                                  <Input
                                    placeholder="https://..."
                                    value={link.url}
                                    onChange={(e) => {
                                      const next = [...linkDraft];
                                      next[i] = { ...next[i], url: e.target.value };
                                      setLinkDraft(next);
                                    }}
                                  />
                                  <Button variant="ghost" size="icon" onClick={() => setLinkDraft(linkDraft.filter((_, j) => j !== i))}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => setLinkDraft([...linkDraft, { label: "", url: "" }])}>
                                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Link
                                </Button>
                                <Button size="sm" onClick={() => saveLinks(group.campaign_id)} disabled={savingLinks}>
                                  {savingLinks ? "Scraping & Saving..." : "Save & Scrape"}
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => setEditingLinks(null)}>Cancel</Button>
                              </div>
                            </div>
                          ) : group.report_links.length > 0 ? (
                            <div className="space-y-3">
                              {group.report_links.map((link, i) => (
                                <div key={i} className="space-y-1">
                                  <a
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline font-medium"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                    {link.label || link.url}
                                  </a>
                                  {link.scraped_at && (
                                    <p className="text-xs text-muted-foreground">
                                      {link.scraped_content ? "✅" : link.scrape_error ? "❌" : "⏳"}{" "}
                                      {link.scraped_content
                                        ? `Scraped ${format(new Date(link.scraped_at), "MMM d, yyyy 'at' h:mm a")}`
                                        : link.scrape_error
                                          ? `Failed: ${link.scrape_error}`
                                          : "Pending"}
                                    </p>
                                  )}
                                  {link.scraped_content && (
                                    <details className="text-xs">
                                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">View scraped content</summary>
                                      <pre className="mt-1 p-2 bg-muted rounded text-xs max-h-40 overflow-auto whitespace-pre-wrap">{link.scraped_content}</pre>
                                    </details>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">No links added yet.</p>
                          )}
                        </div>

                        {/* Submissions Table */}
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Dancer</TableHead>
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
                              {group.submissions.map((s) => (
                                <TableRow key={s.id}>
                                  <TableCell className="font-medium">{s.profiles?.full_name ?? "Unknown"}</TableCell>
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
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
