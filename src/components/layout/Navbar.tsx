import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Menu, X } from "lucide-react";
import danceVerseLogoHeader from "@/assets/dv-blk-logo.png";

interface NavLink {
  id: string;
  label: string;
  href: string;
  position: number;
}

export default function Navbar() {
  const { user, isAdmin, isDancer, signOut } = useAuth();
  const [navLinks, setNavLinks] = useState<NavLink[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    supabase
      .from("nav_links")
      .select("id, label, href, position")
      .eq("visible", true)
      .order("position")
      .then(({ data }) => {
        if (data) setNavLinks(data);
      });
  }, []);

  const linkClass = "text-sm font-medium hover:text-secondary transition-colors";

  const navItems = (
    <>
      {navLinks.map((link) => (
        <Link key={link.id} to={link.href} className={linkClass} onClick={() => setMobileOpen(false)}>
          {link.label}
        </Link>
      ))}
      {user ? (
        <>
          {isDancer && (
            <Link to="/dancer/dashboard" className={linkClass} onClick={() => setMobileOpen(false)}>Dashboard</Link>
          )}
          {isAdmin && (
            <Link to="/admin/dashboard" className={linkClass} onClick={() => setMobileOpen(false)}>Admin</Link>
          )}
          <Button variant="outline" size="sm" onClick={() => { signOut(); setMobileOpen(false); }}>
            Sign Out
          </Button>
        </>
      ) : (
        <Link to="/auth" onClick={() => setMobileOpen(false)}>
          <Button size="sm">Sign In</Button>
        </Link>
      )}
    </>
  );

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-6 py-4 flex justify-between items-center">
        <Link to="/" className="flex items-center">
          <img src={danceVerseLogoHeader} alt="Dance-Verse" className="h-8 w-auto" />
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex gap-6 items-center">
          {navItems}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 hover:bg-muted rounded-md transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background px-6 py-4 flex flex-col gap-4">
          {navItems}
        </div>
      )}
    </nav>
  );
}
