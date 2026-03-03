
CREATE OR REPLACE FUNCTION public.get_producer_profile(p_user_id uuid)
RETURNS TABLE(legal_name text, stage_name text, bio text, genre text, location text, tiktok_url text, instagram_url text, spotify_url text, soundcloud_url text, other_social_url text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'deals'
AS $$
DECLARE v_pid UUID;
BEGIN
  SELECT public.get_producer_id(p_user_id) INTO v_pid;
  IF v_pid IS NULL THEN RETURN; END IF;
  RETURN QUERY
  SELECT pr.legal_name, pr.stage_name, pr.bio, pr.genre, pr.location,
    pr.tiktok_url, pr.instagram_url, pr.spotify_url, pr.soundcloud_url, pr.other_social_url
  FROM deals.producers pr WHERE pr.id = v_pid;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_producer_profile(
  p_user_id uuid, p_legal_name text, p_stage_name text DEFAULT NULL, p_bio text DEFAULT NULL,
  p_genre text DEFAULT NULL, p_location text DEFAULT NULL, p_tiktok_url text DEFAULT NULL,
  p_instagram_url text DEFAULT NULL, p_spotify_url text DEFAULT NULL, p_soundcloud_url text DEFAULT NULL,
  p_other_social_url text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'deals'
AS $$
DECLARE v_pid UUID;
BEGIN
  SELECT public.get_producer_id(p_user_id) INTO v_pid;
  IF v_pid IS NULL THEN RAISE EXCEPTION 'Producer not found'; END IF;
  UPDATE deals.producers SET
    legal_name = p_legal_name, stage_name = p_stage_name, bio = p_bio,
    genre = p_genre, location = p_location, tiktok_url = p_tiktok_url,
    instagram_url = p_instagram_url, spotify_url = p_spotify_url,
    soundcloud_url = p_soundcloud_url, other_social_url = p_other_social_url
  WHERE id = v_pid;
END;
$$;
