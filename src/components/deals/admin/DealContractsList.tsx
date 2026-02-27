import { useState } from "react";
import { useAdminApi } from "@/hooks/useAdminApi";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import StateBadge from "@/components/deals/StateBadge";
import { format } from "date-fns";
import { FileText, Eye } from "lucide-react";
import ContractDetailPanel from "./ContractDetailPanel";

interface Props {
  contracts: any[];
  onRefresh: () => void;
}

export default function DealContractsList({ contracts, onRefresh }: Props) {
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" /> Contracts ({contracts.length})
          </h2>
        </div>

        {contracts.length === 0 ? (
          <p className="text-muted-foreground text-sm">No contracts yet. Generate contracts from accepted offers.</p>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Track</TableHead>
                  <TableHead>Producer</TableHead>
                  <TableHead>Deal Type</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Producer Signed</TableHead>
                  <TableHead>Admin Signed</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.track_title}</TableCell>
                    <TableCell>{c.producer_name}</TableCell>
                    <TableCell><Badge variant="outline">{c.deal_type}</Badge></TableCell>
                    <TableCell>v{c.offer_version}</TableCell>
                    <TableCell><StateBadge state={c.status} type="contract" /></TableCell>
                    <TableCell>
                      {c.producer_signed_at ? format(new Date(c.producer_signed_at), "MMM d, yyyy") : "—"}
                    </TableCell>
                    <TableCell>
                      {c.admin_signed_at ? format(new Date(c.admin_signed_at), "MMM d, yyyy") : "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedContractId(c.id)}
                      >
                        <Eye className="h-4 w-4 mr-1" /> View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {selectedContractId && (
        <ContractDetailPanel
          contractId={selectedContractId}
          onClose={() => setSelectedContractId(null)}
          onRefresh={onRefresh}
        />
      )}
    </>
  );
}
