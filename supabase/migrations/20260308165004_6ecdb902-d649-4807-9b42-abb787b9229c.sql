-- Update RLS policy to allow 'custom' payment_status on insert
DROP POLICY "Anyone can insert artist submissions" ON public.artist_submissions;
CREATE POLICY "Anyone can insert artist submissions" ON public.artist_submissions
  FOR INSERT
  WITH CHECK (
    payment_status IN ('unpaid', 'custom') AND review_status = 'pending'
  );