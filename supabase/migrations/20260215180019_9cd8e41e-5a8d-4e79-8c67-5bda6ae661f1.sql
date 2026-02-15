
-- Drop the overly permissive policy
DROP POLICY "Anyone can submit an application" ON public.applications;

-- Recreate with a tighter check: only allow inserting with pending status
CREATE POLICY "Anyone can submit an application"
ON public.applications
FOR INSERT
TO anon, authenticated
WITH CHECK (status = 'pending');
