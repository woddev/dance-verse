import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

interface Props {
  revenue: any[];
}

export default function DealRevenueMonitor({ revenue }: Props) {
  const fmt = (v: number) => `$${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{revenue.length} revenue events (read-only)</p>

      {revenue.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">No revenue events recorded.</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Track</TableHead>
                <TableHead>Producer</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Fee</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead className="text-right">Producer</TableHead>
                <TableHead className="text-right">Platform</TableHead>
                <TableHead>Payout</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {revenue.map((r) => {
                const netValid = Math.abs(Number(r.net_revenue) - (Number(r.gross_revenue) - Number(r.platform_fee))) < 0.01;
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.track_title}</TableCell>
                    <TableCell>{r.producer_name}</TableCell>
                    <TableCell className="text-right">{fmt(r.gross_revenue)}</TableCell>
                    <TableCell className="text-right">{fmt(r.platform_fee)}</TableCell>
                    <TableCell className={`text-right ${!netValid ? "text-destructive font-bold" : ""}`}>
                      {fmt(r.net_revenue)}
                      {!netValid && " ⚠"}
                    </TableCell>
                    <TableCell className="text-right">{r.producer_amount ? fmt(r.producer_amount) : "—"}</TableCell>
                    <TableCell className="text-right">{r.platform_amount ? fmt(r.platform_amount) : "—"}</TableCell>
                    <TableCell>
                      {r.payout_status ? (
                        <Badge variant={r.payout_status === "completed" ? "default" : "secondary"}>
                          {r.payout_status}
                        </Badge>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(r.created_at), "MMM d, yyyy")}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
