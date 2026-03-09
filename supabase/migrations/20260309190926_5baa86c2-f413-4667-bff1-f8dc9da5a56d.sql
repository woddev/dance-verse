
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_intended_role TEXT;
BEGIN
  v_intended_role := NEW.raw_user_meta_data->>'intended_role';

  IF v_intended_role = 'producer' THEN
    INSERT INTO public.profiles (id, application_status)
    VALUES (NEW.id, 'none');
  ELSIF v_intended_role = 'partner' THEN
    -- Partner signup: create profile, assign partner role
    INSERT INTO public.profiles (id, application_status)
    VALUES (NEW.id, 'none');
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'partner');
  ELSE
    INSERT INTO public.profiles (id, application_status)
    VALUES (NEW.id, 'approved');
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'dancer');
  END IF;

  RETURN NEW;
END;
$$;
