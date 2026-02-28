import { useEffect, useState } from "react";
import ProducerLayout from "@/components/layout/ProducerLayout";
import { useProducerApi } from "@/hooks/useProducerApi";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import StateBadge from "@/components/deals/StateBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Download, Pen, FileText, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

export default function ProducerContracts() {
  const api = useProducerApi();
  const { toast } = useToast();
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [signing, setSigning] = useState(false);

  // Digital signature state
  const [signatureName, setSignatureName] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  useEffect(() => {
    api.getContracts().then(setContracts).finally(() => setLoading(false));
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
      await api.signContract(selectedId);
      toast({ title: "Contract signed successfully" });
      const data = await api.getContractDetail(selectedId);
      setDetail(data);
      const contracts = await api.getContracts();
      setContracts(contracts);
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
      if (result.signed_url) {
        window.open(result.signed_url, "_blank");
      }
    } catch (err: any) {
      toast({ title: "Download failed", description: err.message, variant: "destructive" });
    }
  };

  // Extract payment amount from contract body
  const getPaymentAmount = (body: string | null) => {
    if (!body) return null;
    const buyoutMatch = body.match(/\$[\d,]+(?:\.\d{2})?/);
    return buyoutMatch ? buyoutMatch[0] : null;
  };

  return (
    <ProducerLayout>
      <h1 className="text-2xl font-bold mb-6">Contracts</h1>
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : contracts.length === 0 ? (
        <p className="text-muted-foreground">No contracts yet.</p>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Track</TableHead>
                <TableHead>Offer Version</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Signed</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.track_title}</TableCell>
                  <TableCell>v{c.offer_version}</TableCell>
                  <TableCell><StateBadge state={c.status} type="contract" /></TableCell>
                  <TableCell>{c.producer_signed_at ? format(new Date(c.producer_signed_at), "MMM d, yyyy") : "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openDetail(c.id)}>
                        <FileText className="h-4 w-4 mr-1" /> View
                      </Button>
                      {c.pdf_url && (
                        <Button variant="ghost" size="sm" onClick={() => handleDownload(c.id)}>
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

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

                {/* Rendered Contract Body */}
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

                {/* Digital Signature Section */}
                {detail.status === "sent_for_signature" && (
                  <>
                    <Separator />
                    <div className="p-5 border-2 border-primary/20 rounded-lg bg-primary/5 space-y-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-primary" /> Digital Signature
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        By typing your full legal name below and checking the agreement box, you are providing your legally binding electronic signature.
                      </p>
                      <div className="space-y-2">
                        <Label>Type your full legal name to sign *</Label>
                        <Input
                          value={signatureName}
                          onChange={(e) => setSignatureName(e.target.value)}
                          placeholder="e.g. John Doe"
                          className="text-lg"
                        />
                        {signatureName.trim() && (
                          <p className="text-2xl italic font-serif text-primary mt-2 px-3 py-2 border-b-2 border-primary/30">
                            {signatureName}
                          </p>
                        )}
                      </div>
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id="agree-terms"
                          checked={agreedToTerms}
                          onCheckedChange={(v) => setAgreedToTerms(v === true)}
                        />
                        <label htmlFor="agree-terms" className="text-sm leading-relaxed cursor-pointer">
                          I have read and agree to all terms outlined in this contract. I understand this electronic signature is legally binding and cannot be undone.
                        </label>
                      </div>
                      <Button
                        onClick={handleSign}
                        disabled={signing || !signatureName.trim() || !agreedToTerms}
                        className="w-full"
                      >
                        <Pen className="h-4 w-4 mr-2" />
                        {signing ? "Signing..." : "Sign Contract"}
                      </Button>
                    </div>
                  </>
                )}

                {/* Signature confirmation */}
                {detail.producer_signed_at && (
                  <div className="p-4 border rounded-lg bg-muted/50 space-y-2">
                    <h4 className="font-semibold flex items-center gap-2 text-sm">
                      <ShieldCheck className="h-4 w-4 text-green-600" /> Signatures
                    </h4>
                    <div className="text-sm">
                      <strong>Producer signed:</strong> {format(new Date(detail.producer_signed_at), "MMM d, yyyy 'at' h:mm a")}
                    </div>
                    {detail.admin_signed_at && (
                      <div className="text-sm">
                        <strong>DanceVerse countersigned:</strong> {format(new Date(detail.admin_signed_at), "MMM d, yyyy 'at' h:mm a")}
                      </div>
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
