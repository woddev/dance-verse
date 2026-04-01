CREATE TABLE public.track_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  dancer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_url text NOT NULL,
  platform text NOT NULL,
  view_count integer NOT NULL DEFAULT 0,
  like_count integer NOT NULL DEFAULT 0,
  comment_count integer NOT NULL DEFAULT 0,
  submitted_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.track_submissions ENABLE ROW LEVEL SECURITY;

-- Anyone can view all track submissions (public)
CREATE POLICY "Anyone can view track submissions"
ON public.track_submissions FOR SELECT
TO anon, authenticated
USING (true);

-- Authenticated dancers can insert their own submissions
CREATE POLICY "Dancers can submit to tracks"
ON public.track_submissions FOR INSERT
TO authenticated
WITH CHECK (dancer_id = auth.uid());

-- Dancers can delete their own submissions
CREATE POLICY "Dancers can delete own track submissions"
ON public.track_submissions FOR DELETE
TO authenticated
USING (dancer_id = auth.uid());

-- Admins full access
CREATE POLICY "Admins manage track submissions"
ON public.track_submissions FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));