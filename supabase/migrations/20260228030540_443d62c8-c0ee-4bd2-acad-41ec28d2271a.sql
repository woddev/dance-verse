
CREATE OR REPLACE FUNCTION public.update_contract_hash_after_signature(p_contract_id uuid, p_hash_checksum text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'deals'
AS $function$
DECLARE
  v_status deals.contract_status;
BEGIN
  SELECT status INTO v_status FROM deals.contracts WHERE id = p_contract_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contract not found'; END IF;

  -- Allow hash update on contracts in signing states OR fully executed (for final signature append)
  IF v_status NOT IN ('sent_for_signature', 'signed_by_producer', 'signed_by_platform', 'fully_executed') THEN
    RAISE EXCEPTION 'Hash can only be updated during signing process (current: %)', v_status;
  END IF;

  UPDATE deals.contracts
  SET hash_checksum = p_hash_checksum
  WHERE id = p_contract_id;
END;
$function$;
