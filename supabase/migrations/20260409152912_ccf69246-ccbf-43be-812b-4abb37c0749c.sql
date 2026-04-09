
-- Allow admins to delete any question
CREATE POLICY "Admins can delete any question"
ON public.questions
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete any answer
CREATE POLICY "Admins can delete any answer"
ON public.answers
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
