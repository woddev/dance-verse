import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import dvLogo from "@/assets/dance-verse-logo-new.png";

const COOKIE_NAME = "site_unlocked";
const STORAGE_KEY = "site_unlocked";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

// Change this password to gate the site. Set to "" or remove to disable the gate.
const SITE_PASSWORD = "danceverse2026";

function getCookie(name: string): boolean {
  return document.cookie.split("; ").some((row) => row.startsWith(`${name}=true`));
}

function getStoredUnlock(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function setCookie(name: string) {
  const secureFlag = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=true; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Lax${secureFlag}`;
}

function setStoredUnlock() {
  try {
    window.localStorage.setItem(STORAGE_KEY, "true");
  } catch {
    // no-op
  }
}

function isEditorPreview(): boolean {
  const host = window.location.hostname;

  return (
    host.includes("lovableproject.com") ||
    host.startsWith("id-preview--") ||
    host === "localhost" ||
    host === "127.0.0.1"
  );
}

function isBypassPath(): boolean {
  const path = window.location.pathname;
  return (
    isEditorPreview() ||
    path === "/auth" ||
    path === "/forgot-password" ||
    path === "/reset-password" ||
    path === "/musicsubmit" ||
    path.startsWith("/partner/terms") ||
    path.startsWith("/partner/signup")
  );
}

export function useSiteGate() {
  const [unlocked, setUnlocked] = useState(
    () => !SITE_PASSWORD || getCookie(COOKIE_NAME) || getStoredUnlock() || isBypassPath()
  );

  useEffect(() => {
    if (isBypassPath()) {
      setUnlocked(true);
      return;
    }

    const hasAuthTokens = document.cookie.includes("sb-");
    if (hasAuthTokens) {
      setUnlocked(true);
    }
  }, []);

  const unlock = () => {
    setCookie(COOKIE_NAME);
    setStoredUnlock();
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
