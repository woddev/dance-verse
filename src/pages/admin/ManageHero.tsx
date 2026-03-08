import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AdminLayout from "@/components/layout/AdminLayout";

interface HeroSettings {
  id: string;
  headline: string;
  subheadline: string;
  video_url: string | null;
  cta_text: string;
  cta_link: string;
}

export default function ManageHero() {
  const [settings, setSettings] = useState<HeroSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("hero_settings")
      .select("*")
      .limit(1)
      .single()
      .then(({ data, error }) => {
        if (data) setSettings(data as HeroSettings);
        if (error) toast.error("Failed to load hero settings");
      });
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    const { error } = await supabase
      .from("hero_settings")
      .update({
        headline: settings.headline,
        subheadline: settings.subheadline,
        video_url: settings.video_url || null,
        cta_text: settings.cta_text,
        cta_link: settings.cta_link,
        updated_at: new Date().toISOString(),
      })
      .eq("id", settings.id);

    if (error) {
      toast.error("Failed to save");
    } else {
      toast.success("Hero settings saved!");
    }
    setSaving(false);
  };

  if (!settings) return <AdminLayout><div className="p-8">Loading...</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Manage Hero Section</h1>
          <p className="text-muted-foreground">Update the homepage hero background video, headline, and call-to-action.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Hero Content</CardTitle>
            <CardDescription>Changes appear immediately on the homepage.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Headline</Label>
              <Input
                value={settings.headline}
                onChange={(e) => setSettings({ ...settings, headline: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Subheadline</Label>
              <Textarea
                value={settings.subheadline}
                onChange={(e) => setSettings({ ...settings, subheadline: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Background Video URL</Label>
              <Input
                value={settings.video_url || ""}
                onChange={(e) => setSettings({ ...settings, video_url: e.target.value })}
                placeholder="https://... (leave empty for default video)"
              />
              <p className="text-xs text-muted-foreground">Direct link to an MP4 video file. Leave blank to use the default.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CTA Button Text</Label>
                <Input
                  value={settings.cta_text}
                  onChange={(e) => setSettings({ ...settings, cta_text: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>CTA Button Link</Label>
                <Input
                  value={settings.cta_link}
                  onChange={(e) => setSettings({ ...settings, cta_link: e.target.value })}
                />
              </div>
            </div>

            {settings.video_url && (
              <div className="space-y-2">
                <Label>Preview</Label>
                <video src={settings.video_url} controls muted className="w-full rounded-lg max-h-48 object-cover" />
              </div>
            )}

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
