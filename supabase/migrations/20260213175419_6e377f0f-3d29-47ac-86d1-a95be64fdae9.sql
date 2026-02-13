CREATE OR REPLACE FUNCTION public.get_campaign_dancers(p_campaign_id uuid)
RETURNS TABLE (
  dancer_id uuid,
  full_name text,
  avatar_url text,
  instagram_handle text,
  tiktok_handle text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT DISTINCT s.dancer_id, p.full_name, p.avatar_url, p.instagram_handle, p.tiktok_handle
  FROM submissions s
  JOIN profiles p ON p.id = s.dancer_id
  WHERE s.campaign_id = p_campaign_id
$$;