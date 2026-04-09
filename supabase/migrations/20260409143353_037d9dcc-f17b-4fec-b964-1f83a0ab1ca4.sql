CREATE OR REPLACE FUNCTION public.notify_on_ai_answer_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  q_owner uuid;
  q_title text;
BEGIN
  -- Only fire when an AI answer moves from pending to approved
  IF OLD.is_ai = true AND OLD.status = 'pending' AND NEW.status = 'approved' THEN
    SELECT user_id, title INTO q_owner, q_title FROM public.questions WHERE id = NEW.question_id;
    IF q_owner IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (
        q_owner,
        'ai_answer_approved',
        'Your question has a verified answer! ✅',
        'A teacher approved the AI answer on: ' || LEFT(q_title, 80),
        '/question/' || NEW.question_id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_on_ai_answer_approved
  AFTER UPDATE ON public.answers
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_ai_answer_approved();