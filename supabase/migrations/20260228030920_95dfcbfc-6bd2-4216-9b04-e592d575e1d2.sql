
-- Create a public view excluding sensitive payment fields
CREATE VIEW public.profiles_safe
WITH (security_invoker = on) AS
SELECT
  id, full_name, avatar_url, bio, dance_style, location,
  instagram_handle, tiktok_handle, youtube_handle,
  years_experience, created_at,
  application_status, application_submitted_at, application_reviewed_at, rejection_reason
FROM public.profiles;

-- Users can still read their own full profile row (needed for Stripe onboarding flow)
-- but general app queries should use profiles_safe instead
