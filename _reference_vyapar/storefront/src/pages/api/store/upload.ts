import type { APIRoute } from 'astro';
import { supabaseAdmin, isSupabase } from '../../../lib/database';

export const POST: APIRoute = async ({ request }) => {
  try {
    if (!isSupabase || !supabaseAdmin) {
      return new Response(JSON.stringify({ success: false, error: 'Storage not configured' }), { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return new Response(JSON.stringify({ success: false, error: 'No file provided' }), { status: 400 });
    }

    // Restrict size for public uploads to 5MB
    if (file.size > 5 * 1024 * 1024) {
      return new Response(JSON.stringify({ success: false, error: 'File size exceeds 5MB limit.' }), { status: 400 });
    }

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];

    if (!allowedMimeTypes.includes(file.type) || !allowedExtensions.includes(fileExt)) {
      console.error('[PUBLIC UPLOAD] ❌ Invalid file type:', file.type, fileExt);
      return new Response(JSON.stringify({ success: false, error: 'Invalid file type. Only standard images and PDFs are allowed.' }), { status: 400 });
    }
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `customer-uploads/${fileName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('products')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Customer file upload error:', uploadError);
      return new Response(JSON.stringify({ success: false, error: 'Upload failed: ' + uploadError.message }), { status: 500 });
    }

    const { data: publicUrlData } = supabaseAdmin.storage.from('products').getPublicUrl(filePath);

    return new Response(JSON.stringify({ success: true, url: publicUrlData.publicUrl }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Customer upload catch error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
  }
};
