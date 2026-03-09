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
import { Handshake, ArrowRight, Loader2 } from "lucide-react";

export default function PartnerSignup() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [passwordLogin, setPasswordLogin] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [checkingToken, setCheckingToken] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  const goToTerms = useCallback(() => {
    navigate("/partner/terms");
  }, [navigate]);

  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace("#", ""));
    const type = params.get("type");

    if (type === "invite" || type === "recovery" || type === "signup") {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === "SIGNED_IN" && session) {
          setIsSettingUp(true);
          setCheckingToken(false);
        }
      });

      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setIsSettingUp(true);
          setCheckingToken(false);
        } else {
          setTimeout(() => setCheckingToken(false), 2000);
        }
      });

      return () => subscription.unsubscribe();
    } else {
      // Already logged in → go straight to terms
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          goToTerms();
        }
        setCheckingToken(false);
      });
    }
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

  if (checkingToken) {
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
              {isSettingUp
                ? "Create a password to complete your partner account setup."
                : "Sign in to access your partner dashboard and accept the partnership terms."}
            </p>
          </div>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">
                {isSettingUp ? "Set Your Password" : "Partner Sign In"}
              </CardTitle>
              <CardDescription>
                {isSettingUp
                  ? "Choose a secure password for your account"
                  : "Enter your credentials to continue"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isSettingUp ? (
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
              ) : (
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
              )}
            </CardContent>
          </Card>

          {/* What to expect */}
          <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground space-y-2">
            <p className="font-medium text-foreground text-sm">What happens next:</p>
            <ol className="list-decimal pl-4 space-y-1">
              <li>Review & accept the partnership agreement</li>
              <li>Connect your Stripe account for payouts</li>
              <li>Start sharing your referral link</li>
            </ol>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
