
DROP FUNCTION IF EXISTS public.admin_deal_track_detail(uuid, uuid);
DROP FUNCTION IF EXISTS public.admin_contract_detail(uuid, uuid);

CREATE FUNCTION public.admin_deal_track_detail(p_user_id uuid, p_track_id uuid)
 RETURNS TABLE(id uuid, title text, bpm integer, genre text, mood_tags jsonb, isrc text, master_ownership_percent numeric, publishing_ownership_percent numeric, explicit_flag boolean, file_url text, artwork_url text, status deals.track_status, created_at timestamp with time zone, producer_name text, producer_email text, denial_reason text, google_drive_url text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'deals'
AS $function$
BEGIN
  IF NOT public.is_deal_viewer(p_user_id) THEN RAISE EXCEPTION 'Access denied'; END IF;
  RETURN QUERY SELECT t.id, t.title, t.bpm, t.genre, t.mood_tags, t.isrc,
    t.master_ownership_percent, t.publishing_ownership_percent,
    t.explicit_flag, t.file_url, t.artwork_url, t.status, t.created_at,
    COALESCE(pr.stage_name, pr.legal_name), pr.email, t.denial_reason, t.google_drive_url
  FROM deals.tracks t JOIN deals.producers pr ON pr.id = t.producer_id WHERE t.id = p_track_id;
END;
$function$;

CREATE FUNCTION public.admin_contract_detail(p_user_id uuid, p_contract_id uuid)
 RETURNS TABLE(id uuid, offer_id uuid, offer_version integer, track_title text, producer_name text, deal_type text, template_version text, rendered_body text, pdf_url text, hash_checksum text, status deals.contract_status, producer_signed_at timestamp with time zone, admin_signed_at timestamp with time zone, created_at timestamp with time zone, created_by uuid, google_drive_url text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'deals'
AS $function$
BEGIN
  IF NOT public.is_deal_viewer(p_user_id) THEN RAISE EXCEPTION 'Access denied'; END IF;
  RETURN QUERY
  SELECT c.id, c.offer_id, o.version_number, t.title,
    COALESCE(pr.stage_name, pr.legal_name), o.deal_type::TEXT,
    c.template_version_snapshot, c.rendered_body, c.pdf_url, c.hash_checksum,
    c.status, c.producer_signed_at, c.admin_signed_at, c.created_at, c.created_by, c.google_drive_url
  FROM deals.contracts c
  JOIN deals.offers o ON o.id = c.offer_id
  JOIN deals.tracks t ON t.id = o.track_id
  JOIN deals.producers pr ON pr.id = t.producer_id
  WHERE c.id = p_contract_id;
END;
$function$;
