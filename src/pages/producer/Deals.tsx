import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import ProducerLayout from "@/components/layout/ProducerLayout";
import { useProducerApi } from "@/hooks/useProducerApi";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import StateBadge from "@/components/deals/StateBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Download, Pen, FileText, ShieldCheck, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { dedupeContracts } from "@/lib/dedupeContracts";

export default function ProducerDeals() {
  const api = useProducerApi();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "offers";

  const [offers, setOffers] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [loadingContracts, setLoadingContracts] = useState(true);

  // Contract detail state
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signatureName, setSignatureName] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  useEffect(() => {
    api.getOffers().then(setOffers).finally(() => setLoadingOffers(false));
    api.getContracts().then(setContracts).finally(() => setLoadingContracts(false));
  }, []);

  const openDetail = async (id: string) => {
    setSelectedId(id);
    setDetailLoading(true);
    setSignatureName("");
    setAgreedToTerms(false);
    try {
      const data = await api.getContractDetail(id);
      setDetail(data);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setDetailLoading(false);
  };

  const handleSign = async () => {
    if (!selectedId || !signatureName.trim() || !agreedToTerms) return;
    setSigning(true);
    try {
      await api.signContract(selectedId, signatureName.trim());
      toast({ title: "Contract signed successfully" });
      const data = await api.getContractDetail(selectedId);
      setDetail(data);
      const updated = await api.getContracts();
      setContracts(updated);
      setSignatureName("");
      setAgreedToTerms(false);
    } catch (err: any) {
      toast({ title: "Signing failed", description: err.message, variant: "destructive" });
    }
    setSigning(false);
  };

  const handleDownload = async (contractId: string) => {
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/contract-engine?action=download&contract_id=${contractId}`;
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) throw new Error("Download failed");
      const result = await res.json();
      if (result.signed_url) window.open(result.signed_url, "_blank");
    } catch (err: any) {
      toast({ title: "Download failed", description: err.message, variant: "destructive" });
    }
  };

  const getPaymentAmount = (body: string | null) => {
    if (!body) return null;
    const match = body.match(/\$[\d,]+(?:\.\d{2})?/);
    return match ? match[0] : null;
  };

  const uniqueContracts = dedupeContracts(contracts);
  const signedContracts = uniqueContracts.filter((c) => c.producer_signed_at || c.status === "fully_executed" || c.status === "signed_by_producer" || c.status === "signed_by_platform" || c.status === "archived");
  const unsignedContracts = uniqueContracts.filter((c) => !signedContracts.includes(c));

  return (
    <ProducerLayout>
      <h1 className="text-2xl font-bold mb-6">Deals</h1>

      <Tabs value={activeTab} onValueChange={(v) => setSearchParams({ tab: v })}>
        <TabsList className="mb-6">
          <TabsTrigger value="offers">Offers {offers.length > 0 && `(${offers.length})`}</TabsTrigger>
          <TabsTrigger value="contracts">Contracts {uniqueContracts.length > 0 && `(${uniqueContracts.length})`}</TabsTrigger>
        </TabsList>

        {/* ─── OFFERS TAB ─── */}
        <TabsContent value="offers">
          {loadingOffers ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : offers.length === 0 ? (
            <p className="text-muted-foreground">No offers yet.</p>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Track</TableHead>
                    <TableHead>Deal Type</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expires</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {offers.map((o) => (
                    <TableRow key={o.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/producer/offers/${o.id}`)}>
                      <TableCell className="font-medium">{o.track_title}</TableCell>
                      <TableCell className="capitalize">{o.deal_type?.replace(/_/g, " ") ?? "—"}</TableCell>
                      <TableCell>v{o.version_number}</TableCell>
                      <TableCell><StateBadge state={o.status} type="offer" /></TableCell>
                      <TableCell>{o.expires_at ? format(new Date(o.expires_at), "MMM d, yyyy") : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ─── CONTRACTS TAB ─── */}
        <TabsContent value="contracts">
          {loadingContracts ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>
          ) : contracts.length === 0 ? (
            <p className="text-muted-foreground">No contracts yet.</p>
          ) : (
            <div className="space-y-4">
              {signedContracts.map((c) => (
                <Card key={c.id} className="border-2 border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/10">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold text-lg">{c.track_title}</h3>
                          <StateBadge state={c.status} type="contract" />
                        </div>
                        <p className="text-sm text-emerald-700 dark:text-emerald-300">
                          ✅ Contract signed{c.producer_signed_at && ` on ${format(new Date(c.producer_signed_at), "MMM d, yyyy")}`}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button variant="outline" size="sm" onClick={() => openDetail(c.id)}>
                          <FileText className="h-4 w-4 mr-1" /> View
                        </Button>
                        {c.pdf_url && (
                          <Button size="sm" onClick={() => handleDownload(c.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                            <Download className="h-4 w-4 mr-2" /> Download PDF
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {unsignedContracts.map((c) => (
                <Card key={c.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => openDetail(c.id)}>
                  <CardContent className="p-5 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold">{c.track_title}</h3>
                        <StateBadge state={c.status} type="contract" />
                      </div>
                      <p className="text-sm text-muted-foreground">Offer v{c.offer_version}</p>
                    </div>
                    <Button variant="ghost" size="sm">
                      <FileText className="h-4 w-4 mr-1" /> Review & Sign
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Contract Detail Sheet */}
      {selectedId && (
        <Sheet open onOpenChange={() => { setSelectedId(null); setDetail(null); }}>
          <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Contract Detail</SheetTitle>
            </SheetHeader>
            {detailLoading ? (
              <div className="space-y-4 mt-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-32 rounded-xl" />
              </div>
            ) : !detail ? (
              <p className="mt-4 text-muted-foreground">Contract not found.</p>
            ) : (
              <div className="space-y-6 mt-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold">{detail.track_title}</h2>
                    <StateBadge state={detail.status} type="contract" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">Deal Type:</span> {detail.deal_type}</div>
                    <div><span className="text-muted-foreground">Template:</span> v{detail.template_version}</div>
                    <div><span className="text-muted-foreground">Offer:</span> v{detail.offer_version}</div>
                    {getPaymentAmount(detail.rendered_body) && (
                      <div><span className="text-muted-foreground">Payment:</span> {getPaymentAmount(detail.rendered_body)}</div>
                    )}
                  </div>
                </div>

                {detail.rendered_body && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h3 className="font-semibold flex items-center gap-2"><FileText className="h-4 w-4" /> Contract Text</h3>
                      <pre className="text-xs bg-muted p-4 rounded-md whitespace-pre-wrap max-h-96 overflow-y-auto font-mono">
                        {detail.rendered_body}
                      </pre>
                    </div>
                  </>
                )}

                {detail.status === "sent_for_signature" && (
                  <>
                    <Separator />
                    <div className="p-5 border-2 border-primary/20 rounded-lg bg-primary/5 space-y-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-primary" /> Digital Signature
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        By typing your full legal name below, you are providing your legally binding electronic signature.
                      </p>
                      <div className="space-y-2">
                        <Label>Type your full legal name to sign *</Label>
                        <Input value={signatureName} onChange={(e) => setSignatureName(e.target.value)} placeholder="e.g. John Doe" className="text-lg" />
                        {signatureName.trim() && (
                          <p className="text-2xl italic font-serif text-primary mt-2 px-3 py-2 border-b-2 border-primary/30">{signatureName}</p>
                        )}
                      </div>
                      <div className="flex items-start gap-3">
                        <Checkbox id="agree-terms" checked={agreedToTerms} onCheckedChange={(v) => setAgreedToTerms(v === true)} />
                        <label htmlFor="agree-terms" className="text-sm leading-relaxed cursor-pointer">
                          I have read and agree to all terms. I understand this electronic signature is legally binding.
                        </label>
                      </div>
                      <Button onClick={handleSign} disabled={signing || !signatureName.trim() || !agreedToTerms} className="w-full" size="lg">
                        <Pen className="h-4 w-4 mr-2" />
                        {signing ? "Signing..." : "Sign Contract"}
                      </Button>
                    </div>
                  </>
                )}

                {detail.producer_signed_at && (
                  <div className="p-5 border-2 border-emerald-500/20 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" /> Contract Signed
                    </h4>
                    <div className="text-sm space-y-1">
                      <p><strong>You signed:</strong> {format(new Date(detail.producer_signed_at), "MMMM d, yyyy 'at' h:mm a")}</p>
                      {detail.admin_signed_at && (
                        <p><strong>DanceVerse countersigned:</strong> {format(new Date(detail.admin_signed_at), "MMMM d, yyyy 'at' h:mm a")}</p>
                      )}
                    </div>
                    {detail.pdf_url && (
                      <Button onClick={() => handleDownload(detail.id)} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" size="lg">
                        <Download className="h-5 w-5 mr-2" /> Download Signed Contract
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </SheetContent>
        </Sheet>
      )}
    </ProducerLayout>
  );
}
