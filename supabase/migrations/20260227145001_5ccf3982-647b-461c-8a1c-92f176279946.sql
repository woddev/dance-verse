
-- Create function to insert into deals.producers on approval
CREATE OR REPLACE FUNCTION public.create_producer_record_on_approve(
  p_user_id UUID,
  p_legal_name TEXT,
  p_stage_name TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'deals'
AS $$
BEGIN
  INSERT INTO deals.producers (user_id, legal_name, stage_name, email)
  VALUES (p_user_id, p_legal_name, p_stage_name, p_email);
END;
$$;
