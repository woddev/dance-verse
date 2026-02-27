import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Music, FileText, FileCheck, DollarSign } from "lucide-react";
import Navbar from "./Navbar";
import { cn } from "@/lib/utils";

const producerLinks = [
  { to: "/producer/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/producer/tracks", label: "Tracks", icon: Music },
  { to: "/producer/offers", label: "Offers", icon: FileText },
  { to: "/producer/contracts", label: "Contracts", icon: FileCheck },
  { to: "/producer/earnings", label: "Earnings", icon: DollarSign },
];

export default function ProducerLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-muted">
      <Navbar />
      <div className="pt-20 flex">
        <aside className="hidden md:flex w-64 flex-col fixed top-20 bottom-0 border-r border-border bg-background p-4 gap-1">
          {producerLinks.map((link) => (
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
