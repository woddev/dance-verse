
-- 1. Fix create_assignment: use auth.uid() instead of p_user_id
CREATE OR REPLACE FUNCTION public.create_assignment(p_campaign_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id uuid;
  v_deadline timestamptz;
  v_days int;
  v_accepted int;
  v_max int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT due_days_after_accept, accepted_count, max_creators
  INTO v_days, v_accepted, v_max
  FROM campaigns WHERE id = p_campaign_id AND status = 'active';

  IF NOT FOUND THEN RAISE EXCEPTION 'Campaign not found or not active'; END IF;
  IF v_accepted >= v_max THEN RAISE EXCEPTION 'Campaign is full'; END IF;

  IF EXISTS (SELECT 1 FROM campaign_acceptances WHERE campaign_id = p_campaign_id AND dancer_id = v_uid) THEN
    RAISE EXCEPTION 'Already accepted this campaign';
  END IF;

  v_deadline := now() + (v_days || ' days')::interval;

  INSERT INTO campaign_acceptances (campaign_id, dancer_id, deadline)
  VALUES (p_campaign_id, v_uid, v_deadline)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- 2. Fix deal-assets bucket: revert to private
UPDATE storage.buckets SET public = false WHERE id = 'deal-assets';

-- 3. Fix profiles_safe view: grant only authenticated access
REVOKE ALL ON public.profiles_safe FROM anon;
GRANT SELECT ON public.profiles_safe TO authenticated;

-- 4. Ensure user_roles has no insert gap for non-admins
-- RLS is already enabled; the ALL policy only matches admins.
-- PostgreSQL RLS default-deny means non-admins can't insert.
-- But let's add an explicit deny-all insert policy for safety:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_roles' AND policyname = 'No self-insert for non-admins'
  ) THEN
    EXECUTE 'CREATE POLICY "No self-insert for non-admins" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), ''admin''::app_role))';
  END IF;
END $$;
