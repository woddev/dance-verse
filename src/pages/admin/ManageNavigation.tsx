import { useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, GripVertical } from "lucide-react";

interface NavLink {
  id: string;
  label: string;
  href: string;
  position: number;
  visible: boolean;
}

export default function ManageNavigation() {
  const { toast } = useToast();
  const [links, setLinks] = useState<NavLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newHref, setNewHref] = useState("");

  const fetchLinks = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("nav_links")
      .select("id, label, href, position, visible")
      .order("position");
    if (data) setLinks(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  const handleAdd = async () => {
    if (!newLabel.trim() || !newHref.trim()) return;
    const nextPos = links.length > 0 ? Math.max(...links.map((l) => l.position)) + 1 : 0;
    const { error } = await supabase.from("nav_links").insert({
      label: newLabel.trim(),
      href: newHref.trim(),
      position: nextPos,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setNewLabel("");
      setNewHref("");
      fetchLinks();
      toast({ title: "Link added" });
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("nav_links").delete().eq("id", id);
    if (!error) {
      setLinks((prev) => prev.filter((l) => l.id !== id));
      toast({ title: "Link removed" });
    }
  };

  const handleToggleVisible = async (id: string, visible: boolean) => {
    await supabase.from("nav_links").update({ visible }).eq("id", id);
    setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, visible } : l)));
  };

  const handleUpdateField = (id: string, field: "label" | "href", value: string) => {
    setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    for (const link of links) {
      await supabase
        .from("nav_links")
        .update({ label: link.label, href: link.href, position: link.position })
        .eq("id", link.id);
    }
    setSaving(false);
    toast({ title: "Navigation saved" });
  };

  const moveLink = (index: number, direction: -1 | 1) => {
    const newLinks = [...links];
    const swapIdx = index + direction;
    if (swapIdx < 0 || swapIdx >= newLinks.length) return;
    const tempPos = newLinks[index].position;
    newLinks[index].position = newLinks[swapIdx].position;
    newLinks[swapIdx].position = tempPos;
    [newLinks[index], newLinks[swapIdx]] = [newLinks[swapIdx], newLinks[index]];
    setLinks(newLinks);
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-3xl font-bold">Navigation</h1>
          <p className="text-muted-foreground mt-1">Manage the links shown in the main navigation bar.</p>
        </div>

        {/* Existing links */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-muted-foreground text-sm">Loading…</p>
            ) : links.length === 0 ? (
              <p className="text-muted-foreground text-sm">No navigation links yet.</p>
            ) : (
              links.map((link, idx) => (
                <div key={link.id} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => moveLink(idx, -1)}
                      disabled={idx === 0}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => moveLink(idx, 1)}
                      disabled={idx === links.length - 1}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs"
                    >
                      ▼
                    </button>
                  </div>
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <Input
                      value={link.label}
                      onChange={(e) => handleUpdateField(link.id, "label", e.target.value)}
                      placeholder="Label"
                    />
                    <Input
                      value={link.href}
                      onChange={(e) => handleUpdateField(link.id, "href", e.target.value)}
                      placeholder="/path"
                    />
                  </div>
                  <Switch
                    checked={link.visible}
                    onCheckedChange={(v) => handleToggleVisible(link.id, v)}
                  />
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(link.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))
            )}

            {links.length > 0 && (
              <Button onClick={handleSaveAll} disabled={saving} className="mt-2">
                {saving ? "Saving…" : "Save Order & Labels"}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Add new */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Add Link</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 items-end">
              <div className="flex-1 space-y-1">
                <Label>Label</Label>
                <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Campaigns" />
              </div>
              <div className="flex-1 space-y-1">
                <Label>Path</Label>
                <Input value={newHref} onChange={(e) => setNewHref(e.target.value)} placeholder="/campaigns" />
              </div>
              <Button onClick={handleAdd} disabled={!newLabel.trim() || !newHref.trim()}>
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
