DROP POLICY IF EXISTS "Public can view approved submissions" ON public.submissions;
CREATE POLICY "Public can view approved submissions"
ON public.submissions
FOR SELECT
TO anon, authenticated
USING (review_status = 'approved');