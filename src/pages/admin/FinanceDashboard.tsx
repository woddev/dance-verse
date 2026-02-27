import { useEffect, useState, useCallback } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useAdminApi } from "@/hooks/useAdminApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import StateBadge from "@/components/deals/StateBadge";
import { DollarSign, AlertTriangle, Download, RefreshCcw, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

function downloadCSV(data: any[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const csv = [headers.join(","), ...data.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

async function callPayoutEngine(action: string, body: any = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const res = await fetch(`https://${projectId}.supabase.co/functions/v1/process-producer-payout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ action, ...body }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

export default function FinanceDashboard() {
  const { callAdmin } = useAdminApi();
  const [loading, setLoading] = useState(true);
  const [liability, setLiability] = useState<any>(null);
  const [pendingProducers, setPendingProducers] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [payoutFilter, setPayoutFilter] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [liabilityRes, pendingRes, payoutsRes] = await Promise.all([
        callAdmin("finance-liability"),
        callAdmin("finance-pending-producers"),
        callAdmin("finance-payouts", payoutFilter ? { status: payoutFilter } : undefined),
      ]);
      setLiability(liabilityRes);
      setPendingProducers(pendingRes);
      setPayouts(payoutsRes);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [callAdmin, payoutFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const processPayout = async (producer: any) => {
    setProcessingId(producer.producer_id);
    try {
      if (!producer.stripe_account_id) {
        toast.error("Producer has no Stripe account configured");
        return;
      }
      if (!producer.stripe_onboarded) {
        toast.error("Producer Stripe account is not verified");
        return;
      }

      // Get queue data for this producer
      const queue = await callPayoutEngine("get-queue", { producer_id: producer.producer_id });
      const entry = queue?.[0];
      if (!entry) {
        toast.error("No pending distributions for this producer");
        return;
      }

      const result = await callPayoutEngine("process-payout", {
        producer_id: entry.producer_id,
        distribution_ids: entry.distribution_ids,
        total_amount: entry.total_amount,
        stripe_account_id: entry.stripe_account_id,
      });

      if (result.success) {
        toast.success(`Payout processed: $${entry.total_amount.toFixed(2)}`);
      } else {
        toast.error(`Payout failed: ${result.error}`);
      }
      loadData();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setProcessingId(null);
    }
  };

  const retryPayout = async (payoutId: string) => {
    setProcessingId(payoutId);
    try {
      const result = await callPayoutEngine("retry-payout", { payout_id: payoutId });
      if (result.success) {
        toast.success("Payout retry successful");
      } else {
        toast.error(`Retry failed: ${result.error}`);
      }
      loadData();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setProcessingId(null);
    }
  };

  const fmt = (n: number) => `$${Number(n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Finance Dashboard</h1>
        <Button variant="outline" size="sm" onClick={() => downloadCSV(payouts, `payouts-${new Date().toISOString().split("T")[0]}.csv`)}>
          <Download className="h-4 w-4 mr-1" /> Export CSV
        </Button>
      </div>

      {/* Liability Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Producer Liability", value: liability?.total_producer_liability, icon: AlertTriangle, color: "text-orange-500" },
          { label: "Producer Paid", value: liability?.total_producer_paid, icon: CheckCircle, color: "text-green-500" },
          { label: "Dancer Liability", value: liability?.total_dancer_liability, icon: AlertTriangle, color: "text-orange-500" },
          { label: "Dancer Paid", value: liability?.total_dancer_paid, icon: CheckCircle, color: "text-green-500" },
        ].map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
              <c.icon className={`h-4 w-4 ${c.color}`} />
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-8 w-24" /> : <div className="text-2xl font-bold">{fmt(c.value)}</div>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="pending">
        <TabsList className="mb-4">
          <TabsTrigger value="pending">Pending Producer Payouts</TabsTrigger>
          <TabsTrigger value="history">Payout History</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {loading ? <Skeleton className="h-48 w-full" /> : pendingProducers.length === 0 ? (
            <p className="text-muted-foreground">No pending producer payouts.</p>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producer</TableHead>
                    <TableHead className="text-right">Pending Amount</TableHead>
                    <TableHead className="text-right">Distributions</TableHead>
                    <TableHead>Stripe Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingProducers.map((p: any) => (
                    <TableRow key={p.producer_id}>
                      <TableCell className="font-medium">{p.producer_name}</TableCell>
                      <TableCell className="text-right font-medium">{fmt(p.pending_amount)}</TableCell>
                      <TableCell className="text-right">{p.distribution_count}</TableCell>
                      <TableCell>
                        {p.stripe_onboarded ? (
                          <Badge variant="default" className="bg-green-600">Verified</Badge>
                        ) : p.stripe_account_id ? (
                          <Badge variant="secondary">Pending</Badge>
                        ) : (
                          <Badge variant="destructive">Not Set Up</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          disabled={!p.stripe_onboarded || processingId === p.producer_id}
                          onClick={() => processPayout(p)}
                        >
                          {processingId === p.producer_id ? "Processing..." : "Process Payout"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history">
          <div className="flex gap-2 mb-4">
            {[null, "completed", "failed", "processing"].map((s) => (
              <Button
                key={s ?? "all"}
                variant={payoutFilter === s ? "default" : "outline"}
                size="sm"
                onClick={() => setPayoutFilter(s)}
              >
                {s ? s.charAt(0).toUpperCase() + s.slice(1) : "All"}
              </Button>
            ))}
          </div>

          {loading ? <Skeleton className="h-48 w-full" /> : payouts.length === 0 ? (
            <p className="text-muted-foreground">No payouts found.</p>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producer</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Stripe Ref</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payouts.map((p: any) => (
                    <TableRow key={p.id} className={p.flagged_for_review ? "bg-destructive/5" : ""}>
                      <TableCell className="font-medium">
                        {p.producer_name}
                        {p.flagged_for_review && (
                          <Badge variant="destructive" className="ml-2 text-xs">Flagged</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">{fmt(p.amount)}</TableCell>
                      <TableCell className="capitalize">{p.payout_type ?? "—"}</TableCell>
                      <TableCell><StateBadge state={p.status} type="payout" /></TableCell>
                      <TableCell className="text-xs font-mono truncate max-w-[120px]">
                        {p.payout_provider_reference ?? "—"}
                      </TableCell>
                      <TableCell>{p.processed_at ? format(new Date(p.processed_at), "MMM d, yyyy") : format(new Date(p.created_at), "MMM d, yyyy")}</TableCell>
                      <TableCell className="text-right">
                        {p.status === "failed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={processingId === p.id}
                            onClick={() => retryPayout(p.id)}
                          >
                            <RefreshCcw className="h-3 w-3 mr-1" />
                            Retry
                          </Button>
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
    </AdminLayout>
  );
}
