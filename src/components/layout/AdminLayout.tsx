import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Music, FileCheck, DollarSign, Users, Navigation, Megaphone, FileBarChart, Handshake, Briefcase, Wallet, UserPlus, Mail } from "lucide-react";
import Navbar from "./Navbar";
import { cn } from "@/lib/utils";

const adminLinks = [
  { to: "/admin/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/admin/music", label: "Music", icon: Music },
  { to: "/admin/campaigns", label: "Campaigns", icon: Megaphone },
  { to: "/admin/submissions", label: "Submissions", icon: FileCheck },
  { to: "/admin/payouts", label: "Payouts", icon: DollarSign },
  { to: "/admin/dancers", label: "Dancers", icon: Users },
  { to: "/admin/producer-applications", label: "Producers", icon: UserPlus },
  { to: "/admin/partners", label: "Partners", icon: Handshake },
  { to: "/admin/deals", label: "Deals", icon: Briefcase },
  { to: "/admin/finance", label: "Finance", icon: Wallet },
  { to: "/admin/email-templates", label: "Emails", icon: Mail },
  { to: "/admin/navigation", label: "Navigation", icon: Navigation },
  { to: "/admin/reports", label: "Reports", icon: FileBarChart },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-muted">
      <Navbar />
      <div className="pt-20 flex">
        <aside className="hidden md:flex w-64 flex-col fixed top-20 bottom-0 border-r border-border bg-background p-4 gap-1">
          {adminLinks.map((link) => (
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
