
DROP POLICY "System can insert notifications" ON public.notifications;

-- Triggers use SECURITY DEFINER and bypass RLS, so we only need
-- a policy for direct user inserts (which we don't allow)
CREATE POLICY "Authenticated users can insert own notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
