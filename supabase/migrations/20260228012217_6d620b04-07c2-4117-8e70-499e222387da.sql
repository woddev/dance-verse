CREATE OR REPLACE FUNCTION public.producer_accept_offer(p_user_id uuid, p_offer_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'deals'
AS $function$
DECLARE
  v_pid UUID;
  v_track_id UUID;
  v_status deals.offer_status;
BEGIN
  SELECT public.get_producer_id(p_user_id) INTO v_pid;
  IF v_pid IS NULL THEN RAISE EXCEPTION 'Producer not found'; END IF;

  -- Verify ownership
  SELECT o.track_id, o.status INTO v_track_id, v_status
  FROM deals.offers o
  JOIN deals.tracks t ON t.id = o.track_id
  WHERE o.id = p_offer_id AND t.producer_id = v_pid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Offer not found or access denied'; END IF;

  -- Auto-transition through viewed if currently sent
  IF v_status = 'sent' THEN
    PERFORM deals.transition_offer_state(p_offer_id, 'viewed', p_user_id);
  END IF;

  -- Now accept (from viewed state)
  PERFORM deals.transition_offer_state(p_offer_id, 'accepted', p_user_id);

  -- Also transition track to deal_signed
  BEGIN
    PERFORM deals.transition_track_state(v_track_id, 'deal_signed', p_user_id);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END;
$function$;

-- Also fix reject and counter to auto-transition through viewed
CREATE OR REPLACE FUNCTION public.producer_reject_offer(p_user_id uuid, p_offer_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'deals'
AS $function$
DECLARE
  v_pid UUID;
  v_status deals.offer_status;
BEGIN
  SELECT public.get_producer_id(p_user_id) INTO v_pid;
  IF v_pid IS NULL THEN RAISE EXCEPTION 'Producer not found'; END IF;

  SELECT o.status INTO v_status
  FROM deals.offers o
  JOIN deals.tracks t ON t.id = o.track_id
  WHERE o.id = p_offer_id AND t.producer_id = v_pid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Offer not found or access denied'; END IF;

  IF v_status = 'sent' THEN
    PERFORM deals.transition_offer_state(p_offer_id, 'viewed', p_user_id);
  END IF;

  PERFORM deals.transition_offer_state(p_offer_id, 'rejected', p_user_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.producer_counter_offer(p_user_id uuid, p_offer_id uuid, p_buyout_amount numeric, p_producer_split numeric, p_platform_split numeric, p_term_length text, p_territory text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'deals'
AS $function$
DECLARE
  v_pid UUID;
  v_track_id UUID;
  v_deal_type deals.deal_type;
  v_max_version INT;
  v_new_offer_id UUID;
  v_status deals.offer_status;
BEGIN
  SELECT public.get_producer_id(p_user_id) INTO v_pid;
  IF v_pid IS NULL THEN RAISE EXCEPTION 'Producer not found'; END IF;

  SELECT o.track_id, o.deal_type, o.status INTO v_track_id, v_deal_type, v_status
  FROM deals.offers o
  JOIN deals.tracks t ON t.id = o.track_id
  WHERE o.id = p_offer_id AND t.producer_id = v_pid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Offer not found or access denied'; END IF;

  -- Auto-transition through viewed if currently sent
  IF v_status = 'sent' THEN
    PERFORM deals.transition_offer_state(p_offer_id, 'viewed', p_user_id);
  END IF;

  -- Transition current offer to countered
  PERFORM deals.transition_offer_state(p_offer_id, 'countered', p_user_id);

  -- Transition track to counter_received
  BEGIN
    PERFORM deals.transition_track_state(v_track_id, 'counter_received', p_user_id);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_max_version
  FROM deals.offers WHERE track_id = v_track_id;

  INSERT INTO deals.offers (
    track_id, version_number, deal_type,
    buyout_amount, producer_split_percent, platform_split_percent,
    term_length, territory, status, created_by
  ) VALUES (
    v_track_id, v_max_version, v_deal_type,
    p_buyout_amount, p_producer_split, p_platform_split,
    p_term_length, p_territory, 'draft', p_user_id
  ) RETURNING id INTO v_new_offer_id;

  INSERT INTO deals.offer_state_history (offer_id, previous_state, new_state, changed_by)
  VALUES (v_new_offer_id, NULL, 'draft', p_user_id);

  RETURN v_new_offer_id;
END;
$function$;