-- Add reputation column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS reputation integer NOT NULL DEFAULT 0;

-- Function to update reputation when a question is asked
CREATE OR REPLACE FUNCTION public.on_question_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles SET reputation = reputation + 5 WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_question_reputation
AFTER INSERT ON public.questions
FOR EACH ROW
EXECUTE FUNCTION public.on_question_created();

-- Function to update reputation when an answer is posted (non-AI)
CREATE OR REPLACE FUNCTION public.on_answer_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NOT NULL AND NEW.is_ai = false THEN
    UPDATE public.profiles SET reputation = reputation + 10 WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_answer_reputation
AFTER INSERT ON public.answers
FOR EACH ROW
EXECUTE FUNCTION public.on_answer_created();

-- Function to update reputation on votes
CREATE OR REPLACE FUNCTION public.on_vote_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  answer_owner uuid;
  delta integer;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT user_id INTO answer_owner FROM public.answers WHERE id = OLD.answer_id;
    IF answer_owner IS NOT NULL THEN
      delta := CASE WHEN OLD.vote_type = 'up' THEN -2 ELSE 1 END;
      UPDATE public.profiles SET reputation = reputation + delta WHERE user_id = answer_owner;
    END IF;
    RETURN OLD;
  ELSE
    SELECT user_id INTO answer_owner FROM public.answers WHERE id = NEW.answer_id;
    IF answer_owner IS NOT NULL THEN
      delta := CASE WHEN NEW.vote_type = 'up' THEN 2 ELSE -1 END;
      UPDATE public.profiles SET reputation = reputation + delta WHERE user_id = answer_owner;
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

CREATE TRIGGER trg_vote_reputation
AFTER INSERT OR DELETE ON public.votes
FOR EACH ROW
EXECUTE FUNCTION public.on_vote_change();

-- Function to update reputation when answer is accepted
CREATE OR REPLACE FUNCTION public.on_answer_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_accepted = true AND OLD.is_accepted = false AND NEW.user_id IS NOT NULL THEN
    UPDATE public.profiles SET reputation = reputation + 15 WHERE user_id = NEW.user_id;
  END IF;
  IF NEW.is_accepted = false AND OLD.is_accepted = true AND NEW.user_id IS NOT NULL THEN
    UPDATE public.profiles SET reputation = reputation - 15 WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_accept_reputation
AFTER UPDATE OF is_accepted ON public.answers
FOR EACH ROW
EXECUTE FUNCTION public.on_answer_accepted();