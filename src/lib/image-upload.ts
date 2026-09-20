import imageCompression from 'browser-image-compression';
import { supabase } from './supabaseClient';

/**
 * Compresses an image to WebP and uploads it to Supabase Storage.
 * @param file The image file from the input
 * @param bucketName Supabase bucket name (e.g., 'school-erp-assets')
 * @param folderPath Folder path within the bucket (e.g., 'teachers/profiles')
 * @returns The public URL of the uploaded image
 */
export async function uploadImageAsWebP(file: File, bucketName: string, folderPath: string): Promise<string> {
  try {
    // 1. Compress & Convert to WebP
    const options = {
      maxSizeMB: 1, // Max size 1MB
      maxWidthOrHeight: 1024,
      useWebWorker: true,
      fileType: 'image/webp' as any, // Output format
    };

    const compressedFile = await imageCompression(file, options);
    
    // 2. Generate a unique filename
    const uniqueId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(7);
    const fileName = `${folderPath}/${uniqueId}.webp`;
    
    // 3. Upload to Supabase Storage
    const { data, error } = await supabase
      .storage
      .from(bucketName)
      .upload(fileName, compressedFile, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'image/webp'
      });

    if (error) {
      console.error('Supabase upload error:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }

    // 4. Get Public URL
    const { data: publicUrlData } = supabase
      .storage
      .from(bucketName)
      .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Error in uploadImageAsWebP:', error);
    throw error;
  }
}
