
-- Campaign categories table
CREATE TABLE public.campaign_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  label text NOT NULL,
  description text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT 'bg-muted-foreground/80',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_categories ENABLE ROW LEVEL SECURITY;

-- Anyone can read categories (used on public campaigns page)
CREATE POLICY "Anyone can view categories"
  ON public.campaign_categories FOR SELECT
  USING (true);

-- Only admins can manage
CREATE POLICY "Admins can manage categories"
  ON public.campaign_categories FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed existing hardcoded categories
INSERT INTO public.campaign_categories (slug, label, description, color, position) VALUES
  ('shorts', 'Shorts', 'Short-form vertical video content', 'bg-blue-500/80', 0),
  ('dance_challenge', 'Dance Challenge', 'Choreographed dance challenge videos', 'bg-purple-500/80', 1),
  ('freestyle', 'Freestyle', 'Free-style dance interpretation', 'bg-orange-500/80', 2),
  ('transition', 'Transition', 'Creative transition effect videos', 'bg-teal-500/80', 3),
  ('duet', 'Duet', 'Side-by-side duet collaborations', 'bg-pink-500/80', 4);
