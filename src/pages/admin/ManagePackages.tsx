import { useState, useEffect } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, GripVertical } from "lucide-react";

interface Package {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  features: string[];
  max_creators: number;
  platforms: string[];
  position: number;
  active: boolean;
}

const emptyForm = {
  name: "",
  description: "",
  price_cents: 0,
  features: "",
  max_creators: 10,
  platforms: "",
  position: 0,
  active: true,
};

export default function ManagePackages() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchPackages = async () => {
    const { data } = await supabase
      .from("promotion_packages")
      .select("*")
      .order("position");
    if (data) {
      setPackages(
        data.map((p: any) => ({
          ...p,
          features: Array.isArray(p.features) ? p.features : [],
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, position: packages.length });
    setDialogOpen(true);
  };

  const openEdit = (pkg: Package) => {
    setEditingId(pkg.id);
    setForm({
      name: pkg.name,
      description: pkg.description || "",
      price_cents: pkg.price_cents,
      features: pkg.features.join("\n"),
      max_creators: pkg.max_creators,
      platforms: pkg.platforms.join(", "),
      position: pkg.position,
      active: pkg.active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || form.price_cents <= 0) {
      toast.error("Name and price are required");
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name,
      description: form.description || null,
      price_cents: form.price_cents,
      features: form.features.split("\n").filter((f) => f.trim()),
      max_creators: form.max_creators,
      platforms: form.platforms.split(",").map((p) => p.trim()).filter(Boolean),
      position: form.position,
      active: form.active,
    };

    if (editingId) {
      const { error } = await supabase
        .from("promotion_packages")
        .update(payload)
        .eq("id", editingId);
      if (error) toast.error(error.message);
      else toast.success("Package updated");
    } else {
      const { error } = await supabase
        .from("promotion_packages")
        .insert(payload);
      if (error) toast.error(error.message);
      else toast.success("Package created");
    }
    setSaving(false);
    setDialogOpen(false);
    fetchPackages();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this package?")) return;
    const { error } = await supabase.from("promotion_packages").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Package deleted");
      fetchPackages();
    }
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Promotion Packages</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" /> New Package
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Package" : "New Package"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Price (cents)</Label>
                  <Input type="number" value={form.price_cents} onChange={(e) => setForm({ ...form, price_cents: parseInt(e.target.value) || 0 })} />
                  <p className="text-xs text-muted-foreground">${(form.price_cents / 100).toFixed(2)}</p>
                </div>
                <div className="space-y-2">
                  <Label>Max Creators</Label>
                  <Input type="number" value={form.max_creators} onChange={(e) => setForm({ ...form, max_creators: parseInt(e.target.value) || 1 })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Platforms (comma-separated)</Label>
                <Input value={form.platforms} onChange={(e) => setForm({ ...form, platforms: e.target.value })} placeholder="TikTok, Instagram, YouTube" />
              </div>
              <div className="space-y-2">
                <Label>Features (one per line)</Label>
                <Textarea rows={5} value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} placeholder="Feature 1&#10;Feature 2" />
              </div>
              <div className="grid grid-cols-2 gap-4 items-center">
                <div className="space-y-2">
                  <Label>Position</Label>
                  <Input type="number" value={form.position} onChange={(e) => setForm({ ...form, position: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
                  <Label>Active</Label>
                </div>
              </div>
              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editingId ? "Update" : "Create"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : packages.length === 0 ? (
        <p className="text-muted-foreground text-center py-20">No packages yet. Create your first one.</p>
      ) : (
        <div className="grid gap-4">
          {packages.map((pkg) => (
            <Card key={pkg.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-4">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{pkg.name}</span>
                      <span className="text-sm text-muted-foreground">${(pkg.price_cents / 100).toLocaleString()}</span>
                      {!pkg.active && <span className="text-xs bg-muted px-2 py-0.5 rounded">Inactive</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">{pkg.max_creators} creators · {pkg.platforms.join(", ") || "All platforms"} · {pkg.features.length} features</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(pkg)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(pkg.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
