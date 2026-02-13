import { useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useAdminApi } from "@/hooks/useAdminApi";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Instagram, AtSign, MapPin, CheckCircle, XCircle, UserPlus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

interface Dancer {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  youtube_handle: string | null;
  bio: string | null;
  dance_style: string | null;
  years_experience: number | null;
  location: string | null;
  application_status: string;
  application_submitted_at: string | null;
  rejection_reason: string | null;
  stripe_onboarded: boolean;
  created_at: string;
}

export default function ManageDancers() {
  const { callAdmin } = useAdminApi();
  const { toast } = useToast();
  const [dancers, setDancers] = useState<Dancer[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await callAdmin("dancers");
        setDancers(data);
      } catch (err: any) {
        toast({ title: "Error loading dancers", description: err.message, variant: "destructive" });
      }
      setLoading(false);
    })();
  }, []);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      await callAdmin("approve-dancer", undefined, { application_id: id });
      setDancers((prev) => prev.map((d) => d.id === id ? { ...d, application_status: "approved" } : d));
      toast({ title: "Dancer approved & invite sent", description: "An invitation email has been sent to the dancer." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setActionLoading(null);
  };

  const openReject = (id: string) => {
    setRejectId(id);
    setRejectReason("");
    setRejectOpen(true);
  };

  const handleReject = async () => {
    if (!rejectId || !rejectReason.trim()) return;
    setActionLoading(rejectId);
    try {
      await callAdmin("reject-dancer", undefined, { application_id: rejectId, rejection_reason: rejectReason.trim() });
      setDancers((prev) => prev.map((d) => d.id === rejectId ? { ...d, application_status: "rejected", rejection_reason: rejectReason.trim() } : d));
      setRejectOpen(false);
      toast({ title: "Dancer rejected" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setActionLoading(null);
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviteLoading(true);
    try {
      await callAdmin("invite-dancer", undefined, { email: inviteEmail.trim(), full_name: inviteName.trim() });
      toast({ title: "Invite sent", description: `Invitation email sent to ${inviteEmail.trim()}` });
      setInviteOpen(false);
      setInviteEmail("");
      setInviteName("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setInviteLoading(false);
  };

  const filterByStatus = (status: string) => dancers.filter((d) => d.application_status === status);

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      </AdminLayout>
    );
  }

  const DancerCard = ({ dancer, showActions }: { dancer: Dancer; showActions: boolean }) => (
    <Card key={dancer.id} className="border border-border">
      <CardContent className="p-4 flex items-start gap-4">
        <Avatar className="h-10 w-10 mt-0.5">
          <AvatarImage src={dancer.avatar_url ?? undefined} />
          <AvatarFallback className="bg-muted text-muted-foreground">
            {(dancer.full_name ?? "?")[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{dancer.full_name || "Unnamed"}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-0.5">
            {dancer.dance_style && <span>{dancer.dance_style}</span>}
            {dancer.years_experience != null && <span>{dancer.years_experience}y exp</span>}
            {dancer.location && <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{dancer.location}</span>}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
            {dancer.instagram_handle && <span className="flex items-center gap-1"><Instagram className="h-3 w-3" />@{dancer.instagram_handle}</span>}
            {dancer.tiktok_handle && <span className="flex items-center gap-1"><AtSign className="h-3 w-3" />{dancer.tiktok_handle}</span>}
          </div>
          {dancer.bio && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{dancer.bio}</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {showActions && dancer.application_status === "pending" && (
            <>
              <Button size="sm" onClick={() => handleApprove(dancer.id)} disabled={actionLoading === dancer.id}>
                <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
              </Button>
              <Button size="sm" variant="outline" onClick={() => openReject(dancer.id)} disabled={actionLoading === dancer.id}>
                <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
              </Button>
            </>
          )}
          <Badge variant={dancer.application_status === "approved" ? "default" : dancer.application_status === "pending" ? "secondary" : "destructive"}>
            {dancer.application_status}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );

  const pending = filterByStatus("pending");
  const approved = filterByStatus("approved");
  const rejected = filterByStatus("rejected");

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Dancers</h1>
          <div className="flex items-center gap-2">
            <Button onClick={() => setInviteOpen(true)}>
              <UserPlus className="h-4 w-4 mr-1" /> Invite Dancer
            </Button>
            <Badge variant="secondary" className="text-sm">{dancers.length} total</Badge>
          </div>
        </div>

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({approved.length})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({rejected.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="pending" className="space-y-2 mt-4">
            {pending.length === 0 ? <p className="text-sm text-muted-foreground">No pending applications.</p> : pending.map((d) => <DancerCard key={d.id} dancer={d} showActions />)}
          </TabsContent>
          <TabsContent value="approved" className="space-y-2 mt-4">
            {approved.length === 0 ? <p className="text-sm text-muted-foreground">No approved dancers.</p> : approved.map((d) => <DancerCard key={d.id} dancer={d} showActions={false} />)}
          </TabsContent>
          <TabsContent value="rejected" className="space-y-2 mt-4">
            {rejected.length === 0 ? <p className="text-sm text-muted-foreground">No rejected dancers.</p> : rejected.map((d) => <DancerCard key={d.id} dancer={d} showActions={false} />)}
          </TabsContent>
        </Tabs>

        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Invite Dancer</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Email *</Label>
                <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="dancer@example.com" />
              </div>
              <div className="space-y-1">
                <Label>Full Name</Label>
                <Input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Jane Doe" />
              </div>
              <Button className="w-full" onClick={handleInvite} disabled={!inviteEmail.trim() || inviteLoading}>
                {inviteLoading ? "Sending..." : "Send Invite"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Reject Dancer</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Reason for rejection *</Label>
                <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Explain why this application was not approved…" />
              </div>
              <Button className="w-full" variant="destructive" onClick={handleReject} disabled={!rejectReason.trim() || actionLoading !== null}>
                Reject Application
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
