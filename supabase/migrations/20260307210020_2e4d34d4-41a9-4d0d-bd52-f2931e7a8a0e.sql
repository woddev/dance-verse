
CREATE OR REPLACE FUNCTION public.update_track_drive_url(p_track_id uuid, p_drive_url text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'deals'
AS $$
BEGIN
  UPDATE deals.tracks SET google_drive_url = p_drive_url WHERE id = p_track_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_contract_drive_url(p_contract_id uuid, p_drive_url text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'deals'
AS $$
BEGIN
  UPDATE deals.contracts SET google_drive_url = p_drive_url WHERE id = p_contract_id;
END;
$$;
