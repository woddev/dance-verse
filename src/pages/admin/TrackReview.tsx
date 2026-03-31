import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AdminLayout from "@/components/layout/AdminLayout";
import { useAdminApi } from "@/hooks/useAdminApi";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StateBadge from "@/components/deals/StateBadge";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { ArrowLeft, Play, Clock, Shield, FileText, ExternalLink } from "lucide-react";
import CreateOfferDialog from "@/components/deals/admin/CreateOfferDialog";

export default function TrackReview() {
  const { trackId } = useParams<{ trackId: string }>();
  const navigate = useNavigate();
  const { callAdmin } = useAdminApi();
  const { toast } = useToast();
  const { roles } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [denyReason, setDenyReason] = useState("");
  const [showDenyForm, setShowDenyForm] = useState(false);
  const [showCreateOffer, setShowCreateOffer] = useState(false);

  const isSuperAdmin = roles.includes("super_admin" as any);
  const isFinanceOnly = !roles.includes("admin" as any) && !isSuperAdmin && roles.includes("finance_admin" as any);

  useEffect(() => {
    if (!trackId) return;
    (async () => {
      setLoading(true);
      try {
        const res = await callAdmin("deal-track-detail", { track_id: trackId });
        setData(res);
      } catch (err: any) {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
      setLoading(false);
    })();
  }, [trackId, callAdmin, toast]);

  const handleAction = async (action: string, body?: any) => {
    setActing(true);
    try {
      await callAdmin(action, undefined, body);
      toast({ title: "Success" });
      const res = await callAdmin("deal-track-detail", { track_id: trackId! });
      setData(res);
      setShowDenyForm(false);
      setDenyReason("");
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
    setActing(false);
  };

  const track = data?.track;
  const history = data?.history ?? [];
  const offers = data?.offers ?? [];
  const contracts = data?.contracts ?? [];

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/deals")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Deals
        </Button>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
        ) : !track ? (
          <p className="text-muted-foreground">Track not found.</p>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold">{track.title}</h1>
              <StateBadge state={track.status} />
            </div>

            {/* Track Details Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Track Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Producer:</span> {track.producer_name}</div>
                  <div><span className="text-muted-foreground">Email:</span> {track.producer_email}</div>
                  <div><span className="text-muted-foreground">Genre:</span> {track.genre ?? "—"}</div>
                  <div><span className="text-muted-foreground">BPM:</span> {track.bpm ?? "—"}</div>
                  <div><span className="text-muted-foreground">ISRC:</span> {track.isrc ?? "—"}</div>
                  <div><span className="text-muted-foreground">Explicit:</span> {track.explicit_flag ? "Yes" : "No"}</div>
                  <div><span className="text-muted-foreground">Master %:</span> {track.master_ownership_percent ?? "—"}</div>
                  <div><span className="text-muted-foreground">Publishing %:</span> {track.publishing_ownership_percent ?? "—"}</div>
                </div>

                {track.file_url && (
                  <div className="flex items-center gap-2">
                    <Play className="h-4 w-4 text-muted-foreground" />
                    <audio controls src={track.file_url} className="h-8 flex-1" />
                  </div>
                )}

                {track.google_drive_url && (
                  <a
                    href={track.google_drive_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> View on Google Drive
                  </a>
                )}

                {track.denial_reason && (
                  <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                    <strong>Denial reason:</strong> {track.denial_reason}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions Card */}
            {!isFinanceOnly && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="h-4 w-4" /> Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {(track.status === "submitted" || track.status === "under_review") && (
                      <>
                        <Button size="sm" variant="destructive" onClick={() => setShowDenyForm(true)} disabled={acting}>
                          Deny
                        </Button>
                        <Button size="sm" onClick={() => setShowCreateOffer(true)} disabled={acting}>
                          Create Offer
                        </Button>
                      </>
                    )}
                    {track.status === "denied" && isSuperAdmin && (
                      <Button size="sm" variant="outline" onClick={() => handleAction("deal-reopen-track", { track_id: trackId })} disabled={acting}>
                        Reopen (Super Admin)
                      </Button>
                    )}
                  </div>

                  {showDenyForm && (
                    <div className="space-y-2 p-3 border rounded-md">
                      <Textarea
                        placeholder="Denial reason (required)…"
                        value={denyReason}
                        onChange={(e) => setDenyReason(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" variant="destructive" onClick={() => handleAction("deal-deny-track", { track_id: trackId, reason: denyReason })} disabled={!denyReason.trim() || acting}>
                          Confirm Deny
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setShowDenyForm(false); setDenyReason(""); }}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* State History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-4 w-4" /> State History
                </CardTitle>
              </CardHeader>
              <CardContent>
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
                        <StateBadge state={h.new_state} />
                        {h.override_reason && (
                          <span className="text-xs text-destructive ml-1">(override: {h.override_reason})</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Offers */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Offers ({offers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {offers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No offers yet.</p>
                ) : (
                  <div className="space-y-3">
                    {offers.map((o: any) => (
                      <div key={o.id} className="p-3 border rounded-md text-sm space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">v{o.version_number}</Badge>
                          <Badge variant="outline">{o.deal_type}</Badge>
                          <StateBadge state={o.status} />
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                          {o.buyout_amount && <span>Buyout: ${Number(o.buyout_amount).toLocaleString()}</span>}
                          {o.producer_split_percent != null && <span>Split: {o.producer_split_percent}/{o.platform_split_percent}</span>}
                          {o.term_length && <span>Term: {o.term_length}</span>}
                          {o.territory && <span>Territory: {o.territory}</span>}
                          {o.expires_at && <span>Expires: {format(new Date(o.expires_at), "MMM d, yyyy")}</span>}
                        </div>
                        {o.status === "accepted" && !isFinanceOnly && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAction("deal-generate-contract", { offer_id: o.id })}
                            disabled={acting}
                          >
                            Generate Contract
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contracts */}
            {contracts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Contracts ({contracts.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {contracts.map((c: any) => (
                      <div key={c.id} className="p-3 border rounded-md text-sm flex items-center gap-2">
                        <Badge variant="outline">v{c.offer_version}</Badge>
                        <StateBadge state={c.status} />
                        {c.pdf_url && (
                          <a href={c.pdf_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs">
                            PDF
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {showCreateOffer && trackId && (
          <CreateOfferDialog
            trackId={trackId}
            onClose={() => setShowCreateOffer(false)}
            onSuccess={() => {
              setShowCreateOffer(false);
              callAdmin("deal-track-detail", { track_id: trackId }).then(setData);
            }}
          />
        )}
      </div>
    </AdminLayout>
  );
}
