ALTER TABLE public.campaigns
  ADD COLUMN category text NOT NULL DEFAULT 'shorts',
  ADD COLUMN genre text NULL;