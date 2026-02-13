

## Fix: Invited Dancers Redirected to Apply Page

**The Problem:** Dancers invited by the admin have `application_status = 'none'` in their profile, so the `DashboardLayout` redirects them to the application form instead of letting them access the dashboard and campaign pages.

**The Fix (2 parts):**

### 1. Update existing dancer profiles (data fix)
Set `application_status = 'approved'` for all current dancers whose status is still `'none'`.

```sql
UPDATE profiles SET application_status = 'approved' WHERE application_status = 'none';
```

### 2. Update the `handle_new_user` trigger
When the admin invites a dancer, the trigger currently leaves `application_status` at its default (`'none'`). Change it so newly invited users start as `'approved'`, since admin-invited dancers are already vetted.

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, application_status)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 'approved');

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'dancer');

  RETURN NEW;
END;
$$;
```

### No code changes needed
The dashboard, campaign detail page, and submission form are all already built. Once the `application_status` is corrected, clicking "View and Submit" will load the campaign page with the URL submission form, platform inputs, and creator listing -- all working as expected.

