import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useAdminApi } from "@/hooks/useAdminApi";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, UserPlus, Shield } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StaffPermissions, PermissionSection } from "@/hooks/useStaffPermissions";

interface StaffRow extends StaffPermissions {
  id: string;
  created_at: string;
}

const SECTIONS: { key: PermissionSection; label: string }[] = [
  { key: "overview", label: "Overview / Dashboard" },
  { key: "music", label: "Music Catalog" },
  { key: "campaigns", label: "Campaigns" },
  { key: "people", label: "People" },
  { key: "finance", label: "Finance & Reports" },
  { key: "site_settings", label: "Site Settings" },
];

function PermissionCheckboxes({
  permissions,
  onChange,
  disabled,
}: {
  permissions: Record<string, boolean>;
  onChange: (field: string, val: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-3">
      {SECTIONS.map((s) => {
        const viewKey = `can_view_${s.key}`;
        const editKey = `can_edit_${s.key}`;
        return (
          <div key={s.key} className="flex items-center justify-between gap-4 py-2 border-b border-border last:border-0">
            <span className="text-sm font-medium min-w-[160px]">{s.label}</span>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Checkbox
                  id={viewKey}
                  checked={!!permissions[viewKey]}
                  onCheckedChange={(v) => onChange(viewKey, !!v)}
                  disabled={disabled}
                />
                <Label htmlFor={viewKey} className="text-sm text-muted-foreground">View</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id={editKey}
                  checked={!!permissions[editKey]}
                  onCheckedChange={(v) => {
                    onChange(editKey, !!v);
                    // Auto-enable view when edit is checked
                    if (v && !permissions[viewKey]) onChange(viewKey, true);
                  }}
                  disabled={disabled}
                />
                <Label htmlFor={editKey} className="text-sm text-muted-foreground">Edit</Label>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function StaffManagement() {
  const { callAdmin } = useAdminApi();
  const { isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [inviting, setInviting] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [newPerms, setNewPerms] = useState<Record<string, boolean>>({});

  // Fetch all staff permissions records + match with user data
  const { data: staffPerms = [], isLoading: permsLoading } = useQuery<StaffRow[]>({
    queryKey: ["admin-staff-permissions"],
    queryFn: () => callAdmin("staff-permissions"),
    enabled: isSuperAdmin,
  });

  const { data: allUsers = [] } = useQuery<any[]>({
    queryKey: ["admin-users"],
    queryFn: () => callAdmin("users"),
    enabled: isSuperAdmin,
  });

  const staffWithInfo = staffPerms.map((sp) => {
    const user = allUsers.find((u: any) => u.id === sp.user_id);
    return { ...sp, email: user?.email ?? "—", full_name: user?.full_name ?? "—" };
  });

  const handleInvite = async () => {
    if (!email) return;
    setInviting(true);
    try {
      await callAdmin("invite-staff", undefined, { email, full_name: fullName, ...newPerms });
      toast({ title: "Staff member invited", description: `Invite sent to ${email}` });
      setInviteOpen(false);
      setEmail("");
      setFullName("");
      setNewPerms({});
      queryClient.invalidateQueries({ queryKey: ["admin-staff-permissions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
    setInviting(false);
  };

  const handleUpdatePerms = async (userId: string, perms: Record<string, boolean>) => {
    setSaving(true);
    try {
      await callAdmin("update-staff-permissions", undefined, { user_id: userId, ...perms });
      toast({ title: "Permissions updated" });
      queryClient.invalidateQueries({ queryKey: ["admin-staff-permissions"] });
      setEditingUserId(null);
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const handleRemove = async (userId: string) => {
    if (!confirm("Remove this staff member's admin access?")) return;
    try {
      await callAdmin("remove-staff", undefined, { user_id: userId });
      toast({ title: "Staff member removed" });
      queryClient.invalidateQueries({ queryKey: ["admin-staff-permissions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  if (!isSuperAdmin) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          Only super admins can manage staff.
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Shield className="h-6 w-6" /> Staff Management
            </h1>
            <p className="text-muted-foreground mt-1">Invite staff and assign dashboard permissions.</p>
          </div>
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" /> Invite Staff
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Invite Staff Member</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label>Email</Label>
                  <Input placeholder="staff@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <Label>Full Name (optional)</Label>
                  <Input placeholder="Jane Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div>
                  <Label className="text-sm font-semibold">Permissions</Label>
                  <PermissionCheckboxes permissions={newPerms} onChange={(f, v) => setNewPerms((p) => ({ ...p, [f]: v }))} />
                </div>
                <Button className="w-full" onClick={handleInvite} disabled={inviting || !email}>
                  {inviting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Send Invite
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {permsLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : staffWithInfo.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <UserPlus className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>No staff members yet. Invite someone to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-lg border border-border bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Member</TableHead>
                  <TableHead>Email</TableHead>
                  {SECTIONS.map((s) => (
                    <TableHead key={s.key} className="text-center text-xs">{s.label}</TableHead>
                  ))}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffWithInfo.map((staff) => {
                  const isEditing = editingUserId === staff.user_id;
                  const [editPerms, setEditPerms] = useState<Record<string, boolean>>(() => {
                    const p: Record<string, boolean> = {};
                    for (const s of SECTIONS) {
                      p[`can_view_${s.key}`] = (staff as any)[`can_view_${s.key}`] ?? false;
                      p[`can_edit_${s.key}`] = (staff as any)[`can_edit_${s.key}`] ?? false;
                    }
                    return p;
                  });

                  return (
                    <TableRow key={staff.user_id}>
                      <TableCell className="font-medium text-sm">{staff.full_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{staff.email}</TableCell>
                      {SECTIONS.map((s) => {
                        const canView = isEditing ? editPerms[`can_view_${s.key}`] : (staff as any)[`can_view_${s.key}`];
                        const canEdit = isEditing ? editPerms[`can_edit_${s.key}`] : (staff as any)[`can_edit_${s.key}`];
                        return (
                          <TableCell key={s.key} className="text-center">
                            {isEditing ? (
                              <div className="flex flex-col items-center gap-1">
                                <div className="flex items-center gap-1">
                                  <Checkbox
                                    checked={canView}
                                    onCheckedChange={(v) => setEditPerms((p) => ({ ...p, [`can_view_${s.key}`]: !!v }))}
                                  />
                                  <span className="text-xs">V</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Checkbox
                                    checked={canEdit}
                                    onCheckedChange={(v) => {
                                      setEditPerms((p) => ({
                                        ...p,
                                        [`can_edit_${s.key}`]: !!v,
                                        ...(v ? { [`can_view_${s.key}`]: true } : {}),
                                      }));
                                    }}
                                  />
                                  <span className="text-xs">E</span>
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs space-y-0.5">
                                {canView && <span className="text-green-600 block">View</span>}
                                {canEdit && <span className="text-blue-600 block">Edit</span>}
                                {!canView && !canEdit && <span className="text-muted-foreground">—</span>}
                              </div>
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isEditing ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleUpdatePerms(staff.user_id, editPerms)}
                                disabled={saving}
                              >
                                {saving && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                                Save
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingUserId(null)}>
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button size="sm" variant="outline" onClick={() => setEditingUserId(staff.user_id)}>
                                Edit
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => handleRemove(staff.user_id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
