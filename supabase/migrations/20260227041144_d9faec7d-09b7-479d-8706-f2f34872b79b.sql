
-- Create storage bucket for deal track uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('deal-assets', 'deal-assets', false)
ON CONFLICT (id) DO NOTHING;

-- Producers can upload to their own folder
CREATE POLICY "Producers upload own assets" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'deal-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Producers can view own assets
CREATE POLICY "Producers view own assets" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'deal-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Admins full access to deal assets
CREATE POLICY "Admin deal assets" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'deal-assets' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'deal-assets' AND public.has_role(auth.uid(), 'admin'));
