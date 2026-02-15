
-- Update RLS policies to allow viewing completed campaigns
DROP POLICY "Anyone can view active campaigns" ON public.campaigns;
CREATE POLICY "Anyone can view active or completed campaigns" ON public.campaigns
  FOR SELECT USING (status IN ('active', 'completed'));

DROP POLICY "Authenticated users can view active campaigns" ON public.campaigns;
CREATE POLICY "Authenticated users can view active or completed campaigns" ON public.campaigns
  FOR SELECT USING (status IN ('active', 'completed') OR has_role(auth.uid(), 'admin'::app_role));
