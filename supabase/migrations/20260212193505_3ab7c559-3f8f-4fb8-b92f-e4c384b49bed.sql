
-- Add new columns to campaigns
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS max_creators integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS due_days_after_accept integer NOT NULL DEFAULT 7;

-- Create the assignment RPC
CREATE OR REPLACE FUNCTION public.create_assignment(p_campaign_id uuid, p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status campaign_status;
  v_max integer;
  v_due_days integer;
  v_current_count integer;
  v_acceptance_id uuid;
BEGIN
  -- Get campaign info
  SELECT status, max_creators, due_days_after_accept
  INTO v_status, v_max, v_due_days
  FROM campaigns
  WHERE id = p_campaign_id;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Campaign not found';
  END IF;

  IF v_status <> 'active' THEN
    RAISE EXCEPTION 'Campaign is not active';
  END IF;

  -- Check current acceptance count
  SELECT count(*)
  INTO v_current_count
  FROM campaign_acceptances
  WHERE campaign_id = p_campaign_id;

  IF v_current_count >= v_max THEN
    RAISE EXCEPTION 'Campaign has reached maximum creators';
  END IF;

  -- Check if already accepted
  IF EXISTS (
    SELECT 1 FROM campaign_acceptances
    WHERE campaign_id = p_campaign_id AND dancer_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'You have already accepted this campaign';
  END IF;

  -- Create the acceptance
  INSERT INTO campaign_acceptances (campaign_id, dancer_id, deadline)
  VALUES (p_campaign_id, p_user_id, now() + (v_due_days || ' days')::interval)
  RETURNING id INTO v_acceptance_id;

  RETURN v_acceptance_id;
END;
$$;
