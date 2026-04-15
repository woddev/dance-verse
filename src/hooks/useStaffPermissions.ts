import { useQuery } from "@tanstack/react-query";
import { useAdminApi } from "./useAdminApi";
import { useAuth } from "./useAuth";

export interface StaffPermissions {
  user_id: string;
  can_view_overview: boolean;
  can_edit_overview: boolean;
  can_view_music: boolean;
  can_edit_music: boolean;
  can_view_campaigns: boolean;
  can_edit_campaigns: boolean;
  can_view_people: boolean;
  can_edit_people: boolean;
  can_view_finance: boolean;
  can_edit_finance: boolean;
  can_view_site_settings: boolean;
  can_edit_site_settings: boolean;
}

export type PermissionSection = "overview" | "music" | "campaigns" | "people" | "finance" | "site_settings";

const SECTION_ROUTES: Record<PermissionSection, string[]> = {
  overview: ["/admin/dashboard"],
  music: ["/admin/music"],
  campaigns: ["/admin/campaigns", "/admin/campaigns/new", "/admin/categories", "/admin/artist-submissions", "/admin/track-submissions"],
  people: ["/admin/dancers", "/admin/producer-applications", "/admin/partners"],
  finance: ["/admin/deals", "/admin/finance", "/admin/reports", "/admin/payouts"],
  site_settings: ["/admin/users", "/admin/hero", "/admin/navigation", "/admin/email-templates", "/admin/packages"],
};

export function useStaffPermissions() {
  const { callAdmin } = useAdminApi();
  const { isSuperAdmin, isAdmin } = useAuth();

  const { data: permissions, isLoading } = useQuery<StaffPermissions | null>({
    queryKey: ["staff-permissions-self"],
    queryFn: () => callAdmin("staff-permissions"),
    enabled: isAdmin && !isSuperAdmin,
  });

  // Super admins and full admins (no staff_permissions row) have full access
  const isFullAccess = isSuperAdmin || (isAdmin && !isLoading && !permissions);

  const canViewSection = (section: PermissionSection): boolean => {
    if (isFullAccess) return true;
    if (!permissions) return false;
    return permissions[`can_view_${section}`] ?? false;
  };

  const canEditSection = (section: PermissionSection): boolean => {
    if (isFullAccess) return true;
    if (!permissions) return false;
    return permissions[`can_edit_${section}`] ?? false;
  };

  const canAccessRoute = (route: string): boolean => {
    if (isSuperAdmin) return true;
    // Staff management is super_admin only
    if (route === "/admin/staff") return false;
    for (const [section, routes] of Object.entries(SECTION_ROUTES)) {
      if (routes.some(r => route.startsWith(r))) {
        return canViewSection(section as PermissionSection);
      }
    }
    // Deal track review is under finance
    if (route.startsWith("/admin/deals/track/")) return canViewSection("finance");
    // Music track detail is under music
    if (route.startsWith("/admin/music/")) return canViewSection("music");
    return false;
  };

  return { permissions, isLoading, canViewSection, canEditSection, canAccessRoute, isSuperAdmin };
}
