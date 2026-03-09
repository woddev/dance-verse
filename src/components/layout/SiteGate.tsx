import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import dvLogo from "@/assets/dance-verse-logo-new.png";

const COOKIE_NAME = "site_unlocked";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// Change this password to gate the site. Set to "" or remove to disable the gate.
const SITE_PASSWORD = "danceverse2026";

function getCookie(name: string): boolean {
  return document.cookie.split("; ").some((row) => row.startsWith(`${name}=true`));
}

function setCookie(name: string) {
  document.cookie = `${name}=true; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Lax`;
}
function isBypassPath(): boolean {
  const path = window.location.pathname;
  return path === "/auth" || path.startsWith("/partner/terms") || path.startsWith("/partner/signup");
}

export function useSiteGate() {
  const [unlocked, setUnlocked] = useState(
    () => !SITE_PASSWORD || getCookie(COOKIE_NAME) || isBypassPath()
  );

  const unlock = () => {
    setCookie(COOKIE_NAME);
    setUnlocked(true);
  };

  if (!SITE_PASSWORD) return { locked: false, Gate: null };

  return {
    locked: !unlocked,
    Gate: !unlocked ? <SiteGate password={SITE_PASSWORD} onUnlock={unlock} /> : null,
  };
}

function SiteGate({ password, onUnlock }: { password: string; onUnlock: () => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value === password) {
      onUnlock();
    } else {
      setError(true);
      setTimeout(() => setError(false), 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background">
      <div className="w-full max-w-sm mx-auto px-6 text-center">
        <img src={dvLogo} alt="DanceVerse" className="h-12 mx-auto mb-8 opacity-80" />
        <div className="p-2 rounded-full bg-muted w-fit mx-auto mb-4">
          <Lock className="h-5 w-5 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold mb-1">This site is private</h2>
        <p className="text-sm text-muted-foreground mb-6">Enter the password to continue</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="password"
            placeholder="Password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
            className={error ? "border-destructive ring-destructive" : ""}
          />
          {error && <p className="text-xs text-destructive">Incorrect password</p>}
          <Button type="submit" className="w-full">
            Enter Site
          </Button>
        </form>
      </div>
    </div>
  );
}
