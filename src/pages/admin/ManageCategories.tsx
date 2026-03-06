import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useCampaignCategories, type CampaignCategory } from "@/hooks/useCampaignCategories";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, GripVertical, Tag } from "lucide-react";

const COLOR_OPTIONS = [
  { value: "bg-blue-500/80", label: "Blue" },
  { value: "bg-purple-500/80", label: "Purple" },
  { value: "bg-orange-500/80", label: "Orange" },
  { value: "bg-teal-500/80", label: "Teal" },
  { value: "bg-pink-500/80", label: "Pink" },
  { value: "bg-red-500/80", label: "Red" },
  { value: "bg-green-500/80", label: "Green" },
  { value: "bg-yellow-500/80", label: "Yellow" },
  { value: "bg-indigo-500/80", label: "Indigo" },
  { value: "bg-cyan-500/80", label: "Cyan" },
];

const emptyForm = { slug: "", label: "", description: "", color: "bg-blue-500/80" };

export default function ManageCategories() {
  const { data: categories, isLoading } = useCampaignCategories();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!form.label || !form.slug) return;
    setSaving(true);
    try {
      const nextPosition = (categories?.length ?? 0);
      const { error } = await supabase.from("campaign_categories").insert({
        slug: form.slug.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""),
        label: form.label,
        description: form.description,
        color: form.color,
        position: nextPosition,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["campaign-categories"] });
      setForm({ ...emptyForm });
      setAddOpen(false);
      toast({ title: "Category created" });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const openEdit = (cat: CampaignCategory) => {
    setForm({ slug: cat.slug, label: cat.label, description: cat.description, color: cat.color });
    setEditingId(cat.id);
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editingId || !form.label) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("campaign_categories").update({
        label: form.label,
        description: form.description,
        color: form.color,
      }).eq("id", editingId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["campaign-categories"] });
      setEditOpen(false);
      setEditingId(null);
      toast({ title: "Category updated" });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const autoSlug = (label: string) =>
    label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

  const CategoryForm = ({ isEdit }: { isEdit: boolean }) => (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>Label *</Label>
        <Input
          value={form.label}
          onChange={(e) => {
            const label = e.target.value;
            setForm((f) => ({
              ...f,
              label,
              ...(isEdit ? {} : { slug: autoSlug(label) }),
            }));
          }}
          placeholder="e.g. Dance Challenge"
        />
      </div>
      {!isEdit && (
        <div className="space-y-1">
          <Label>Slug *</Label>
          <Input
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            placeholder="e.g. dance_challenge"
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">Unique identifier, auto-generated from label</p>
        </div>
      )}
      <div className="space-y-1">
        <Label>Description</Label>
        <Textarea
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="Short description of this category…"
          rows={2}
        />
      </div>
      <div className="space-y-1">
        <Label>Badge Color</Label>
        <div className="flex flex-wrap gap-2">
          {COLOR_OPTIONS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setForm((f) => ({ ...f, color: c.value }))}
              className={`w-8 h-8 rounded-full ${c.value.replace("/80", "")} transition-all ${form.color === c.value ? "ring-2 ring-offset-2 ring-foreground scale-110" : "opacity-70 hover:opacity-100"}`}
              title={c.label}
            />
          ))}
        </div>
      </div>
      <Button
        className="w-full"
        onClick={isEdit ? handleEdit : handleCreate}
        disabled={saving || !form.label || (!isEdit && !form.slug)}
      >
        {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Category"}
      </Button>
    </div>
  );

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Campaign Categories</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage the types of campaigns creators can participate in.</p>
          </div>
          <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (open) setForm({ ...emptyForm }); }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Category</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Category</DialogTitle></DialogHeader>
              <CategoryForm isEdit={false} />
            </DialogContent>
          </Dialog>
        </div>

        {!categories || categories.length === 0 ? (
          <p className="text-muted-foreground text-sm">No categories yet. Create one above.</p>
        ) : (
          <div className="space-y-2">
            {categories.map((cat) => (
              <Card key={cat.id} className="border border-border">
                <CardContent className="p-4 flex items-center gap-4">
                  <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className={`${cat.color} text-white text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full flex-shrink-0`}>
                    {cat.label.toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{cat.label}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {cat.description || "No description"} · <span className="font-mono">{cat.slug}</span>
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(cat)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) setEditingId(null); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Category</DialogTitle></DialogHeader>
            <CategoryForm isEdit={true} />
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
