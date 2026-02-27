import { useEffect, useState } from "react";
import ProducerLayout from "@/components/layout/ProducerLayout";
import { useProducerApi } from "@/hooks/useProducerApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import StateBadge from "@/components/deals/StateBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, DollarSign, Clock, TrendingUp, Wallet } from "lucide-react";
import { format } from "date-fns";

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

export default function ProducerEarnings() {
  const api = useProducerApi();
  const [earnings, setEarnings] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [byTrack, setByTrack] = useState<any[]>([]);
  const [byCampaign, setByCampaign] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getEarnings(),
      api.getPayouts(),
      api.getEarningsByTrack(),
      api.getEarningsByCampaign(),
    ])
      .then(([e, p, bt, bc]) => {
        setEarnings(e);
        setPayouts(p);
        setByTrack(bt);
        setByCampaign(bc);
      })
      .finally(() => setLoading(false));
  }, []);

  const totalEarned = payouts.filter((p) => p.status === "completed").reduce((s, p) => s + Number(p.amount), 0);
  const pendingEarnings = earnings.filter((e) => e.payout_status !== "completed").reduce((s, e) => s + Number(e.producer_amount), 0);
  const totalPaidOut = payouts.filter((p) => p.status === "completed").reduce((s, p) => s + Number(p.amount), 0);
  const pendingBalance = pendingEarnings;

  const fmt = (n: number) => `$${Number(n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  return (
    <ProducerLayout>
      <h1 className="text-2xl font-bold mb-6">Earnings</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue Earned</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-2xl font-bold">{fmt(earnings.reduce((s, e) => s + Number(e.producer_amount), 0))}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Paid Out</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-24" /> : <div className="text-2xl font-bold">{fmt(totalPaidOut)}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Balance</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-24" /> : <div className="text-2xl font-bold">{fmt(pendingBalance)}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Tracks</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-24" /> : <div className="text-2xl font-bold">{byTrack.length}</div>}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="distributions">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="distributions">Revenue</TabsTrigger>
            <TabsTrigger value="by-track">By Track</TabsTrigger>
            <TabsTrigger value="by-campaign">By Campaign</TabsTrigger>
            <TabsTrigger value="payouts">Payouts</TabsTrigger>
          </TabsList>
          <Button variant="outline" size="sm" onClick={() => downloadCSV(earnings.length ? earnings : payouts, "earnings-export.csv")}>
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
        </div>

        <TabsContent value="distributions">
          {loading ? <Skeleton className="h-48 w-full" /> : earnings.length === 0 ? (
            <p className="text-muted-foreground">No revenue distributions yet.</p>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Track</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">Fee</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                    <TableHead className="text-right">Your Share</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {earnings.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.track_title}</TableCell>
                      <TableCell className="text-right">{fmt(e.gross_revenue)}</TableCell>
                      <TableCell className="text-right">{fmt(e.platform_fee)}</TableCell>
                      <TableCell className="text-right">{fmt(e.net_revenue)}</TableCell>
                      <TableCell className="text-right font-medium">{fmt(e.producer_amount)}</TableCell>
                      <TableCell><StateBadge state={e.payout_status} type="payout" /></TableCell>
                      <TableCell>{format(new Date(e.event_date), "MMM d, yyyy")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="by-track">
          {loading ? <Skeleton className="h-48 w-full" /> : byTrack.length === 0 ? (
            <p className="text-muted-foreground">No track revenue data yet.</p>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Track</TableHead>
                    <TableHead className="text-right">Gross Revenue</TableHead>
                    <TableHead className="text-right">Net Revenue</TableHead>
                    <TableHead className="text-right">Your Earnings</TableHead>
                    <TableHead className="text-right">Platform Share</TableHead>
                    <TableHead className="text-right">Events</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byTrack.map((t) => (
                    <TableRow key={t.track_id}>
                      <TableCell className="font-medium">{t.track_title}</TableCell>
                      <TableCell className="text-right">{fmt(t.total_gross)}</TableCell>
                      <TableCell className="text-right">{fmt(t.total_net)}</TableCell>
                      <TableCell className="text-right font-medium">{fmt(t.total_producer)}</TableCell>
                      <TableCell className="text-right">{fmt(t.total_platform)}</TableCell>
                      <TableCell className="text-right">{t.distribution_count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="by-campaign">
          {loading ? <Skeleton className="h-48 w-full" /> : byCampaign.length === 0 ? (
            <p className="text-muted-foreground">No campaign revenue data yet.</p>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Track</TableHead>
                    <TableHead>Campaign ID</TableHead>
                    <TableHead className="text-right">Your Earnings</TableHead>
                    <TableHead className="text-right">Events</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byCampaign.map((c, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{c.track_title}</TableCell>
                      <TableCell className="text-xs font-mono truncate max-w-[200px]">{c.campaign_id ?? "—"}</TableCell>
                      <TableCell className="text-right font-medium">{fmt(c.total_producer)}</TableCell>
                      <TableCell className="text-right">{c.event_count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="payouts">
          {loading ? <Skeleton className="h-48 w-full" /> : payouts.length === 0 ? (
            <p className="text-muted-foreground">No payouts yet.</p>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Processed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payouts.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-right font-medium">{fmt(p.amount)}</TableCell>
                      <TableCell className="capitalize">{p.payout_type ?? "—"}</TableCell>
                      <TableCell><StateBadge state={p.status} type="payout" /></TableCell>
                      <TableCell>{p.processed_at ? format(new Date(p.processed_at), "MMM d, yyyy") : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </ProducerLayout>
  );
}
