
CREATE OR REPLACE FUNCTION public.producer_contract_detail(p_user_id UUID, p_contract_id UUID)
RETURNS TABLE(
  id UUID, offer_id UUID, offer_version INT, track_title TEXT,
  deal_type TEXT, template_version TEXT, rendered_body TEXT, pdf_url TEXT,
  status deals.contract_status, producer_signed_at TIMESTAMPTZ, admin_signed_at TIMESTAMPTZ, created_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
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
  WHERE c.id = p_contract_id AND t.producer_id = v_pid;
END;
$$;
