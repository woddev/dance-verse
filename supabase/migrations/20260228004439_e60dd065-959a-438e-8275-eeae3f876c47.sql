
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_intended_role TEXT;
BEGIN
  -- Read intended role from signup metadata
  v_intended_role := NEW.raw_user_meta_data->>'intended_role';

  IF v_intended_role = 'producer' THEN
    -- Producer signup: create profile with 'none' status, do NOT assign dancer role
    INSERT INTO public.profiles (id, application_status)
    VALUES (NEW.id, 'none');
  ELSE
    -- Dancer signup (or unspecified): create profile with 'approved' status and assign dancer role
    INSERT INTO public.profiles (id, application_status)
    VALUES (NEW.id, 'approved');

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'dancer');
  END IF;

  RETURN NEW;
END;
$$;
