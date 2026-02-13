-- Public applications table for unauthenticated dancer applications
CREATE TABLE public.applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  bio TEXT,
  instagram_handle TEXT,
  tiktok_handle TEXT,
  youtube_handle TEXT,
  dance_style TEXT,
  years_experience INTEGER,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (public form)
CREATE POLICY "Anyone can submit an application"
ON public.applications
FOR INSERT
WITH CHECK (true);

-- Only admins can view/update applications
CREATE POLICY "Admins can view all applications"
ON public.applications
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update applications"
ON public.applications
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Unique constraint on email to prevent duplicate applications
CREATE UNIQUE INDEX idx_applications_email_pending ON public.applications (email) WHERE status = 'pending';