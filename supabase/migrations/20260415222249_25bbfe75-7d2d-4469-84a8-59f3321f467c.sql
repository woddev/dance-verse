
-- Staff permissions table for granular admin dashboard access
CREATE TABLE public.staff_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  -- Overview / Dashboard
  can_view_overview BOOLEAN NOT NULL DEFAULT false,
  can_edit_overview BOOLEAN NOT NULL DEFAULT false,
  -- Music Catalog
  can_view_music BOOLEAN NOT NULL DEFAULT false,
  can_edit_music BOOLEAN NOT NULL DEFAULT false,
  -- Campaigns (campaigns, categories, label subs, track videos)
  can_view_campaigns BOOLEAN NOT NULL DEFAULT false,
  can_edit_campaigns BOOLEAN NOT NULL DEFAULT false,
  -- People (dancers, producers, partners)
  can_view_people BOOLEAN NOT NULL DEFAULT false,
  can_edit_people BOOLEAN NOT NULL DEFAULT false,
  -- Finance & Reports (deals, finance, reports, payouts)
  can_view_finance BOOLEAN NOT NULL DEFAULT false,
  can_edit_finance BOOLEAN NOT NULL DEFAULT false,
  -- Site Settings (users, hero, navigation, emails, packages)
  can_view_site_settings BOOLEAN NOT NULL DEFAULT false,
  can_edit_site_settings BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.staff_permissions ENABLE ROW LEVEL SECURITY;

-- Super admins can do everything
CREATE POLICY "Super admins can manage staff permissions"
ON public.staff_permissions
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- Staff can view their own permissions
CREATE POLICY "Users can view own permissions"
ON public.staff_permissions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());
