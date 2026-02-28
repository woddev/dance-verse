
-- Add first_name and last_name columns to deals.producers
ALTER TABLE deals.producers ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE deals.producers ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Update producer_submit_track to also accept first/last name and store them
CREATE OR REPLACE FUNCTION public.producer_submit_track(
  p_user_id UUID, p_title TEXT, p_bpm INT, p_genre TEXT, p_mood_tags TEXT,
  p_isrc TEXT, p_master_pct NUMERIC, p_publishing_pct NUMERIC,
  p_explicit BOOLEAN, p_file_url TEXT, p_artwork_url TEXT,
  p_first_name TEXT DEFAULT NULL, p_last_name TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, deals
AS $$
DECLARE
  v_pid UUID;
  v_track_id UUID;
BEGIN
  SELECT public.get_producer_id(p_user_id) INTO v_pid;
  IF v_pid IS NULL THEN RAISE EXCEPTION 'Producer record not found for user'; END IF;

  -- Update first/last name on producer record if provided
  IF p_first_name IS NOT NULL OR p_last_name IS NOT NULL THEN
    UPDATE deals.producers
    SET first_name = COALESCE(p_first_name, first_name),
        last_name = COALESCE(p_last_name, last_name),
        legal_name = TRIM(COALESCE(p_first_name, first_name, '') || ' ' || COALESCE(p_last_name, last_name, ''))
    WHERE id = v_pid;
  END IF;

  INSERT INTO deals.tracks (
    producer_id, title, bpm, genre, mood_tags, isrc,
    master_ownership_percent, publishing_ownership_percent,
    explicit_flag, file_url, artwork_url, status, created_by
  ) VALUES (
    v_pid, p_title, p_bpm, p_genre,
    CASE WHEN p_mood_tags IS NOT NULL THEN p_mood_tags::JSONB ELSE NULL END,
    p_isrc, p_master_pct, p_publishing_pct,
    p_explicit, p_file_url, p_artwork_url, 'submitted', p_user_id
  ) RETURNING id INTO v_track_id;

  INSERT INTO deals.track_state_history (track_id, previous_state, new_state, changed_by)
  VALUES (v_track_id, NULL, 'submitted', p_user_id);

  RETURN v_track_id;
END;
$$;
