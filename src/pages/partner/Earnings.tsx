import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PartnerLayout from "@/components/layout/PartnerLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { usePartnerApi } from "@/hooks/usePartnerApi";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function PartnerEarnings() {
  const api = usePartnerApi();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [tab, setTab] = useState("all");

  const loadData = async (status: string) => {
    setLoading(true);
    try {
      const overview = await api.getOverview();
      if (!overview.terms_accepted_at) {
        navigate("/partner/terms", { replace: true });
        return;
      }
      const data = await api.getCommissions(status === "all" ? undefined : status);
      setCommissions(data ?? []);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(tab); }, [tab]);

  const totalPending = commissions.filter(c => c.status === "pending").reduce((s, c) => s + c.commission_cents, 0);
  const totalPaid = commissions.filter(c => c.status === "paid").reduce((s, c) => s + c.commission_cents, 0);

  return (
    <PartnerLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Earnings</h1>
          <p className="text-muted-foreground text-sm mt-1">Track your commission history</p>
        </div>

        <div className="flex gap-6 text-sm">
          <div>
            <span className="text-muted-foreground">Pending:</span>{" "}
            <span className="font-bold">{fmt(totalPending)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Paid:</span>{" "}
            <span className="font-bold">{fmt(totalPaid)}</span>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="paid">Paid</TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : commissions.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">No commissions yet.</div>
        ) : (
          <div className="rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dancer</TableHead>
                  <TableHead>Dancer Payout</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.dancer_name}</TableCell>
                    <TableCell>{fmt(c.dancer_payout_cents)}</TableCell>
                    <TableCell>{(c.commission_rate * 100).toFixed(0)}%</TableCell>
                    <TableCell className="font-bold">{fmt(c.commission_cents)}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === "paid" ? "default" : "secondary"}>
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(c.paid_at || c.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </PartnerLayout>
  );
}
