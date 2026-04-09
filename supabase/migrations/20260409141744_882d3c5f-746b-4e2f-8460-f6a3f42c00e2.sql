ALTER TABLE public.answers
ADD COLUMN reviewed_by uuid DEFAULT NULL,
ADD COLUMN reviewed_at timestamp with time zone DEFAULT NULL;