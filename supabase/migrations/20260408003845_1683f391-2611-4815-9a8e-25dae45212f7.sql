
-- Fix: assign producer role in handle_new_user trigger
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
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'producer');
  ELSIF v_intended_role = 'partner' THEN
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

-- Also fix the existing user who signed up but didn't get the role
INSERT INTO public.user_roles (user_id, role)
VALUES ('e4aea36f-6396-48c7-aff3-4c9f4d937a0a', 'producer')
ON CONFLICT (user_id, role) DO NOTHING;
