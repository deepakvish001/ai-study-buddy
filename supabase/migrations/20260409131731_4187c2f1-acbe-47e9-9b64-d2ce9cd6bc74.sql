
-- Allow admins to insert roles for any user
CREATE POLICY "Admins can insert any role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete roles for any user
CREATE POLICY "Admins can delete any role"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update roles
CREATE POLICY "Admins can update any role"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Security definer function for managing roles safely
CREATE OR REPLACE FUNCTION public.manage_user_role(
  _target_user_id uuid,
  _role app_role,
  _action text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can manage roles';
  END IF;

  IF _action = 'add' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_target_user_id, _role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSIF _action = 'remove' THEN
    DELETE FROM public.user_roles
    WHERE user_id = _target_user_id AND role = _role;
  ELSE
    RAISE EXCEPTION 'Invalid action: %', _action;
  END IF;
END;
$$;

-- Add reviews_completed to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS reviews_completed integer NOT NULL DEFAULT 0;

-- Trigger to track review completions
CREATE OR REPLACE FUNCTION public.on_answer_reviewed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected') THEN
    -- The reviewer is the current authenticated user
    UPDATE public.profiles
    SET reviews_completed = reviews_completed + 1
    WHERE user_id = auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_answer_reviewed
BEFORE UPDATE ON public.answers
FOR EACH ROW
EXECUTE FUNCTION public.on_answer_reviewed();
