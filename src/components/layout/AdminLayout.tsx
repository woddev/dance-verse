import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Music, DollarSign, Users, Navigation, Megaphone, FileBarChart, Handshake, Briefcase, Wallet, UserPlus, Mail, ShieldCheck, Tag, Package, Inbox, MonitorPlay, ChevronDown, Menu } from "lucide-react";
import Navbar from "./Navbar";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface NavLink {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  label: string;
  links: NavLink[];
}

const standaloneLinks: NavLink[] = [
  { to: "/admin/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/admin/music", label: "Music", icon: Music },
];

const navGroups: NavGroup[] = [
  {
    label: "Campaigns",
    links: [
      { to: "/admin/campaigns", label: "Campaigns", icon: Megaphone },
      { to: "/admin/categories", label: "Categories", icon: Tag },
      { to: "/admin/artist-submissions", label: "Label Subs", icon: Inbox },
    ],
  },
  {
    label: "People",
    links: [
      { to: "/admin/dancers", label: "Dancers", icon: Users },
      { to: "/admin/producer-applications", label: "Producers", icon: UserPlus },
      { to: "/admin/partners", label: "Partners", icon: Handshake },
    ],
  },
  {
    label: "Finance & Reports",
    links: [
      { to: "/admin/deals", label: "Deals", icon: Briefcase },
      { to: "/admin/finance", label: "Finance", icon: Wallet },
      { to: "/admin/reports", label: "Reports", icon: FileBarChart },
      { to: "/admin/payouts", label: "Payouts", icon: DollarSign },
    ],
  },
  {
    label: "Site Settings",
    links: [
      { to: "/admin/users", label: "Users", icon: ShieldCheck },
      { to: "/admin/hero", label: "Hero Section", icon: MonitorPlay },
      { to: "/admin/navigation", label: "Navigation", icon: Navigation },
      { to: "/admin/email-templates", label: "Emails", icon: Mail },
      { to: "/admin/packages", label: "Packages", icon: Package },
    ],
  },
];

function NavItem({ link, pathname }: { link: NavLink; pathname: string }) {
  return (
    <Link
      to={link.to}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
        pathname === link.to
          ? "bg-primary text-primary-foreground"
          : "hover:bg-muted text-muted-foreground"
      )}
    >
      <link.icon className="h-4 w-4" />
      {link.label}
    </Link>
  );
}

function NavGroupSection({ group, pathname }: { group: NavGroup; pathname: string }) {
  const isActive = group.links.some((l) => pathname === l.to);
  const [open, setOpen] = useState(isActive);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 rounded-md text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted transition-colors">
        {group.label}
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-1 flex flex-col gap-0.5 mt-0.5">
          {group.links.map((link) => (
            <NavItem key={link.to} link={link} pathname={pathname} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function SidebarContent({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {standaloneLinks.map((link) => (
        <div key={link.to} onClick={onNavigate}>
          <NavItem link={link} pathname={pathname} />
        </div>
      ))}
      <div className="my-2 border-t border-border" />
      {navGroups.map((group) => (
        <NavGroupSection key={group.label} group={group} pathname={pathname} />
      ))}
    </nav>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-muted">
      <Navbar />
      <div className="pt-20 flex">
        {/* Mobile hamburger */}
        <div className="md:hidden fixed top-[5.25rem] left-4 z-40">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9 shadow-md bg-background">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-4 pt-8">
              <SidebarContent pathname={location.pathname} onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
        </div>

        {/* Desktop sidebar */}
        <aside className="hidden md:flex w-64 flex-col fixed top-20 bottom-0 border-r border-border bg-background p-4 gap-1 overflow-y-auto">
          <SidebarContent pathname={location.pathname} />
        </aside>
        <main className="flex-1 md:ml-64 p-6">{children}</main>
      </div>
    </div>
  );
}
