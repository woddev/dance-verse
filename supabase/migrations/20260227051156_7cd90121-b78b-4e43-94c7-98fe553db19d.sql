
-- Helper RPC to update contract PDF URL and hash (needed by edge function since PostgREST can't access deals schema)
CREATE OR REPLACE FUNCTION public.admin_update_contract_pdf(
  p_user_id UUID,
  p_contract_id UUID,
  p_pdf_url TEXT,
  p_hash_checksum TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'deals'
AS $$
BEGIN
  IF NOT public.is_deal_admin(p_user_id) THEN RAISE EXCEPTION 'Access denied'; END IF;

  -- Only allow updating contracts that are in 'generated' state
  IF NOT EXISTS (SELECT 1 FROM deals.contracts WHERE id = p_contract_id AND status = 'generated') THEN
    RAISE EXCEPTION 'Contract not found or not in generated state';
  END IF;

  UPDATE deals.contracts
  SET pdf_url = p_pdf_url, hash_checksum = p_hash_checksum
  WHERE id = p_contract_id;
END;
$$;
