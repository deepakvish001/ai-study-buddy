
-- Notifications table
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

-- System can insert notifications (via triggers with SECURITY DEFINER)
CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

CREATE INDEX idx_notifications_user_unread ON public.notifications (user_id, is_read) WHERE is_read = false;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Trigger: notify question owner when a new answer is posted
CREATE OR REPLACE FUNCTION public.notify_on_new_answer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q_owner uuid;
  q_title text;
BEGIN
  SELECT user_id, title INTO q_owner, q_title FROM public.questions WHERE id = NEW.question_id;
  IF q_owner IS NOT NULL AND q_owner != COALESCE(NEW.user_id, '00000000-0000-0000-0000-000000000000') THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (q_owner, 'new_answer', 'New answer on your question',
      'Someone answered: ' || LEFT(q_title, 80),
      '/question/' || NEW.question_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_answer
AFTER INSERT ON public.answers
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_new_answer();

-- Trigger: notify answer owner when a new comment is posted
CREATE OR REPLACE FUNCTION public.notify_on_new_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a_owner uuid;
  q_id uuid;
BEGIN
  SELECT user_id, question_id INTO a_owner, q_id FROM public.answers WHERE id = NEW.answer_id;
  IF a_owner IS NOT NULL AND a_owner != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (a_owner, 'new_comment', 'New comment on your answer',
      LEFT(NEW.body, 80),
      '/question/' || q_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_comment
AFTER INSERT ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_new_comment();

-- Trigger: notify applicant when teacher application status changes
CREATE OR REPLACE FUNCTION public.notify_on_application_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected') THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (NEW.user_id, 'application_' || NEW.status,
      CASE WHEN NEW.status = 'approved' THEN 'Application Approved! 🎉' ELSE 'Application Update' END,
      CASE WHEN NEW.status = 'approved' THEN 'You are now a teacher/mentor! You have access to the review queue.'
           ELSE 'Your teacher application was not approved this time. Keep building your reputation!' END,
      '/profile');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_application_status
AFTER UPDATE ON public.teacher_applications
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_application_status();
