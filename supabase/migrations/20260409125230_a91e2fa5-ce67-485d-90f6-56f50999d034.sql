-- Add attachments column to questions
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;

-- Create storage bucket for question attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('question-attachments', 'question-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone can view attachments
CREATE POLICY "Attachments are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'question-attachments');

-- Authenticated users can upload to their own folder
CREATE POLICY "Users can upload their own attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'question-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can delete their own attachments
CREATE POLICY "Users can delete their own attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'question-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);