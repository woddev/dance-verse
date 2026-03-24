CREATE OR REPLACE FUNCTION public.get_monthly_leaderboard(p_year integer, p_month integer)
 RETURNS TABLE(dancer_id uuid, full_name text, avatar_url text, approved_submissions bigint, total_views bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT
    s.dancer_id,
    p.full_name,
    p.avatar_url,
    COUNT(s.id) AS approved_submissions,
    COALESCE(SUM(s.view_count), 0) AS total_views
  FROM submissions s
  JOIN profiles p ON p.id = s.dancer_id
  WHERE s.review_status = 'approved'
    AND EXTRACT(YEAR FROM s.submitted_at) = p_year
    AND EXTRACT(MONTH FROM s.submitted_at) = p_month
  GROUP BY s.dancer_id, p.full_name, p.avatar_url
  ORDER BY approved_submissions DESC, total_views DESC
  LIMIT 50;
$$;