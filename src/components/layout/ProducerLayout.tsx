import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Music, FileText, FileCheck, DollarSign, Settings } from "lucide-react";
import Navbar from "./Navbar";
import { cn } from "@/lib/utils";
import { useProducerApi } from "@/hooks/useProducerApi";
import { Badge } from "@/components/ui/badge";

const producerLinks = [
  { to: "/producer/dashboard", label: "Overview", icon: LayoutDashboard, badgeKey: null },
  { to: "/producer/tracks", label: "Tracks", icon: Music, badgeKey: null },
  { to: "/producer/offers", label: "Offers", icon: FileText, badgeKey: "pending_offers" },
  { to: "/producer/contracts", label: "Contracts", icon: FileCheck, badgeKey: "contracts_to_sign" },
  { to: "/producer/earnings", label: "Earnings", icon: DollarSign, badgeKey: null },
  { to: "/producer/settings", label: "Settings", icon: Settings, badgeKey: null },
];

export default function ProducerLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const api = useProducerApi();
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    api.getActionCounts().then((data: any) => {
      if (data) setCounts(data);
    }).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-muted">
      <Navbar />
      <div className="pt-20 flex">
        <aside className="hidden md:flex w-64 flex-col fixed top-20 bottom-0 border-r border-border bg-background p-4 gap-1">
          {producerLinks.map((link) => {
            const badgeCount = link.badgeKey ? (counts[link.badgeKey] ?? 0) : 0;
            return (
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
                <span className="flex-1">{link.label}</span>
                {badgeCount > 0 && (
                  <Badge variant="destructive" className="h-5 min-w-5 flex items-center justify-center text-[10px] px-1.5">
                    {badgeCount}
                  </Badge>
                )}
              </Link>
            );
          })}
        </aside>
        <main className="flex-1 md:ml-64 p-6">{children}</main>
      </div>
    </div>
  );
}
