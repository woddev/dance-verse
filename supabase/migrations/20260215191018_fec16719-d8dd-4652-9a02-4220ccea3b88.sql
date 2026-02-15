
ALTER TABLE public.submissions ADD COLUMN comment_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.submissions ADD COLUMN like_count integer NOT NULL DEFAULT 0;
