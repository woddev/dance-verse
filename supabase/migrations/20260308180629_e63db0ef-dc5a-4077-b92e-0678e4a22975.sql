
CREATE TABLE public.hero_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  headline text NOT NULL DEFAULT 'Campaigns for Dancers',
  subheadline text NOT NULL DEFAULT 'Are you a dancer that wants to earn doing what you love?',
  video_url text,
  cta_text text NOT NULL DEFAULT 'APPLY NOW',
  cta_link text NOT NULL DEFAULT '/dancer/apply',
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.hero_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view hero settings"
  ON public.hero_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage hero settings"
  ON public.hero_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default row
INSERT INTO public.hero_settings (headline, subheadline, cta_text, cta_link)
VALUES ('Campaigns for Dancers', 'Are you a dancer that wants to earn doing what you love?', 'APPLY NOW', '/dancer/apply');
