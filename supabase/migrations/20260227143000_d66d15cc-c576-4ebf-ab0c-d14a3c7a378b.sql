
-- Producer Stripe helper RPCs for edge functions

CREATE OR REPLACE FUNCTION public.get_producer_stripe_info(p_user_id UUID)
RETURNS TABLE(stripe_account_id TEXT, stripe_onboarded BOOLEAN)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'deals'
AS $$
DECLARE v_pid UUID;
BEGIN
  SELECT public.get_producer_id(p_user_id) INTO v_pid;
  IF v_pid IS NULL THEN RETURN; END IF;
  RETURN QUERY
  SELECT pr.stripe_account_id, pr.stripe_onboarded
  FROM deals.producers pr WHERE pr.id = v_pid;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_producer_stripe(p_user_id UUID, p_stripe_account_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'deals'
AS $$
DECLARE v_pid UUID;
BEGIN
  SELECT public.get_producer_id(p_user_id) INTO v_pid;
  IF v_pid IS NULL THEN RAISE EXCEPTION 'Producer not found'; END IF;
  UPDATE deals.producers SET stripe_account_id = p_stripe_account_id WHERE id = v_pid;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_producer_stripe_status(p_user_id UUID)
RETURNS TABLE(stripe_account_id TEXT, stripe_onboarded BOOLEAN)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'deals'
AS $$
DECLARE v_pid UUID;
BEGIN
  SELECT public.get_producer_id(p_user_id) INTO v_pid;
  IF v_pid IS NULL THEN RETURN; END IF;
  RETURN QUERY SELECT pr.stripe_account_id, pr.stripe_onboarded FROM deals.producers pr WHERE pr.id = v_pid;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_producer_stripe_onboarded(p_stripe_account_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'deals'
AS $$
BEGIN
  UPDATE deals.producers SET stripe_onboarded = TRUE WHERE stripe_account_id = p_stripe_account_id;
END;
$$;
