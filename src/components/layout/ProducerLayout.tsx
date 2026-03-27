import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Music, FileText, FileCheck, DollarSign, Settings } from "lucide-react";
import Navbar from "./Navbar";
import { cn } from "@/lib/utils";
import { useProducerApi } from "@/hooks/useProducerApi";
import { Badge } from "@/components/ui/badge";

const producerLinks = [
  { to: "/producer/dashboard", label: "Overview", subtitle: "Your journey", icon: LayoutDashboard, badgeKey: null, accent: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  { to: "/producer/tracks", label: "Tracks", subtitle: "View & submit music", icon: Music, badgeKey: null, accent: "bg-purple-500/15 text-purple-600 dark:text-purple-400" },
  { to: "/producer/offers", label: "Offers", subtitle: "Deal terms", icon: FileText, badgeKey: "pending_offers", accent: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  { to: "/producer/contracts", label: "Contracts", subtitle: "Agreements", icon: FileCheck, badgeKey: "contracts_to_sign", accent: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  { to: "/producer/earnings", label: "Earnings", subtitle: "Revenue", icon: DollarSign, badgeKey: null, accent: "bg-rose-500/15 text-rose-600 dark:text-rose-400" },
  { to: "/producer/settings", label: "Settings", subtitle: "Account", icon: Settings, badgeKey: null, accent: "bg-slate-500/15 text-slate-600 dark:text-slate-400" },
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
        {/* Desktop sidebar */}
        <aside className="hidden md:flex w-72 flex-col fixed top-20 bottom-0 border-r border-border bg-background p-5 gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">Producer Studio</p>
          {producerLinks.map((link) => {
            const active = location.pathname === link.to;
            const badgeCount = link.badgeKey ? (counts[link.badgeKey] ?? 0) : 0;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  "group flex items-center gap-4 px-3 py-3 rounded-xl text-sm transition-all relative",
                  active
                    ? "bg-accent/40 border-l-4 border-primary shadow-sm"
                    : "hover:bg-muted border-l-4 border-transparent"
                )}
              >
                <div className={cn("relative flex items-center justify-center h-10 w-10 rounded-xl shrink-0", link.accent)}>
                  <link.icon className="h-5 w-5" />
                  {badgeCount > 0 && (
                    <Badge variant="destructive" className="absolute -top-1.5 -right-1.5 h-5 min-w-5 flex items-center justify-center text-[10px] px-1.5 shadow-md">
                      {badgeCount}
                    </Badge>
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className={cn("font-medium", active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")}>
                    {link.label}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">{link.subtitle}</span>
                </div>
              </Link>
            );
          })}
        </aside>

        {/* Mobile bottom bar */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border flex justify-around items-center h-16 px-1">
          {producerLinks.map((link) => {
            const active = location.pathname === link.to;
            const badgeCount = link.badgeKey ? (counts[link.badgeKey] ?? 0) : 0;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg text-[10px] transition-colors relative",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <div className="relative">
                  <link.icon className="h-5 w-5" />
                  {badgeCount > 0 && (
                    <span className="absolute -top-1 -right-2 h-4 min-w-4 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[8px] px-1">
                      {badgeCount}
                    </span>
                  )}
                </div>
                <span className="font-medium">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <main className="flex-1 md:ml-72 p-6 pb-20 md:pb-6">{children}</main>
      </div>
    </div>
  );
}
