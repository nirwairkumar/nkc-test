-- Create storage bucket for AI user uploaded files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('ai-user-uploads', 'ai-user-uploads', true) 
ON CONFLICT (id) DO NOTHING;

-- Policies for public read and upload access
CREATE POLICY "Public Read AI User Uploads" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'ai-user-uploads');

CREATE POLICY "Allow Insert AI User Uploads" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'ai-user-uploads');
