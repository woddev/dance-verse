
-- Public profile function: exposes only non-sensitive fields
CREATE OR REPLACE FUNCTION public.get_public_profile(p_dancer_id uuid)
RETURNS TABLE(
  id uuid,
  full_name text,
  avatar_url text,
  bio text,
  dance_style text,
  location text,
  instagram_handle text,
  tiktok_handle text,
  youtube_handle text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    p.id,
    p.full_name,
    p.avatar_url,
    p.bio,
    p.dance_style,
    p.location,
    p.instagram_handle,
    p.tiktok_handle,
    p.youtube_handle
  FROM profiles p
  WHERE p.id = p_dancer_id;
$$;

-- Dancer submissions function: returns approved submissions with campaign info
CREATE OR REPLACE FUNCTION public.get_dancer_submissions(p_dancer_id uuid)
RETURNS TABLE(
  id uuid,
  platform text,
  video_url text,
  submitted_at timestamptz,
  campaign_title text,
  artist_name text,
  cover_image_url text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    s.id,
    s.platform,
    s.video_url,
    s.submitted_at,
    c.title AS campaign_title,
    c.artist_name,
    c.cover_image_url
  FROM submissions s
  JOIN campaigns c ON c.id = s.campaign_id
  WHERE s.dancer_id = p_dancer_id
    AND s.review_status = 'approved'
  ORDER BY s.submitted_at DESC
  LIMIT 20;
$$;
