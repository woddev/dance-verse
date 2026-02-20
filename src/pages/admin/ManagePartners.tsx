import { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useAdminApi } from "@/hooks/useAdminApi";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, UserPlus, Copy, CheckCircle, XCircle, DollarSign, Users, TrendingUp } from "lucide-react";

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

interface Partner {
  id: string;
  name: string;
  email: string;
  referral_code: string;
  status: string;
  stripe_account_id: string | null;
  stripe_onboarded: boolean;
  dancer_count: number;
  active_dancer_count: number;
  current_rate: number;
  pending_commission_cents: number;
  paid_commission_cents: number;
  created_at: string;
}

interface Commission {
  id: string;
  partner_id: string;
  dancer_id: string;
  dancer_payout_cents: number;
  commission_rate: number;
  commission_cents: number;
  status: string;
  created_at: string;
  paid_at: string | null;
  partners: { name: string; email: string; stripe_account_id: string | null; stripe_onboarded: boolean };
  dancer: { full_name: string };
}

function tierLabel(rate: number) {
  if (rate >= 0.10) return { label: "10%", color: "bg-primary text-primary-foreground" };
  if (rate >= 0.07) return { label: "7%", color: "bg-secondary text-secondary-foreground" };
  if (rate >= 0.05) return { label: "5%", color: "bg-accent text-accent-foreground" };
  if (rate >= 0.03) return { label: "3%", color: "bg-muted text-muted-foreground" };
  return { label: "—", color: "bg-muted text-muted-foreground" };
}

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function ManagePartners() {
  const { callAdmin } = useAdminApi();
  const { toast } = useToast();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [pendingCommissions, setPendingCommissions] = useState<Commission[]>([]);
  const [paidCommissions, setPaidCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", email: "" });
  const [addSaving, setAddSaving] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [stripeModalPartner, setStripeModalPartner] = useState<Partner | null>(null);
  const [stripeAccountId, setStripeAccountId] = useState("");
  const [stripeSaving, setStripeSaving] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [p, pending, paid] = await Promise.all([
        callAdmin("partners"),
        callAdmin("commissions", { status: "pending" }),
        callAdmin("commissions", { status: "paid" }),
      ]);
      setPartners(p ?? []);
      setPendingCommissions(pending ?? []);
      setPaidCommissions(paid ?? []);
    } catch (e: any) {
      toast({ title: "Error loading data", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [callAdmin, toast]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleAddPartner = async () => {
    if (!addForm.name.trim() || !addForm.email.trim()) {
      toast({ title: "Name and email are required", variant: "destructive" });
      return;
    }
    setAddSaving(true);
    try {
      await callAdmin("create-partner", {}, { name: addForm.name.trim(), email: addForm.email.trim() });
      toast({ title: "Partner created" });
      setAddOpen(false);
      setAddForm({ name: "", email: "" });
      loadAll();
    } catch (e: any) {
      toast({ title: "Error creating partner", description: e.message, variant: "destructive" });
    } finally {
      setAddSaving(false);
    }
  };

  const handleToggleStatus = async (partner: Partner) => {
    setUpdatingId(partner.id);
    try {
      await callAdmin("update-partner", {}, {
        partner_id: partner.id,
        status: partner.status === "active" ? "suspended" : "active",
      });
      toast({ title: partner.status === "active" ? "Partner suspended" : "Partner reinstated" });
      loadAll();
    } catch (e: any) {
      toast({ title: "Error updating partner", description: e.message, variant: "destructive" });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSaveStripe = async () => {
    if (!stripeModalPartner) return;
    setStripeSaving(true);
    try {
      await callAdmin("update-partner", {}, {
        partner_id: stripeModalPartner.id,
        stripe_account_id: stripeAccountId.trim() || null,
        stripe_onboarded: !!stripeAccountId.trim(),
      });
      toast({ title: "Stripe account saved" });
      setStripeModalPartner(null);
      setStripeAccountId("");
      loadAll();
    } catch (e: any) {
      toast({ title: "Error saving Stripe account", description: e.message, variant: "destructive" });
    } finally {
      setStripeSaving(false);
    }
  };

  const handlePayCommission = async (commission: Commission) => {
    if (!commission.partners.stripe_onboarded) {
      toast({ title: "Partner has no Stripe account connected", variant: "destructive" });
      return;
    }
    setPayingId(commission.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${FUNCTION_URL}/pay-partner-commission`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ commission_id: commission.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to pay commission");
      toast({ title: "Commission paid!", description: `Transfer ID: ${data.transfer_id}` });
      loadAll();
    } catch (e: any) {
      toast({ title: "Error paying commission", description: e.message, variant: "destructive" });
    } finally {
      setPayingId(null);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Referral code copied" });
  };

  const totalPending = pendingCommissions.reduce((s, c) => s + c.commission_cents, 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Partner Program</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage partners and track commission payouts</p>
          </div>
          <Button onClick={() => setAddOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" /> Add Partner
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" /> Total Partners
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{partners.length}</p>
              <p className="text-xs text-muted-foreground">{partners.filter(p => p.status === "active").length} active</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Active Dancers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{partners.reduce((s, p) => s + p.active_dancer_count, 0)}</p>
              <p className="text-xs text-muted-foreground">across all partners (30d)</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" /> Pending Commissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{fmt(totalPending)}</p>
              <p className="text-xs text-muted-foreground">{pendingCommissions.length} unpaid</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="partners">
          <TabsList>
            <TabsTrigger value="partners">Partners</TabsTrigger>
            <TabsTrigger value="commissions">
              Pending Commissions
              {pendingCommissions.length > 0 && (
                <span className="ml-2 bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5">
                  {pendingCommissions.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="history">Commission History</TabsTrigger>
          </TabsList>

          {/* Partners Tab */}
          <TabsContent value="partners" className="mt-4">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : partners.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No partners yet. Add one to get started.</div>
            ) : (
              <div className="rounded-md border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Partner</TableHead>
                      <TableHead>Referral Code</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Dancers</TableHead>
                      <TableHead>Active (30d)</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Pending</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Stripe</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {partners.map((p) => {
                      const tier = tierLabel(p.current_rate);
                      return (
                        <TableRow key={p.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{p.name}</p>
                              <p className="text-xs text-muted-foreground">{p.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <button
                              onClick={() => copyCode(p.referral_code)}
                              className="flex items-center gap-1.5 font-mono text-sm hover:text-primary transition-colors"
                            >
                              {p.referral_code}
                              <Copy className="h-3 w-3" />
                            </button>
                          </TableCell>
                          <TableCell>
                            <Badge variant={p.status === "active" ? "default" : "secondary"}>
                              {p.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{p.dancer_count}</TableCell>
                          <TableCell>{p.active_dancer_count}</TableCell>
                          <TableCell>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${tier.color}`}>
                              {tier.label}
                            </span>
                          </TableCell>
                          <TableCell className="font-medium">{fmt(p.pending_commission_cents)}</TableCell>
                          <TableCell className="text-muted-foreground">{fmt(p.paid_commission_cents)}</TableCell>
                          <TableCell>
                            {p.stripe_onboarded ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <button
                                onClick={() => { setStripeModalPartner(p); setStripeAccountId(p.stripe_account_id ?? ""); }}
                                className="text-xs text-muted-foreground underline hover:text-foreground"
                              >
                                Set up
                              </button>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {p.stripe_account_id && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => { setStripeModalPartner(p); setStripeAccountId(p.stripe_account_id ?? ""); }}
                                >
                                  Stripe
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant={p.status === "active" ? "destructive" : "outline"}
                                disabled={updatingId === p.id}
                                onClick={() => handleToggleStatus(p)}
                              >
                                {updatingId === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : p.status === "active" ? "Suspend" : "Reinstate"}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* Pending Commissions Tab */}
          <TabsContent value="commissions" className="mt-4">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : pendingCommissions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No pending commissions.</div>
            ) : (
              <div className="rounded-md border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Partner</TableHead>
                      <TableHead>Dancer</TableHead>
                      <TableHead>Dancer Payout</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead>Date Earned</TableHead>
                      <TableHead>Stripe Ready</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingCommissions.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.partners?.name}</TableCell>
                        <TableCell>{c.dancer?.full_name}</TableCell>
                        <TableCell>{fmt(c.dancer_payout_cents)}</TableCell>
                        <TableCell>{(c.commission_rate * 100).toFixed(0)}%</TableCell>
                        <TableCell className="font-semibold">{fmt(c.commission_cents)}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(c.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {c.partners?.stripe_onboarded ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            disabled={payingId === c.id || !c.partners?.stripe_onboarded}
                            onClick={() => handlePayCommission(c)}
                          >
                            {payingId === c.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <DollarSign className="h-3 w-3 mr-1" />}
                            Pay
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-4">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : paidCommissions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No paid commissions yet.</div>
            ) : (
              <div className="rounded-md border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Partner</TableHead>
                      <TableHead>Dancer</TableHead>
                      <TableHead>Dancer Payout</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead>Paid At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paidCommissions.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.partners?.name}</TableCell>
                        <TableCell>{c.dancer?.full_name}</TableCell>
                        <TableCell>{fmt(c.dancer_payout_cents)}</TableCell>
                        <TableCell>{(c.commission_rate * 100).toFixed(0)}%</TableCell>
                        <TableCell className="font-semibold">{fmt(c.commission_cents)}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {c.paid_at ? new Date(c.paid_at).toLocaleDateString() : "—"}
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

      {/* Add Partner Modal */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Partner</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input
                placeholder="Partner name"
                value={addForm.name}
                onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="partner@example.com"
                value={addForm.email}
                onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <p className="text-xs text-muted-foreground">A unique referral code (e.g. DANCE-XY3Z9A) will be auto-generated.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAddPartner} disabled={addSaving}>
              {addSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating…</> : "Create Partner"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stripe Account Modal */}
      <Dialog open={!!stripeModalPartner} onOpenChange={(open) => { if (!open) { setStripeModalPartner(null); setStripeAccountId(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stripe Account — {stripeModalPartner?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Stripe Connect Account ID</Label>
              <Input
                placeholder="acct_1AbcXYZ..."
                value={stripeAccountId}
                onChange={(e) => setStripeAccountId(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Enter the partner's Stripe Connect Express account ID. This enables commission transfers via Stripe.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setStripeModalPartner(null); setStripeAccountId(""); }}>Cancel</Button>
            <Button onClick={handleSaveStripe} disabled={stripeSaving}>
              {stripeSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
