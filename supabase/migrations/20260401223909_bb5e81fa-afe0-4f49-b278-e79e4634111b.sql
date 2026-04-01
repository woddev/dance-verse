CREATE POLICY "Anyone can view active tracks"
ON public.tracks FOR SELECT TO anon
USING (status = 'active');