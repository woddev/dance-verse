import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Handshake, ArrowRight, Loader2, Mail } from "lucide-react";

type PageState = "loading" | "set-password" | "sign-in" | "request-link" | "link-sent";

export default function PartnerSignup() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [passwordLogin, setPasswordLogin] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageState, setPageState] = useState<PageState>("loading");
  const navigate = useNavigate();
  const { toast } = useToast();

  const goToTerms = useCallback(() => {
    navigate("/partner/terms");
  }, [navigate]);

  useEffect(() => {
    // Check if URL has invite/recovery tokens in the hash
    const hash = window.location.hash;
    const hasToken = hash.includes("type=invite") || hash.includes("type=recovery") || hash.includes("type=signup") || hash.includes("access_token");

    // Listen for auth state changes — this fires when Supabase processes the token
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        // User just got signed in via invite token → show set password
        setPageState("set-password");
      } else if (event === "TOKEN_REFRESHED" && session) {
        setPageState("set-password");
      } else if (event === "PASSWORD_RECOVERY" && session) {
        setPageState("set-password");
      }
    });

    // Also check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Already have a session — they either came from an invite token
        // that was already processed, or they're already logged in
        if (hasToken) {
          setPageState("set-password");
        } else {
          // Already logged in, no token — go straight to terms
          goToTerms();
        }
      } else if (hasToken) {
        // Has token in URL but no session yet — Supabase is still processing
        // Wait for onAuthStateChange to fire (with a timeout fallback)
        const timeout = setTimeout(() => {
          // If still loading after 5s, token might be invalid
          setPageState("check-email");
        }, 5000);
        return () => clearTimeout(timeout);
      } else {
        // No session, no token — show check-email by default (they need the Supabase invite link first)
        setPageState("check-email");
      }
    });

    return () => subscription.unsubscribe();
  }, [goToTerms]);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Account set up successfully!" });
      goToTerms();
    }

    setLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password: passwordLogin });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else if (data.user) {
      goToTerms();
    }

    setLoading(false);
  };

  if (pageState === "loading") {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex items-center justify-center pt-20 px-4">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <p>Setting up your account…</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="flex-1 flex items-center justify-center pt-20 pb-16 px-4">
        <div className="w-full max-w-md space-y-6">
          {/* Welcome header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-2">
              <Handshake className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Welcome to DanceVerse
            </h1>
            <p className="text-muted-foreground text-base">
              {pageState === "set-password" && "Create a password to complete your partner account setup."}
              {pageState === "sign-in" && "Sign in to access your partner dashboard and accept the partnership terms."}
              {pageState === "check-email" && "Almost there! Follow the steps below to get started."}
            </p>
          </div>

          {/* Set Password Form — shown when arriving via invite token */}
          {pageState === "set-password" && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-xl">Set Your Password</CardTitle>
                <CardDescription>Choose a secure password for your account</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">New Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      placeholder="At least 6 characters"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <Button type="submit" className="w-full h-11" disabled={loading}>
                    {loading ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Setting up…</>
                    ) : (
                      <>Continue to Terms <ArrowRight className="h-4 w-4 ml-2" /></>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Sign In Form — shown for returning partners */}
          {pageState === "sign-in" && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-xl">Partner Sign In</CardTitle>
                <CardDescription>Enter your credentials to continue</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="loginPassword">Password</Label>
                    <Input
                      id="loginPassword"
                      type="password"
                      value={passwordLogin}
                      onChange={(e) => setPasswordLogin(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <Button type="submit" className="w-full h-11" disabled={loading}>
                    {loading ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Signing in…</>
                    ) : (
                      <>Sign In & Continue <ArrowRight className="h-4 w-4 ml-2" /></>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Check Email — shown when no token and no session */}
          {pageState === "check-email" && (
            <Card>
              <CardHeader className="pb-4 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mx-auto mb-2">
                  <Mail className="h-6 w-6 text-muted-foreground" />
                </div>
                <CardTitle className="text-xl">Check Your Email</CardTitle>
                <CardDescription>
                  You should have received an invitation email from DanceVerse with a link to set up your account.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground space-y-2">
                  <p className="font-medium text-foreground">How to get started:</p>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Check your inbox for the <strong>DanceVerse invitation email</strong></li>
                    <li>Click the <strong>"Set up your account"</strong> link in that email</li>
                    <li>You'll be brought back here to create your password</li>
                  </ol>
                </div>
                <p className="text-xs text-center text-muted-foreground">
                  Already set up your password?{" "}
                  <button
                    type="button"
                    className="underline hover:text-primary"
                    onClick={() => setPageState("sign-in")}
                  >
                    Sign in instead
                  </button>
                </p>
              </CardContent>
            </Card>
          )}

          {/* What to expect */}
          {pageState !== "check-email" && (
            <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground space-y-2">
              <p className="font-medium text-foreground text-sm">What happens next:</p>
              <ol className="list-decimal pl-4 space-y-1">
                <li>Review & accept the partnership agreement</li>
                <li>Connect your Stripe account for payouts</li>
                <li>Start sharing your referral link</li>
              </ol>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
