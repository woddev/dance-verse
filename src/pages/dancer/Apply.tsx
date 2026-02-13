import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function DancerApply() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    bio: "",
    instagram_handle: "",
    tiktok_handle: "",
    youtube_handle: "",
    dance_style: "",
    years_experience: "",
    location: "",
  });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, bio, instagram_handle, tiktok_handle, youtube_handle, dance_style, years_experience, location, application_status")
        .eq("id", user.id)
        .single();

      if (profile) {
        if (profile.application_status === "approved") {
          navigate("/dancer/dashboard");
          return;
        }
        if (profile.application_status === "pending") {
          navigate("/dancer/dashboard");
          return;
        }
        setForm({
          full_name: profile.full_name ?? "",
          bio: profile.bio ?? "",
          instagram_handle: profile.instagram_handle ?? "",
          tiktok_handle: profile.tiktok_handle ?? "",
          youtube_handle: profile.youtube_handle ?? "",
          dance_style: (profile as any).dance_style ?? "",
          years_experience: (profile as any).years_experience?.toString() ?? "",
          location: (profile as any).location ?? "",
        });
      }
      setLoading(false);
    })();
  }, []);

  const handleSubmit = async () => {
    if (!form.full_name.trim() || !form.dance_style.trim() || !form.location.trim()) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("profiles").update({
      full_name: form.full_name.trim(),
      bio: form.bio.trim() || null,
      instagram_handle: form.instagram_handle.trim() || null,
      tiktok_handle: form.tiktok_handle.trim() || null,
      youtube_handle: form.youtube_handle.trim() || null,
      dance_style: form.dance_style.trim(),
      years_experience: form.years_experience ? parseInt(form.years_experience) : null,
      location: form.location.trim(),
      application_status: "pending" as any,
      application_submitted_at: new Date().toISOString(),
    } as any).eq("id", user.id);

    if (error) {
      toast({ title: "Error submitting application", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Application submitted!", description: "We'll review it shortly." });
      navigate("/dancer/dashboard");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted">
      <Navbar />
      <div className="pt-24 pb-12 max-w-xl mx-auto px-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Apply to Join</CardTitle>
            <CardDescription>Tell us about yourself so we can review your application.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Full Name *</Label>
              <Input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Bio</Label>
              <Textarea placeholder="Tell us about yourself…" value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Dance Style / Genre *</Label>
                <Input placeholder="e.g. hip-hop, contemporary" value={form.dance_style} onChange={(e) => setForm((f) => ({ ...f, dance_style: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Years of Experience</Label>
                <Input type="number" min="0" value={form.years_experience} onChange={(e) => setForm((f) => ({ ...f, years_experience: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Location / City *</Label>
              <Input placeholder="e.g. Los Angeles, CA" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
            </div>

            <div className="border-t border-border pt-4 mt-2">
              <p className="text-sm font-medium mb-3">Social Media</p>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Instagram Handle</Label>
                  <Input placeholder="@yourhandle" value={form.instagram_handle} onChange={(e) => setForm((f) => ({ ...f, instagram_handle: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>TikTok Handle</Label>
                  <Input placeholder="@yourhandle" value={form.tiktok_handle} onChange={(e) => setForm((f) => ({ ...f, tiktok_handle: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>YouTube Handle</Label>
                  <Input placeholder="@yourchannel" value={form.youtube_handle} onChange={(e) => setForm((f) => ({ ...f, youtube_handle: e.target.value }))} />
                </div>
              </div>
            </div>

            <Button className="w-full" onClick={handleSubmit} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting…</> : "Submit Application"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
