-- Auto-generate contract when producer accepts offer (no admin check needed)
CREATE OR REPLACE FUNCTION public.auto_generate_contract(p_offer_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'deals'
AS $function$
DECLARE
  v_offer RECORD;
  v_template RECORD;
  v_contract_id UUID;
  v_producer RECORD;
  v_rendered TEXT;
BEGIN
  -- Get offer details - MUST be in accepted state
  SELECT o.*, t.title AS track_title, t.id AS track_id, t.producer_id
  INTO v_offer
  FROM deals.offers o
  JOIN deals.tracks t ON t.id = o.track_id
  WHERE o.id = p_offer_id AND o.status = 'accepted';
  IF NOT FOUND THEN RAISE EXCEPTION 'Offer not found or not in accepted state'; END IF;

  -- Archive any existing non-executed contracts for this track
  UPDATE deals.contracts c
  SET status = 'archived'::deals.contract_status, archived_at = now()
  FROM deals.offers o
  WHERE c.offer_id = o.id AND o.track_id = v_offer.track_id
    AND c.status NOT IN ('fully_executed', 'archived');

  -- Get active template for deal_type
  SELECT * INTO v_template
  FROM deals.contract_templates
  WHERE deal_type = v_offer.deal_type AND is_active = true
  LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'No active contract template for deal type: %', v_offer.deal_type; END IF;

  -- Get producer details
  SELECT * INTO v_producer FROM deals.producers WHERE id = v_offer.producer_id;

  -- Render template with variable injection
  v_rendered := v_template.template_body;
  v_rendered := replace(v_rendered, '{{producer_legal_name}}', COALESCE(v_producer.legal_name, ''));
  v_rendered := replace(v_rendered, '{{track_title}}', COALESCE(v_offer.track_title, ''));
  v_rendered := replace(v_rendered, '{{deal_type}}', COALESCE(v_offer.deal_type::TEXT, ''));
  v_rendered := replace(v_rendered, '{{buyout_amount}}', COALESCE(v_offer.buyout_amount::TEXT, 'N/A'));
  v_rendered := replace(v_rendered, '{{producer_split_percent}}', COALESCE(v_offer.producer_split_percent::TEXT, 'N/A'));
  v_rendered := replace(v_rendered, '{{platform_split_percent}}', COALESCE(v_offer.platform_split_percent::TEXT, 'N/A'));
  v_rendered := replace(v_rendered, '{{term_length}}', COALESCE(v_offer.term_length, 'N/A'));
  v_rendered := replace(v_rendered, '{{territory}}', COALESCE(v_offer.territory, 'Worldwide'));
  v_rendered := replace(v_rendered, '{{exclusivity_flag}}', CASE WHEN v_offer.exclusivity_flag THEN 'Exclusive' ELSE 'Non-Exclusive' END);
  v_rendered := replace(v_rendered, '{{effective_date}}', to_char(now(), 'Month DD, YYYY'));

  -- Create contract record
  INSERT INTO deals.contracts (
    offer_id, template_id, template_version_snapshot, rendered_body,
    status, created_by
  ) VALUES (
    p_offer_id, v_template.id, v_template.template_version, v_rendered,
    'generated', v_offer.producer_id
  ) RETURNING id INTO v_contract_id;

  -- Log initial state
  INSERT INTO deals.contract_state_history (contract_id, previous_state, new_state, changed_by)
  VALUES (v_contract_id, NULL, 'generated', v_offer.producer_id);

  RETURN v_contract_id;
END;
$function$;