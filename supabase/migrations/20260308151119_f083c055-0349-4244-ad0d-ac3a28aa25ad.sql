
-- Promotion packages table (admin-managed pricing tiers)
CREATE TABLE public.promotion_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  max_creators INTEGER NOT NULL DEFAULT 10,
  platforms TEXT[] NOT NULL DEFAULT '{}'::text[],
  position INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Artist submissions table (public submissions with payment tracking)
CREATE TABLE public.artist_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id UUID REFERENCES public.promotion_packages(id) NOT NULL,
  artist_name TEXT NOT NULL,
  song_title TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  audio_url TEXT,
  cover_image_url TEXT,
  instagram_url TEXT,
  tiktok_url TEXT,
  spotify_url TEXT,
  youtube_url TEXT,
  hashtags TEXT[] NOT NULL DEFAULT '{}'::text[],
  notes TEXT,
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  review_status TEXT NOT NULL DEFAULT 'pending',
  review_notes TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  campaign_id UUID REFERENCES public.campaigns(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS for promotion_packages
ALTER TABLE public.promotion_packages ENABLE ROW LEVEL SECURITY;

-- Anyone can view active packages
CREATE POLICY "Anyone can view active packages"
  ON public.promotion_packages FOR SELECT
  USING (active = true);

-- Admins can manage packages
CREATE POLICY "Admins can manage packages"
  ON public.promotion_packages FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS for artist_submissions
ALTER TABLE public.artist_submissions ENABLE ROW LEVEL SECURITY;

-- Anyone can insert submissions (public form, no auth required)
CREATE POLICY "Anyone can insert artist submissions"
  ON public.artist_submissions FOR INSERT
  WITH CHECK (payment_status = 'unpaid' AND review_status = 'pending');

-- Admins can view and manage all submissions
CREATE POLICY "Admins can manage artist submissions"
  ON public.artist_submissions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
