
-- Helper function for contract-engine to update PDF and transition to sent_for_signature
-- Used when the auto-generate path runs (producer accepts offer → auto contract)
CREATE OR REPLACE FUNCTION public.auto_finalize_contract(
  p_contract_id UUID, p_pdf_url TEXT, p_hash_checksum TEXT
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, deals
AS $$
BEGIN
  -- Update PDF URL and hash
  UPDATE deals.contracts
  SET pdf_url = p_pdf_url, hash_checksum = p_hash_checksum
  WHERE id = p_contract_id;

  -- Transition to sent_for_signature
  PERFORM deals.transition_contract_state(p_contract_id, 'sent_for_signature', (
    SELECT created_by FROM deals.contracts WHERE id = p_contract_id
  ));
END;
$$;
