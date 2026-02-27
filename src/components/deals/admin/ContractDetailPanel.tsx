import { useState, useEffect } from "react";
import { useAdminApi } from "@/hooks/useAdminApi";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import StateBadge from "@/components/deals/StateBadge";
import { format } from "date-fns";
import { FileText, Clock, Shield, Download, Pen, Archive } from "lucide-react";

interface Props {
  contractId: string;
  onClose: () => void;
  onRefresh: () => void;
}

export default function ContractDetailPanel({ contractId, onClose, onRefresh }: Props) {
  const { callAdmin } = useAdminApi();
  const { toast } = useToast();
  const { roles } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const isSuperAdmin = roles.includes("super_admin" as any);
  const isFinanceOnly = !roles.includes("admin" as any) && !isSuperAdmin && roles.includes("finance_admin" as any);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await callAdmin("deal-contract-detail", { contract_id: contractId });
      setData(res);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => { fetchDetail(); }, [contractId]);

  const handleAction = async (action: string, body: any) => {
    setActing(true);
    try {
      await callAdmin(action, undefined, body);
      toast({ title: "Success" });
      onRefresh();
      await fetchDetail();
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
    setActing(false);
  };

  const handleDownload = async () => {
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/contract-engine?action=download&contract_id=${contractId}`;
      const { data: { session } } = await (await import("@/integrations/supabase/client")).supabase.auth.getSession();
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

  const contract = data?.contract;
  const history = data?.history ?? [];
  const signatures = data?.signatures ?? [];

  return (
    <Sheet open onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Contract Detail</SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="space-y-4 mt-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
        ) : !contract ? (
          <p className="mt-4 text-muted-foreground">Contract not found.</p>
        ) : (
          <div className="space-y-6 mt-4">
            {/* Contract Metadata */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold">{contract.track_title}</h2>
                <StateBadge state={contract.status} type="contract" />
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Producer:</span> {contract.producer_name}</div>
                <div><span className="text-muted-foreground">Deal Type:</span> {contract.deal_type}</div>
                <div><span className="text-muted-foreground">Template:</span> v{contract.template_version}</div>
                <div><span className="text-muted-foreground">Offer:</span> v{contract.offer_version}</div>
                {contract.hash_checksum && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Hash:</span>{" "}
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">{contract.hash_checksum?.substring(0, 16)}...</code>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            {!isFinanceOnly && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2"><Shield className="h-4 w-4" /> Actions</h3>
                  <div className="flex flex-wrap gap-2">
                    {contract.pdf_url && (
                      <Button size="sm" variant="outline" onClick={handleDownload}>
                        <Download className="h-4 w-4 mr-1" /> Download PDF
                      </Button>
                    )}
                    {contract.status === "generated" && contract.pdf_url && (
                      <Button
                        size="sm"
                        onClick={() => handleAction("deal-send-contract", { contract_id: contractId })}
                        disabled={acting}
                      >
                        Send for Signature
                      </Button>
                    )}
                    {contract.status === "signed_by_producer" && (
                      <Button
                        size="sm"
                        onClick={() => handleAction("deal-admin-sign-contract", { contract_id: contractId })}
                        disabled={acting}
                      >
                        <Pen className="h-4 w-4 mr-1" /> Countersign
                      </Button>
                    )}
                    {contract.status !== "fully_executed" && contract.status !== "archived" && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleAction("deal-archive-contract", { contract_id: contractId })}
                        disabled={acting}
                      >
                        <Archive className="h-4 w-4 mr-1" /> Archive
                      </Button>
                    )}
                    {contract.status === "fully_executed" && isSuperAdmin && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAction("deal-archive-contract", { contract_id: contractId })}
                        disabled={acting}
                      >
                        Archive (Super Admin)
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Rendered Contract Body */}
            {contract.rendered_body && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2"><FileText className="h-4 w-4" /> Contract Text</h3>
                  <pre className="text-xs bg-muted p-4 rounded-md whitespace-pre-wrap max-h-96 overflow-y-auto font-mono">
                    {contract.rendered_body}
                  </pre>
                </div>
              </>
            )}

            {/* Signatures */}
            <Separator />
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2"><Pen className="h-4 w-4" /> Signatures ({signatures.length})</h3>
              {signatures.length === 0 ? (
                <p className="text-sm text-muted-foreground">No signatures yet.</p>
              ) : (
                <div className="space-y-2">
                  {signatures.map((s: any) => (
                    <div key={s.id} className="p-3 border rounded-md text-sm flex items-center gap-3">
                      <Badge variant="outline">{s.signer_role}</Badge>
                      <span>{format(new Date(s.signed_at), "MMM d, yyyy HH:mm")}</span>
                      {s.ip_address && (
                        <span className="text-xs text-muted-foreground">IP: {s.ip_address}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* State History */}
            <Separator />
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2"><Clock className="h-4 w-4" /> State History</h3>
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">No history.</p>
              ) : (
                <div className="space-y-1">
                  {history.map((h: any) => (
                    <div key={h.id} className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground w-32 shrink-0">
                        {format(new Date(h.changed_at), "MMM d, HH:mm")}
                      </span>
                      <span className="text-muted-foreground">{h.previous_state ?? "—"}</span>
                      <span>→</span>
                      <StateBadge state={h.new_state} type="contract" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
