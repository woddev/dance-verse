import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PartnerLayout from "@/components/layout/PartnerLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { usePartnerApi } from "@/hooks/usePartnerApi";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function PartnerReferrals() {
  const api = usePartnerApi();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [referrals, setReferrals] = useState<any[]>([]);

  useEffect(() => {
    // Check terms first
    api.getOverview().then((data) => {
      if (!data.terms_accepted_at) {
        navigate("/partner/terms", { replace: true });
        return;
      }
      return api.getReferrals();
    }).then((data) => {
      if (data) setReferrals(data);
      setLoading(false);
    }).catch((e) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
      setLoading(false);
    });
  }, []);

  return (
    <PartnerLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Your Referrals</h1>
          <p className="text-muted-foreground text-sm mt-1">Dancers who signed up using your referral link</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : referrals.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg font-medium">No referrals yet</p>
            <p className="text-sm mt-1">Share your referral link to start earning commissions.</p>
          </div>
        ) : (
          <div className="rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dancer</TableHead>
                  <TableHead>Socials</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Submissions</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {referrals.map((r) => (
                  <TableRow key={r.dancer_id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={r.avatar_url} />
                          <AvatarFallback>{(r.full_name || "?")[0]}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{r.full_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        {r.instagram_handle && <span>@{r.instagram_handle}</span>}
                        {r.tiktok_handle && <span>@{r.tiktok_handle}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(r.linked_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{r.total_submissions} total</span>
                      {r.recent_submissions > 0 && (
                        <span className="text-xs text-muted-foreground ml-1">({r.recent_submissions} recent)</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.is_active ? "default" : "secondary"}>
                        {r.is_active ? "Active" : "Inactive"}
                      </Badge>
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
