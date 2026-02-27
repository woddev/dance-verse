
DROP FUNCTION IF EXISTS public.producer_contract_detail(uuid, uuid);

CREATE OR REPLACE FUNCTION public.producer_contract_detail(p_user_id uuid, p_contract_id uuid)
RETURNS TABLE(
  id uuid, offer_id uuid, offer_version integer, track_title text,
  deal_type text, template_version text, rendered_body text, pdf_url text,
  status deals.contract_status, producer_signed_at timestamp with time zone,
  admin_signed_at timestamp with time zone, created_at timestamp with time zone
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'deals'
AS $$
DECLARE v_pid UUID;
BEGIN
  SELECT public.get_producer_id(p_user_id) INTO v_pid;
  IF v_pid IS NULL THEN RAISE EXCEPTION 'Producer not found'; END IF;

  RETURN QUERY
  SELECT c.id, c.offer_id, o.version_number, t.title,
    o.deal_type::TEXT, c.template_version_snapshot, c.rendered_body, c.pdf_url,
    c.status, c.producer_signed_at, c.admin_signed_at, c.created_at
  FROM deals.contracts c
  JOIN deals.offers o ON o.id = c.offer_id
  JOIN deals.tracks t ON t.id = o.track_id
  WHERE c.id = p_contract_id AND t.producer_id = v_pid
    AND c.status != 'generated';
END;
$$;
