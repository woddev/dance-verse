
-- Create storage bucket for promotion uploads (cover images and audio)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'promotion-uploads',
  'promotion-uploads',
  true,
  52428800, -- 50MB limit for audio files
  ARRAY['image/jpeg', 'image/png', 'audio/mpeg', 'audio/wav', 'audio/x-wav']
);

-- Allow anyone to upload to promotion-uploads bucket
CREATE POLICY "Anyone can upload promotion files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'promotion-uploads');

-- Allow public read access
CREATE POLICY "Anyone can read promotion files"
ON storage.objects FOR SELECT
USING (bucket_id = 'promotion-uploads');

-- Allow admins to delete
CREATE POLICY "Admins can delete promotion files"
ON storage.objects FOR DELETE
USING (bucket_id = 'promotion-uploads' AND public.has_role(auth.uid(), 'admin'));
