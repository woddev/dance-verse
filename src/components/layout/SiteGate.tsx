import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import dvLogo from "@/assets/dance-verse-logo-new.png";

const STORAGE_KEY = "site_unlocked";

export function useSiteGate() {
  const password = import.meta.env.VITE_SITE_PASSWORD;
  // If no password is set, site is open
  if (!password) return { locked: false, Gate: null };

  const [unlocked, setUnlocked] = useState(
    () => sessionStorage.getItem(STORAGE_KEY) === "true"
  );

  const unlock = () => {
    sessionStorage.setItem(STORAGE_KEY, "true");
    setUnlocked(true);
  };

  return {
    locked: !unlocked,
    Gate: !unlocked ? <SiteGate password={password} onUnlock={unlock} /> : null,
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
