import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function ProducerApply() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirm_password: "",
  });

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.email.trim() || !form.password) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    if (!isValidEmail(form.email.trim())) {
      toast({ title: "Please enter a valid email address", variant: "destructive" });
      return;
    }
    if (form.password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    if (form.password !== form.confirm_password) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
      });

      if (signUpError) {
        toast({ title: "Signup failed", description: signUpError.message, variant: "destructive" });
        setSaving(false);
        return;
      }

      const session = signUpData.session;
      if (!session) {
        toast({
          title: "Check your email",
          description: "Please verify your email address, then log in at the producer login page.",
        });
        setSaving(false);
        return;
      }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/producer-data?action=register-producer`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            email: form.email.trim(),
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Registration failed" }));
        throw new Error(err.error || "Registration failed");
      }

      // Fire-and-forget welcome email
      try {
        const welcomeHtml = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f9fafb;padding:40px 0;">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:40px;border:1px solid #e5e7eb;">
  <h1 style="color:#111;font-size:24px;margin:0 0 16px;">Welcome to DanceVerse! 🎶</h1>
  <p style="color:#374151;font-size:16px;line-height:1.6;">Your producer account is all set up! You can now log in and start submitting your tracks.</p>
  <p style="color:#374151;font-size:16px;line-height:1.6;">Once you submit a track, our A&R team will review it and you may receive offers — buyout, revenue split, or recoupment deals.</p>
  <p style="color:#6b7280;font-size:14px;margin-top:24px;">— The DanceVerse Team</p>
</div></body></html>`;
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            to: form.email.trim(),
            subject: "Welcome to DanceVerse — Your Producer Account Is Ready!",
            html: welcomeHtml,
          }),
        }).catch(() => {});
      } catch {}

      toast({ title: "Account created! Redirecting to your dashboard…" });
      navigate("/producer/dashboard");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-muted">
      <Navbar />
      <div className="flex-1 pt-24 pb-12 max-w-sm mx-auto px-4 w-full">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Create Your Producer Account</CardTitle>
            <CardDescription>Sign up in seconds — start submitting tracks right away.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Email *</Label>
              <Input type="email" placeholder="you@example.com" value={form.email} onChange={set("email")} />
            </div>
            <div className="space-y-1">
              <Label>Password *</Label>
              <Input type="password" placeholder="Min 6 characters" value={form.password} onChange={set("password")} />
            </div>
            <div className="space-y-1">
              <Label>Confirm Password *</Label>
              <Input type="password" value={form.confirm_password} onChange={set("confirm_password")} />
            </div>
            <Button className="w-full" onClick={handleSubmit} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating Account…</> : "Create Account"}
            </Button>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
