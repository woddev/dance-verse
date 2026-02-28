import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Music, Upload, DollarSign, Settings, Loader2, Clock, XCircle } from "lucide-react";
import Navbar from "./Navbar";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { differenceInDays } from "date-fns";

const dancerLinks = [
  { to: "/dancer/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/dancer/campaigns", label: "Campaigns", icon: Music },
  { to: "/dancer/submissions", label: "My Submissions", icon: Upload },
  { to: "/dancer/payments", label: "Payments", icon: DollarSign },
  { to: "/dancer/settings", label: "Settings", icon: Settings },
];

type AppStatus = "loading" | "none" | "pending" | "approved" | "rejected";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState<AppStatus>("loading");
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [canReapply, setCanReapply] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles_safe" as any)
        .select("application_status, rejection_reason, application_reviewed_at")
        .eq("id", user.id)
        .single();
      if (!profile) return;
      const appStatus = (profile as any).application_status as string;
      setStatus(appStatus as AppStatus);
      if (appStatus === "rejected") {
        setRejectionReason((profile as any).rejection_reason);
        const reviewedAt = (profile as any).application_reviewed_at;
        if (reviewedAt) {
          setCanReapply(differenceInDays(new Date(), new Date(reviewedAt)) >= 30);
        }
      }
      if (appStatus === "none") {
        navigate("/dancer/apply");
      }
    })();
  }, []);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-muted">
        <Navbar />
        <div className="pt-24 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="min-h-screen bg-muted">
        <Navbar />
        <div className="pt-24 max-w-md mx-auto px-4">
          <Card>
            <CardHeader className="text-center">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <CardTitle>Application Under Review</CardTitle>
              <CardDescription>We're reviewing your application. You'll get access once approved.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div className="min-h-screen bg-muted">
        <Navbar />
        <div className="pt-24 max-w-md mx-auto px-4">
          <Card>
            <CardHeader className="text-center">
              <XCircle className="h-12 w-12 mx-auto text-destructive mb-2" />
              <CardTitle>Application Not Approved</CardTitle>
              {rejectionReason && (
                <CardDescription>Reason: {rejectionReason}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="text-center">
              {canReapply ? (
                <Button onClick={() => navigate("/dancer/apply")}>Re-Apply</Button>
              ) : (
                <p className="text-sm text-muted-foreground">You can re-apply 30 days after your review.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted">
      <Navbar />
      <div className="pt-20 flex">
        <aside className="hidden md:flex w-64 flex-col fixed top-20 bottom-0 border-r border-border bg-background p-4 gap-1">
          {dancerLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                location.pathname === link.to
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-muted-foreground"
              )}
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          ))}
        </aside>
        <main className="flex-1 md:ml-64 p-6">{children}</main>
      </div>
    </div>
  );
}
