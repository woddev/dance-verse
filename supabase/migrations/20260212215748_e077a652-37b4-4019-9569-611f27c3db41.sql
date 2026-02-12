
-- Allow anyone (including non-logged-in users) to view active campaigns
CREATE POLICY "Anyone can view active campaigns"
ON public.campaigns FOR SELECT
TO anon
USING (status = 'active'::campaign_status);
