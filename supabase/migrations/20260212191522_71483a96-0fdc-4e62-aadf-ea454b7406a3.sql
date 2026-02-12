
-- 1. Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'dancer');

-- 2. Create campaign_status enum
CREATE TYPE public.campaign_status AS ENUM ('active', 'paused', 'completed');

-- 3. Create acceptance_status enum
CREATE TYPE public.acceptance_status AS ENUM ('accepted', 'submitted', 'approved', 'rejected', 'paid');

-- 4. Create review_status enum
CREATE TYPE public.review_status AS ENUM ('pending', 'approved', 'rejected');

-- 5. Create payout_status enum
CREATE TYPE public.payout_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- ============================================================
-- TABLES
-- ============================================================

-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  instagram_handle TEXT,
  tiktok_handle TEXT,
  youtube_handle TEXT,
  stripe_account_id TEXT,
  stripe_onboarded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- campaigns
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  song_url TEXT,
  tiktok_sound_url TEXT,
  instagram_sound_url TEXT,
  required_platforms TEXT[] NOT NULL DEFAULT '{}',
  required_hashtags TEXT[] NOT NULL DEFAULT '{}',
  required_mentions TEXT[] NOT NULL DEFAULT '{}',
  pay_scale JSONB NOT NULL DEFAULT '[]'::jsonb,
  status public.campaign_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- campaign_acceptances
CREATE TABLE public.campaign_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  dancer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deadline TIMESTAMPTZ NOT NULL,
  status public.acceptance_status NOT NULL DEFAULT 'accepted',
  UNIQUE (campaign_id, dancer_id)
);

-- submissions
CREATE TABLE public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  acceptance_id UUID NOT NULL REFERENCES public.campaign_acceptances(id) ON DELETE CASCADE,
  dancer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  platform TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  review_status public.review_status NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  reviewed_at TIMESTAMPTZ,
  view_count INTEGER NOT NULL DEFAULT 0
);

-- payouts
CREATE TABLE public.payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  dancer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  stripe_transfer_id TEXT,
  status public.payout_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- ============================================================
-- SECURITY DEFINER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- ============================================================
-- TRIGGER: auto-create profile on signup
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'dancer');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- campaigns
CREATE POLICY "Authenticated users can view active campaigns" ON public.campaigns
  FOR SELECT TO authenticated USING (status = 'active' OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert campaigns" ON public.campaigns
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update campaigns" ON public.campaigns
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete campaigns" ON public.campaigns
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- campaign_acceptances
CREATE POLICY "Dancers can view own acceptances" ON public.campaign_acceptances
  FOR SELECT TO authenticated USING (dancer_id = auth.uid());

CREATE POLICY "Dancers can accept campaigns" ON public.campaign_acceptances
  FOR INSERT TO authenticated WITH CHECK (dancer_id = auth.uid());

CREATE POLICY "Admins can view all acceptances" ON public.campaign_acceptances
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update acceptances" ON public.campaign_acceptances
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- submissions
CREATE POLICY "Dancers can view own submissions" ON public.submissions
  FOR SELECT TO authenticated USING (dancer_id = auth.uid());

CREATE POLICY "Dancers can insert submissions" ON public.submissions
  FOR INSERT TO authenticated WITH CHECK (dancer_id = auth.uid());

CREATE POLICY "Admins can view all submissions" ON public.submissions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update submissions" ON public.submissions
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- payouts
CREATE POLICY "Dancers can view own payouts" ON public.payouts
  FOR SELECT TO authenticated USING (dancer_id = auth.uid());

CREATE POLICY "Admins can view all payouts" ON public.payouts
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage payouts" ON public.payouts
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('campaign-assets', 'campaign-assets', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('submission-videos', 'submission-videos', false);

-- Storage policies
CREATE POLICY "Campaign assets are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'campaign-assets');

CREATE POLICY "Admins can upload campaign assets" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'campaign-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update campaign assets" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'campaign-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Dancers can upload submission videos" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'submission-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Dancers can view own submission videos" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'submission-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all submission videos" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'submission-videos' AND public.has_role(auth.uid(), 'admin'));
