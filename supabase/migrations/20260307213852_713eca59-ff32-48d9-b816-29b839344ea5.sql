
-- Fix overly permissive INSERT policy on inquiries
DROP POLICY IF EXISTS "Anyone can insert inquiries" ON public.inquiries;
CREATE POLICY "Anyone can insert inquiries" ON public.inquiries
FOR INSERT
WITH CHECK (status = 'new'::text);
