
-- Function to update contract hash after signature appending
-- This bypasses the normal immutability trigger by only allowing hash_checksum changes
CREATE OR REPLACE FUNCTION public.update_contract_hash_after_signature(
  p_contract_id UUID,
  p_hash_checksum TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'deals'
AS $$
DECLARE
  v_status deals.contract_status;
BEGIN
  SELECT status INTO v_status FROM deals.contracts WHERE id = p_contract_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contract not found'; END IF;

  -- Only allow hash update on contracts that are in signing states
  IF v_status NOT IN ('sent_for_signature', 'signed_by_producer', 'signed_by_platform') THEN
    RAISE EXCEPTION 'Hash can only be updated during signing process (current: %)', v_status;
  END IF;

  -- Temporarily disable the immutability trigger for this update
  -- We do a targeted update that only changes hash_checksum
  UPDATE deals.contracts
  SET hash_checksum = p_hash_checksum
  WHERE id = p_contract_id;
END;
$$;
