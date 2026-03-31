import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Menu, X } from "lucide-react";
import danceVerseLogo from "@/assets/dance-verse-logo-new.png";

interface NavLink {
  id: string;
  label: string;
  href: string;
  position: number;
}

export default function Navbar() {
  const { user, isAdmin, isDancer, isProducer, signOut } = useAuth();
  const [navLinks, setNavLinks] = useState<NavLink[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === "/";

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

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const transparent = isHome && !scrolled && !mobileOpen;
  const textColor = transparent ? "text-white" : "text-foreground";
  const logo = transparent ? danceVerseLogoWhite : danceVerseLogoHeader;

  const linkClass = `text-xs font-semibold tracking-widest uppercase hover:opacity-70 transition-opacity ${textColor}`;

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
            <Link to="/dancer/dashboard" onClick={() => setMobileOpen(false)}>
              <Button size="sm" variant="default">My Dashboard</Button>
            </Link>
          )}
          {isProducer && (
            <Link to="/producer/dashboard" onClick={() => setMobileOpen(false)}>
              <Button size="sm" variant="default">Producer Dashboard</Button>
            </Link>
          )}
          {isAdmin && (
            <Link to="/admin/dashboard" className={linkClass} onClick={() => setMobileOpen(false)}>Admin</Link>
          )}
          <Button variant="outline" size="sm" onClick={() => { signOut(); setMobileOpen(false); }}
            className={transparent ? "border-white/40 text-white bg-transparent hover:bg-white/10" : ""}>
            Sign Out
          </Button>
        </>
      ) : (
        <Link to="/auth" onClick={() => setMobileOpen(false)}>
          <Button size="sm" className={transparent ? "bg-white text-black hover:bg-white/90" : ""}>
            Sign In
          </Button>
        </Link>
      )}
    </>
  );

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      transparent
        ? "bg-transparent"
        : "bg-background/80 backdrop-blur-md border-b border-border"
    }`}>
      <div className="container mx-auto px-6 py-5 flex justify-between items-center">
        <Link to="/" className="flex items-center">
          <img src={logo} alt="Dance-Verse" className="h-7 w-auto shrink-0" />
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex gap-8 items-center">
          {navItems}
        </div>

        {/* Mobile hamburger */}
        <button
          className={`md:hidden p-2 rounded-md transition-colors ${transparent ? "text-white hover:bg-white/10" : "hover:bg-muted"}`}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background px-6 py-4 flex flex-col gap-4">
          {navLinks.map((link) => (
            <Link key={link.id} to={link.href} className="text-xs font-semibold tracking-widest uppercase text-foreground hover:opacity-70 transition-opacity" onClick={() => setMobileOpen(false)}>
              {link.label}
            </Link>
          ))}
          {user ? (
            <>
              {isDancer && (
                <Link to="/dancer/dashboard" onClick={() => setMobileOpen(false)}>
                  <Button size="sm" variant="default">My Dashboard</Button>
                </Link>
              )}
              {isProducer && (
                <Link to="/producer/dashboard" onClick={() => setMobileOpen(false)}>
                  <Button size="sm" variant="default">Producer Dashboard</Button>
                </Link>
              )}
              {isAdmin && (
                <Link to="/admin/dashboard" className="text-xs font-semibold tracking-widest uppercase text-foreground" onClick={() => setMobileOpen(false)}>Admin</Link>
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
        </div>
      )}
    </nav>
  );
}
