
-- Drop existing function with default params
DROP FUNCTION IF EXISTS deals.transition_contract_state(uuid, deals.contract_status, uuid, text);
DROP FUNCTION IF EXISTS deals.transition_contract_state(uuid, deals.contract_status, uuid);

-- Recreate with signed_by_producer → fully_executed shortcut
CREATE OR REPLACE FUNCTION deals.transition_contract_state(
  p_contract_id uuid,
  p_new_state deals.contract_status,
  p_changed_by uuid
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = deals, public AS $$
DECLARE
  v_current deals.contract_status;
  v_allowed boolean := false;
BEGIN
  SELECT status INTO v_current FROM deals.contracts WHERE id = p_contract_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contract not found'; END IF;

  v_allowed := CASE
    WHEN v_current = 'generated'           AND p_new_state = 'sent_for_signature'  THEN true
    WHEN v_current = 'generated'           AND p_new_state = 'archived'            THEN true
    WHEN v_current = 'sent_for_signature'  AND p_new_state = 'signed_by_producer'  THEN true
    WHEN v_current = 'sent_for_signature'  AND p_new_state = 'archived'            THEN true
    WHEN v_current = 'signed_by_producer'  AND p_new_state = 'signed_by_platform'  THEN true
    WHEN v_current = 'signed_by_producer'  AND p_new_state = 'fully_executed'      THEN true
    WHEN v_current = 'signed_by_producer'  AND p_new_state = 'archived'            THEN true
    WHEN v_current = 'signed_by_platform'  AND p_new_state = 'fully_executed'      THEN true
    WHEN v_current = 'signed_by_platform'  AND p_new_state = 'archived'            THEN true
    ELSE false
  END;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Invalid transition: % → %', v_current, p_new_state;
  END IF;

  UPDATE deals.contracts SET status = p_new_state WHERE id = p_contract_id;
  INSERT INTO deals.contract_state_history (contract_id, previous_state, new_state, changed_by)
  VALUES (p_contract_id, v_current::text, p_new_state::text, p_changed_by);
END;
$$;

-- Drop and recreate producer_sign_contract to auto-execute
DROP FUNCTION IF EXISTS deals.producer_sign_contract(uuid, uuid, text, text);

CREATE OR REPLACE FUNCTION deals.producer_sign_contract(
  p_contract_id uuid,
  p_user_id uuid,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = deals, public AS $$
DECLARE
  v_producer_id uuid;
  v_contract_producer uuid;
  v_offer_id uuid;
  v_track_id uuid;
BEGIN
  SELECT p.id INTO v_producer_id FROM deals.producers p WHERE p.user_id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Producer not found'; END IF;

  SELECT c.created_by, o.id, o.track_id
  INTO v_contract_producer, v_offer_id, v_track_id
  FROM deals.contracts c
  JOIN deals.offers o ON o.id = c.offer_id
  WHERE c.id = p_contract_id AND c.status = 'sent_for_signature';
  IF NOT FOUND THEN RAISE EXCEPTION 'Contract not available for signing'; END IF;

  INSERT INTO deals.contract_signatures (contract_id, signer_id, signer_role, ip_address, user_agent)
  VALUES (p_contract_id, p_user_id, 'producer', p_ip_address, p_user_agent);

  UPDATE deals.contracts SET producer_signed_at = now() WHERE id = p_contract_id;
  PERFORM deals.transition_contract_state(p_contract_id, 'signed_by_producer', p_user_id);

  -- Auto-execute: no admin countersign needed
  UPDATE deals.contracts SET admin_signed_at = now() WHERE id = p_contract_id;
  PERFORM deals.transition_contract_state(p_contract_id, 'fully_executed', p_user_id);

  -- Cascade
  PERFORM deals.transition_offer_state(v_offer_id, 'signed', p_user_id);
  PERFORM deals.transition_track_state(v_track_id, 'active', p_user_id);
END;
$$;
