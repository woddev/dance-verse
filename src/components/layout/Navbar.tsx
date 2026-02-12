import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
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

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-6 py-4 flex justify-between items-center">
        <Link to="/" className="flex items-center">
          <img src={danceVerseLogoHeader} alt="Dance-Verse" className="h-8 w-auto" />
        </Link>
        <div className="flex gap-6 items-center">
          {navLinks.map((link) => (
            <Link
              key={link.id}
              to={link.href}
              className="text-sm font-medium hover:text-secondary transition-colors"
            >
              {link.label}
            </Link>
          ))}

          {user ? (
            <>
              {isDancer && (
                <Link to="/dancer/dashboard" className="text-sm font-medium hover:text-secondary transition-colors">Dashboard</Link>
              )}
              {isAdmin && (
                <Link to="/admin/dashboard" className="text-sm font-medium hover:text-secondary transition-colors">Admin</Link>
              )}
              <Button variant="outline" size="sm" onClick={signOut}>
                Sign Out
              </Button>
            </>
          ) : (
            <Link to="/auth">
              <Button size="sm">Sign In</Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
