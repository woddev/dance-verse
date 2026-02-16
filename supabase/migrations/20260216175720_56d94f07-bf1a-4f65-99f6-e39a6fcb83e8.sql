
CREATE TABLE public.inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  artist_name TEXT NOT NULL,
  song_title TEXT,
  budget_range TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert inquiries"
ON public.inquiries FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view inquiries"
ON public.inquiries FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update inquiries"
ON public.inquiries FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));
