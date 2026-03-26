
-- Add extended metadata columns to tracks table
ALTER TABLE public.tracks
  ADD COLUMN IF NOT EXISTS internal_catalog_id text,
  ADD COLUMN IF NOT EXISTS isrc text,
  ADD COLUMN IF NOT EXISTS version_name text,
  ADD COLUMN IF NOT EXISTS master_owner text,
  ADD COLUMN IF NOT EXISTS publishing_owner text,
  ADD COLUMN IF NOT EXISTS master_split_percent numeric,
  ADD COLUMN IF NOT EXISTS publishing_split_percent numeric,
  ADD COLUMN IF NOT EXISTS pro_affiliation text,
  ADD COLUMN IF NOT EXISTS content_id_status text,
  ADD COLUMN IF NOT EXISTS sync_clearance text,
  ADD COLUMN IF NOT EXISTS sample_clearance text,
  ADD COLUMN IF NOT EXISTS energy_level text,
  ADD COLUMN IF NOT EXISTS vocal_type text,
  ADD COLUMN IF NOT EXISTS dance_style_fit jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS mood_tags jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS battle_friendly boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS choreography_friendly boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS freestyle_friendly boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS drop_time_seconds integer,
  ADD COLUMN IF NOT EXISTS counts text,
  ADD COLUMN IF NOT EXISTS available_versions jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS preview_url text,
  ADD COLUMN IF NOT EXISTS download_url text,
  ADD COLUMN IF NOT EXISTS usage_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revenue_generated numeric DEFAULT 0;

-- Create track_uploads table for import history logging
CREATE TABLE IF NOT EXISTS public.track_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  filename text NOT NULL,
  row_count integer NOT NULL DEFAULT 0,
  success_count integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.track_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage track_uploads" ON public.track_uploads
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
