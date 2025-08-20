-- Setup script for NCR attachments storage bucket in Supabase
-- Run this in the Supabase SQL editor

-- Create the storage bucket for NCR attachments if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ncr-attachments',
  'ncr-attachments', 
  true, -- Set to true for public access, false for authenticated only
  5242880, -- 5MB file size limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO UPDATE
SET 
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Create RLS policies for the bucket

-- Policy for authenticated users to upload files
CREATE POLICY "Authenticated users can upload NCR attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ncr-attachments');

-- Policy for authenticated users to view files
CREATE POLICY "Authenticated users can view NCR attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'ncr-attachments');

-- Policy for authenticated users to delete their own files
CREATE POLICY "Users can delete their own NCR attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'ncr-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- If you want public read access (for sharing NCR reports), uncomment this:
-- CREATE POLICY "Public can view NCR attachments"
-- ON storage.objects
-- FOR SELECT
-- TO anon
-- USING (bucket_id = 'ncr-attachments');

-- Verify the bucket was created
SELECT * FROM storage.buckets WHERE id = 'ncr-attachments';