import { useState, useEffect } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useAdminApi } from "@/hooks/useAdminApi";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExternalLink, DollarSign, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface Submission {
  id: string;
  platform: string;
  video_url: string;
  review_status: string;
  dancer_id: string;
  campaigns: {
    title: string;
    artist_name: string;
    pay_scale: any;
  } | null;
  profiles: {
    full_name: string | null;
    stripe_onboarded?: boolean;
  } | null;
}

interface Payout {
  id: string;
  amount_cents: number;
  status: string;
  created_at: string;
  completed_at: string | null;
  stripe_transfer_id: string | null;
  dancer_id: string;
  submission_id: string;
  submissions: {
    video_url: string;
    platform: string;
    campaigns: { title: string } | null;
  } | null;
  profiles: {
    full_name: string | null;
  } | null;
}

export default function ManagePayouts() {
  const { callAdmin } = useAdminApi();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [subs, pays] = await Promise.all([callAdmin("submissions"), callAdmin("payouts")]);
      setSubmissions(subs);
      setPayouts(pays);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const paidSubmissionIds = new Set(payouts.map((p) => p.submission_id));
  const readyToPay = submissions.filter(
    (s) => s.review_status === "approved" && !paidSubmissionIds.has(s.id)
  );

  const getPayAmount = (sub: Submission): number => {
    const scale = sub.campaigns?.pay_scale;
    if (Array.isArray(scale) && scale.length > 0) return scale[0].amount_cents ?? 0;
    return 0;
  };

  const handlePay = async (sub: Submission) => {
    const amount_cents = getPayAmount(sub);
    if (!amount_cents) {
      toast({ title: "No pay scale", description: "This campaign has no pay amount configured.", variant: "destructive" });
      return;
    }
    setPaying(sub.id);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ submission_id: sub.id, amount_cents }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Payout failed");

      toast({ title: "Payout sent!", description: `$${(amount_cents / 100).toFixed(2)} transferred.` });
      await fetchData();
    } catch (err: any) {
      toast({ title: "Payout failed", description: err.message, variant: "destructive" });
    }
    setPaying(null);
  };

  const statusBadge = (status: string) => {
    const variant = status === "completed" ? "default" : status === "failed" ? "destructive" : "secondary";
    return <Badge variant={variant}>{status}</Badge>;
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Manage Payouts</h1>

        <Tabs defaultValue="ready">
          <TabsList>
            <TabsTrigger value="ready">Ready to Pay ({readyToPay.length})</TabsTrigger>
            <TabsTrigger value="history">Payout History ({payouts.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="ready" className="mt-4">
            {readyToPay.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">No approved submissions awaiting payment.</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dancer</TableHead>
                      <TableHead>Campaign</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Video</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {readyToPay.map((sub) => {
                      const amount = getPayAmount(sub);
                      const stripeReady = sub.profiles?.stripe_onboarded !== false;
                      return (
                        <TableRow key={sub.id}>
                          <TableCell className="font-medium">
                            {sub.profiles?.full_name ?? "Unknown"}
                            {!stripeReady && (
                              <div className="flex items-center gap-1 text-xs text-destructive mt-0.5">
                                <AlertTriangle className="h-3 w-3" /> No Stripe
                              </div>
                            )}
                          </TableCell>
                          <TableCell>{sub.campaigns?.title ?? "—"}</TableCell>
                          <TableCell><Badge variant="outline">{sub.platform}</Badge></TableCell>
                          <TableCell>
                            <a href={sub.video_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                              View <ExternalLink className="h-3 w-3" />
                            </a>
                          </TableCell>
                          <TableCell className="font-medium">
                            {amount ? `$${(amount / 100).toFixed(2)}` : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() => handlePay(sub)}
                              disabled={paying === sub.id || !amount || !stripeReady}
                            >
                              <DollarSign className="h-3.5 w-3.5 mr-1" />
                              {paying === sub.id ? "Paying…" : `Pay $${(amount / 100).toFixed(2)}`}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            {payouts.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">No payouts yet.</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dancer</TableHead>
                      <TableHead>Campaign</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Transfer ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payouts.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.profiles?.full_name ?? "Unknown"}</TableCell>
                        <TableCell>{p.submissions?.campaigns?.title ?? "—"}</TableCell>
                        <TableCell className="font-medium">${(p.amount_cents / 100).toFixed(2)}</TableCell>
                        <TableCell>{statusBadge(p.status)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {p.completed_at ? format(new Date(p.completed_at), "MMM d, yyyy") : format(new Date(p.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {p.stripe_transfer_id ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
