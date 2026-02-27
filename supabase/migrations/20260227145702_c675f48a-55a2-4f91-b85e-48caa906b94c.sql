
-- Create bucket for producer application demo files
INSERT INTO storage.buckets (id, name, public) VALUES ('producer-demos', 'producer-demos', false);

-- Anyone can upload a demo (no auth required, like the application itself)
CREATE POLICY "Anyone can upload producer demos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'producer-demos');

-- Admins can view demos
CREATE POLICY "Admins can view producer demos"
ON storage.objects FOR SELECT
USING (bucket_id = 'producer-demos' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- Add demo_url column to producer_applications
ALTER TABLE public.producer_applications ADD COLUMN demo_url text;
