
-- Create producer_applications table
CREATE TABLE public.producer_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  legal_name TEXT NOT NULL,
  stage_name TEXT,
  bio TEXT,
  genre TEXT,
  portfolio_url TEXT,
  soundcloud_url TEXT,
  website_url TEXT,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.producer_applications ENABLE ROW LEVEL SECURITY;

-- Anyone can submit (status must be pending)
CREATE POLICY "Anyone can submit producer application"
ON public.producer_applications
FOR INSERT
WITH CHECK (status = 'pending');

-- Admins can view all
CREATE POLICY "Admins can view producer applications"
ON public.producer_applications
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update
CREATE POLICY "Admins can update producer applications"
ON public.producer_applications
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));
