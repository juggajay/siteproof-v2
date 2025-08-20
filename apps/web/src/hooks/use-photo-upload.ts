import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface PhotoUploadOptions {
  bucket?: string;
  path?: string;
  maxRetries?: number;
}

export function usePhotoUpload(options: PhotoUploadOptions = {}) {
  const { bucket = 'project-photos', path = '', maxRetries = 3 } = options;

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const supabase = createClient();

  const uploadPhotos = async (files: File[]): Promise<string[]> => {
    setIsUploading(true);
    setUploadProgress(0);

    const uploadedUrls: string[] = [];
    const totalFiles = files.length;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        let retries = 0;
        let uploaded = false;

        while (!uploaded && retries < maxRetries) {
          try {
            // Generate unique filename
            const timestamp = Date.now();
            const randomId = Math.random().toString(36).substring(7);
            const extension = file.name.split('.').pop();
            const fileName = `${path}/${timestamp}_${randomId}.${extension}`;

            // Upload to Supabase Storage
            const { error } = await supabase.storage.from(bucket).upload(fileName, file, {
              cacheControl: '3600',
              upsert: false,
            });

            if (error) throw error;

            // Get public URL
            const {
              data: { publicUrl },
            } = supabase.storage.from(bucket).getPublicUrl(fileName);

            uploadedUrls.push(publicUrl);
            uploaded = true;

            // Update progress
            setUploadProgress(Math.round(((i + 1) / totalFiles) * 100));
          } catch (error) {
            retries++;
            if (retries >= maxRetries) {
              throw new Error(`Failed to upload ${file.name} after ${maxRetries} attempts`);
            }
            // Wait before retry
            await new Promise((resolve) => setTimeout(resolve, 1000 * retries));
          }
        }
      }

      return uploadedUrls;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const deletePhoto = async (url: string): Promise<boolean> => {
    try {
      // Extract file path from URL
      const urlParts = url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `${path}/${fileName}`;

      const { error } = await supabase.storage.from(bucket).remove([filePath]);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Failed to delete photo:', error);
      return false;
    }
  };

  return {
    uploadPhotos,
    deletePhoto,
    isUploading,
    uploadProgress,
  };
}
