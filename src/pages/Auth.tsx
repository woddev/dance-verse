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

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [checkingToken, setCheckingToken] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  const redirectByRole = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const roles = (data ?? []).map((r: any) => r.role);
    if (roles.includes("admin")) {
      navigate("/admin/dashboard");
    } else {
      navigate("/dancer/dashboard");
    }
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
      // If already logged in, redirect to dashboard
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          redirectByRole(session.user.id);
        }
        setCheckingToken(false);
      });
    }
  }, [redirectByRole]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else if (data.user) {
      await redirectByRole(data.user.id);
    }

    setLoading(false);
  };

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
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await redirectByRole(session.user.id);
      } else {
        navigate("/dancer/dashboard");
      }
    }

    setLoading(false);
  };

  if (checkingToken) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center pt-20 px-4">
          <p className="text-muted-foreground">Setting up your account...</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center pt-20 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              {isSettingUp ? "Set Up Your Account" : "Welcome Back"}
            </CardTitle>
            <CardDescription>
              {isSettingUp
                ? "Create a password to complete your account setup"
                : "Sign in to your Dance-Verse account"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSettingUp ? (
              <form onSubmit={handleSetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="At least 6 characters" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Setting up..." : "Complete Setup"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
