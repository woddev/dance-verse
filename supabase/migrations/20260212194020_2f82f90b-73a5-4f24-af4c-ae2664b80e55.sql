
-- Create tracks table for music CMS
CREATE TABLE public.tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  artist_name text NOT NULL,
  cover_image_url text,
  audio_url text,
  tiktok_sound_url text,
  instagram_sound_url text,
  genre text,
  bpm integer,
  duration_seconds integer,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;

-- Only admins can manage tracks
CREATE POLICY "Admins can manage tracks"
  ON public.tracks FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Authenticated users can view active tracks
CREATE POLICY "Authenticated users can view active tracks"
  ON public.tracks FOR SELECT
  USING (status = 'active');

-- Add track_id reference to campaigns (optional link)
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS track_id uuid REFERENCES public.tracks(id);
