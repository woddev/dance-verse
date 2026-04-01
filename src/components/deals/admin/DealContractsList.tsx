import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import StateBadge from "@/components/deals/StateBadge";
import { format } from "date-fns";
import { Download, FileText } from "lucide-react";

interface Props {
  contracts: any[];
  onRefresh: () => void;
}

export default function DealContractsList({ contracts }: Props) {
  // Only show fully executed contracts, deduplicated by offer_id
  const signedContracts = contracts
    .filter((c) => c.status === "fully_executed")
    .reduce((acc: any[], c: any) => {
      const existing = acc.find((x) => x.offer_id === c.offer_id);
      if (!existing || new Date(c.created_at) > new Date(existing.created_at)) {
        return [...acc.filter((x) => x.offer_id !== c.offer_id), c];
      }
      return acc;
    }, []);

  if (signedContracts.length === 0) {
    return <p className="text-muted-foreground text-sm">No signed contracts yet.</p>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Track</TableHead>
            <TableHead>Producer</TableHead>
            <TableHead>Signed</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Download</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {signedContracts.map((c: any) => (
            <TableRow key={c.id}>
              <TableCell className="font-medium">{c.track_title}</TableCell>
              <TableCell>{c.producer_name}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {c.producer_signed_at ? format(new Date(c.producer_signed_at), "MMM d, yyyy") : "—"}
              </TableCell>
              <TableCell><StateBadge state="fully_executed" type="contract" /></TableCell>
              <TableCell className="text-right">
                {c.pdf_url ? (
                  <Button size="sm" variant="outline" asChild>
                    <a href={c.pdf_url} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4 mr-1" /> PDF
                    </a>
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">No PDF</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
