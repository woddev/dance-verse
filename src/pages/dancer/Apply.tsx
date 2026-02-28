import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Video, Users, DollarSign, Star } from "lucide-react";
import dancerBg from "@/assets/dancer-bg.jpg";

const benefits = [
  { icon: Video, text: "Get paid to create dance content for trending songs" },
  { icon: Users, text: "Join campaigns from major labels and independent artists" },
  { icon: DollarSign, text: "Earn per submission — approved videos get paid fast" },
  { icon: Star, text: "Build your portfolio and grow your following" },
];

export default function DancerApply() {
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
          description: "Please verify your email address, then log in to complete your profile.",
        });
        setSaving(false);
        return;
      }

      // Dancer role is auto-assigned by database trigger
      toast({ title: "Account created! Complete your profile to get approved." });
      navigate("/dancer/settings");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-primary relative">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30"
        style={{ backgroundImage: `url(${dancerBg})` }}
      />
      <Navbar />

      <div className="flex-1 pt-20 flex flex-col lg:flex-row relative z-10">
        {/* Left — Marketing copy */}
        <div className="flex-1 flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-20 xl:px-28">
          <h1 className="text-4xl sm:text-5xl xl:text-6xl font-extrabold text-primary-foreground leading-tight tracking-tight">
            Dance. Create.<br />Get paid.
          </h1>
          <p className="mt-5 text-lg sm:text-xl text-primary-foreground/80 max-w-lg leading-relaxed">
            DanceVerse connects dance creators with music campaigns. Sign up, complete your profile, and start earning from your content.
          </p>

          <ul className="mt-10 space-y-4">
            {benefits.map((b, i) => (
              <li key={i} className="flex items-start gap-3">
                <b.icon className="h-5 w-5 mt-0.5 text-primary-foreground/90 shrink-0" />
                <span className="text-primary-foreground/90 text-base">{b.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Right — Signup form */}
        <div className="flex items-center justify-center px-6 py-12 sm:px-12 lg:w-[480px] xl:w-[520px] shrink-0">
          <div className="w-full max-w-sm bg-background rounded-2xl p-8 shadow-2xl">
            <h2 className="text-xl font-bold text-foreground mb-1">Creators, sign up now.</h2>
            <p className="text-sm text-muted-foreground mb-6">Create your account, then complete your profile to get approved.</p>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="sr-only">Email</Label>
                <Input
                  type="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={set("email")}
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="sr-only">Password</Label>
                <Input
                  type="password"
                  placeholder="Password"
                  value={form.password}
                  onChange={set("password")}
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="sr-only">Confirm password</Label>
                <Input
                  type="password"
                  placeholder="Confirm password"
                  value={form.confirm_password}
                  onChange={set("confirm_password")}
                  className="h-11"
                />
              </div>

              <Button className="w-full h-11 text-base font-semibold" onClick={handleSubmit} disabled={saving}>
                {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating Account…</> : "Sign up"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
