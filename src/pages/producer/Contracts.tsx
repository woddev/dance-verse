import { useEffect, useState } from "react";
import ProducerLayout from "@/components/layout/ProducerLayout";
import { useProducerApi } from "@/hooks/useProducerApi";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import StateBadge from "@/components/deals/StateBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Download, Pen, FileText } from "lucide-react";
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

  useEffect(() => {
    api.getContracts().then(setContracts).finally(() => setLoading(false));
  }, []);

  const openDetail = async (id: string) => {
    setSelectedId(id);
    setDetailLoading(true);
    try {
      const data = await api.getContractDetail(id);
      setDetail(data);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setDetailLoading(false);
  };

  const handleSign = async () => {
    if (!selectedId) return;
    setSigning(true);
    try {
      await api.signContract(selectedId);
      toast({ title: "Contract signed successfully" });
      // Reload
      const data = await api.getContractDetail(selectedId);
      setDetail(data);
      const contracts = await api.getContracts();
      setContracts(contracts);
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
                  </div>
                </div>

                {/* Sign Button */}
                {detail.status === "sent_for_signature" && (
                  <>
                    <Separator />
                    <div className="p-4 border-2 border-primary/20 rounded-lg bg-primary/5 space-y-3">
                      <h3 className="font-semibold">Ready for Your Signature</h3>
                      <p className="text-sm text-muted-foreground">
                        By signing, you agree to all terms outlined in this contract. This action is legally binding and cannot be undone.
                      </p>
                      <Button onClick={handleSign} disabled={signing}>
                        <Pen className="h-4 w-4 mr-2" />
                        {signing ? "Signing..." : "Sign Contract"}
                      </Button>
                    </div>
                  </>
                )}

                {detail.producer_signed_at && (
                  <div className="p-3 border rounded-md bg-muted/50 text-sm">
                    <strong>Your signature:</strong> {format(new Date(detail.producer_signed_at), "MMM d, yyyy HH:mm")}
                    {detail.admin_signed_at && (
                      <> | <strong>Countersigned:</strong> {format(new Date(detail.admin_signed_at), "MMM d, yyyy HH:mm")}</>
                    )}
                  </div>
                )}

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
              </div>
            )}
          </SheetContent>
        </Sheet>
      )}
    </ProducerLayout>
  );
}
