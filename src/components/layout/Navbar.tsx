import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import danceVerseLogoHeader from "@/assets/dv-blk-logo.png";

export default function Navbar() {
  const { user, isAdmin, isDancer, signOut } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-6 py-4 flex justify-between items-center">
        <Link to="/" className="flex items-center">
          <img src={danceVerseLogoHeader} alt="Dance-Verse" className="h-8 w-auto" />
        </Link>
        <div className="flex gap-6 items-center">
          <Link to="/" className="text-sm font-medium hover:text-secondary transition-colors">Home</Link>
          <Link to="/how-it-works" className="text-sm font-medium hover:text-secondary transition-colors">How It Works</Link>
          <Link to="/campaigns" className="text-sm font-medium hover:text-secondary transition-colors">Campaigns</Link>

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
