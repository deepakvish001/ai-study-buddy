
CREATE TYPE public.application_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE public.teacher_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  status application_status NOT NULL DEFAULT 'pending',
  message text,
  reviewed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, status)
);

ALTER TABLE public.teacher_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Applications viewable by everyone"
ON public.teacher_applications FOR SELECT USING (true);

CREATE POLICY "Users can create their own application"
ON public.teacher_applications FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update applications"
ON public.teacher_applications FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_teacher_applications_updated_at
BEFORE UPDATE ON public.teacher_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
