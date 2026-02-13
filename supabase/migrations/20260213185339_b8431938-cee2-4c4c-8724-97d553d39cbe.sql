DROP FUNCTION IF EXISTS public.get_campaign_dancers(uuid);

CREATE FUNCTION public.get_campaign_dancers(p_campaign_id uuid)
 RETURNS TABLE(dancer_id uuid, full_name text, avatar_url text, instagram_handle text, tiktok_handle text, video_links jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT 
    s.dancer_id,
    p.full_name,
    p.avatar_url,
    p.instagram_handle,
    p.tiktok_handle,
    COALESCE(
      jsonb_agg(
        jsonb_build_object('id', s.id, 'platform', s.platform, 'video_url', s.video_url)
      ) FILTER (WHERE s.id IS NOT NULL),
      '[]'::jsonb
    ) AS video_links
  FROM submissions s
  JOIN profiles p ON p.id = s.dancer_id
  WHERE s.campaign_id = p_campaign_id
  GROUP BY s.dancer_id, p.full_name, p.avatar_url, p.instagram_handle, p.tiktok_handle
$$;