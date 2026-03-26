
-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view active tracks" ON public.tracks;

-- Create a restricted policy requiring authentication
CREATE POLICY "Authenticated users can view active tracks" ON public.tracks
  FOR SELECT
  TO authenticated
  USING (status = 'active');
