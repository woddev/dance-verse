
-- Navigation links table managed by admins
CREATE TABLE public.nav_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  href text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.nav_links ENABLE ROW LEVEL SECURITY;

-- Everyone can read visible nav links
CREATE POLICY "Anyone can view visible nav links"
ON public.nav_links FOR SELECT
USING (visible = true);

-- Admins can do everything
CREATE POLICY "Admins can manage nav links"
ON public.nav_links FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Seed default nav links
INSERT INTO public.nav_links (label, href, position) VALUES
  ('Home', '/', 0),
  ('How It Works', '/how-it-works', 1),
  ('Campaigns', '/campaigns', 2);
