import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useAdminApi } from "@/hooks/useAdminApi";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, X, Search, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-destructive text-destructive-foreground",
  super_admin: "bg-primary text-primary-foreground",
  finance_admin: "bg-secondary text-secondary-foreground",
  dancer: "bg-accent text-accent-foreground",
  producer: "bg-muted text-muted-foreground border border-border",
};

const ALL_ROLES = ["admin", "super_admin", "finance_admin", "dancer", "producer"];

interface UserRow {
  id: string;
  email: string;
  roles: string[];
  full_name: string | null;
  avatar_url: string | null;
  created_at: string | null;
  application_status: string | null;
  instagram_handle: string | null;
  tiktok_handle: string | null;
}

export default function ManageUsers() {
  const { callAdmin } = useAdminApi();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [updating, setUpdating] = useState<string | null>(null);

  const { data: users = [], isLoading } = useQuery<UserRow[]>({
    queryKey: ["admin-users"],
    queryFn: () => callAdmin("users"),
  });

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      !search ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.full_name ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || u.roles.includes(roleFilter);
    return matchesSearch && matchesRole;
  });

  const handleRoleChange = async (userId: string, role: string, actionType: "add" | "remove") => {
    setUpdating(`${userId}-${role}`);
    try {
      await callAdmin("update-user-role", undefined, { user_id: userId, role, action_type: actionType });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: `Role ${actionType === "add" ? "added" : "removed"} successfully` });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
    setUpdating(null);
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    return email[0]?.toUpperCase() ?? "?";
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6" /> User Management
          </h1>
          <p className="text-muted-foreground mt-1">View and manage user roles across the platform.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {ALL_ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {r.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {ALL_ROLES.map((role) => {
            const count = users.filter((u) => u.roles.includes(role)).length;
            return (
              <button
                key={role}
                onClick={() => setRoleFilter(roleFilter === role ? "all" : role)}
                className={`rounded-lg border border-border p-3 text-center transition-colors ${
                  roleFilter === role ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted"
                }`}
              >
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-xs capitalize">{role.replace("_", " ")}s</div>
              </button>
            );
          })}
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar_url ?? undefined} />
                            <AvatarFallback className="text-xs">
                              {getInitials(user.full_name, user.email)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-sm">{user.full_name ?? "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.roles.map((role) => (
                            <Badge key={role} className={`text-xs capitalize ${ROLE_COLORS[role] ?? ""}`}>
                              {role.replace("_", " ")}
                              <button
                                className="ml-1 hover:opacity-70"
                                onClick={() => handleRoleChange(user.id, role, "remove")}
                                disabled={updating === `${user.id}-${role}`}
                              >
                                {updating === `${user.id}-${role}` ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <X className="h-3 w-3" />
                                )}
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {user.created_at
                          ? new Date(user.created_at).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Plus className="h-3 w-3 mr-1" /> Add Role
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Add role to {user.full_name ?? user.email}</DialogTitle>
                            </DialogHeader>
                            <div className="grid grid-cols-1 gap-2 pt-2">
                              {ALL_ROLES.filter((r) => !user.roles.includes(r)).map((role) => (
                                <Button
                                  key={role}
                                  variant="outline"
                                  className="justify-start capitalize"
                                  onClick={() => handleRoleChange(user.id, role, "add")}
                                  disabled={updating === `${user.id}-${role}`}
                                >
                                  {updating === `${user.id}-${role}` && (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  )}
                                  {role.replace("_", " ")}
                                </Button>
                              ))}
                              {ALL_ROLES.filter((r) => !user.roles.includes(r)).length === 0 && (
                                <p className="text-sm text-muted-foreground py-2">User has all roles.</p>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Showing {filteredUsers.length} of {users.length} users
        </p>
      </div>
    </AdminLayout>
  );
}
