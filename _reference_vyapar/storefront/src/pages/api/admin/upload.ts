import { TABLES } from '../../../lib/constants';
import { getPermissionContext, canManageSection } from '../../../lib/permissions';
import type { APIRoute } from 'astro';
import { supabaseAdmin, isSupabase } from '../../../lib/database';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    console.log('[UPLOAD] ── START ──');
    console.log('[UPLOAD] locals.storeId:', locals.storeId);
    console.log('[UPLOAD] admin_store cookie:', cookies.get('admin_store')?.value);
    console.log('[UPLOAD] admin_role cookie:', cookies.get('admin_role')?.value);
    console.log('[UPLOAD] admin_id cookie:', cookies.get('admin_id')?.value);
    const ctx = getPermissionContext(cookies);
    console.log('[UPLOAD] Permission ctx:', { adminRole: ctx.adminRole, storeId: ctx.storeId, permissions: ctx.permissions });
    const canProducts = canManageSection(ctx, 'products');
    const canSettings = canManageSection(ctx, 'settings');
    console.log('[UPLOAD] canManage products:', canProducts, '| settings:', canSettings);
    if (!canProducts && !canSettings) {
        console.error('[UPLOAD] ❌ FORBIDDEN — no products/settings permission');
        return new Response(JSON.stringify({ success: false, error: 'Forbidden: You do not have permission to upload.' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    if (!isSupabase || !supabaseAdmin) {
        console.error('[UPLOAD] ❌ Supabase not configured');
        return new Response(JSON.stringify({ success: false, error: 'Supabase is not configured properly.' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        console.log('[UPLOAD] File received:', file ? `${file.name} (${file.size} bytes, ${file.type})` : 'NULL');
        
        if (!file) {
          console.error('[UPLOAD] ❌ No file in FormData');
          return new Response(JSON.stringify({ success: false, error: 'No file provided' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
    
        const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit
        if (file.size > MAX_FILE_SIZE) {
          console.error('[UPLOAD] ❌ File too large:', file.size);
          return new Response(JSON.stringify({ success: false, error: 'File size exceeds 5MB limit.' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'application/json'];
        const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
        const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'webm', 'json', 'lottie'];

        if (!allowedMimeTypes.includes(file.type) || !allowedExtensions.includes(fileExt)) {
          console.error('[UPLOAD] ❌ Invalid file type:', file.type, fileExt);
          return new Response(JSON.stringify({ success: false, error: 'Invalid file type. Only standard images, videos, and Lottie animations (JSON) are allowed.' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
    
        const buffer = await file.arrayBuffer();
        console.log('[UPLOAD] ArrayBuffer length:', buffer.byteLength);

        // Validation for Lottie JSON files
        if (fileExt === 'json' || file.type === 'application/json') {
          try {
            const text = new TextDecoder().decode(buffer);
            const parsed = JSON.parse(text);
            // Basic Lottie validation: check for 'v' (version) and 'layers' (array)
            if (!parsed.v || !Array.isArray(parsed.layers)) {
              console.error('[UPLOAD] ❌ JSON is not a valid Lottie animation');
              return new Response(JSON.stringify({ success: false, error: 'The uploaded JSON file does not appear to be a valid Lottie animation. Please upload a real Lottie file.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
              });
            }
          } catch (e) {
             console.error('[UPLOAD] ❌ JSON parsing failed', e);
             return new Response(JSON.stringify({ success: false, error: 'The uploaded file is not a valid JSON format.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
              });
          }
        }
    
        // Generate unique filename isolated to the tenant
        const storeId = (locals.storeId as string) || 'unknown';
        const ext = file.name.split('.').pop() || 'webp';
        const filename = `${storeId}/${Date.now()}_${Math.random().toString(36).substring(2, 10)}.${ext}`;
        console.log('[UPLOAD] Upload path:', filename);
    
        // Fetch settings to check for R2 configuration
        const { getSettings } = await import('../../../lib/database');
        const settings = await getSettings(storeId);
        
        let publicUrl = '';

        const r2AccountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID || (import.meta as any).env?.CLOUDFLARE_R2_ACCOUNT_ID;
        const r2AccessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || (import.meta as any).env?.CLOUDFLARE_R2_ACCESS_KEY_ID;
        const r2SecretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || (import.meta as any).env?.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
        const r2BucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || (import.meta as any).env?.CLOUDFLARE_R2_BUCKET_NAME;
        const r2CustomDomain = process.env.CLOUDFLARE_R2_CUSTOM_DOMAIN || (import.meta as any).env?.CLOUDFLARE_R2_CUSTOM_DOMAIN;

        if (r2AccountId && r2AccessKeyId && r2SecretAccessKey && r2BucketName && r2CustomDomain) {
          console.log('[UPLOAD] Uploading to Cloudflare R2...');
          const { uploadToR2 } = await import('../../../lib/r2');
          publicUrl = await uploadToR2({
            accountId: r2AccountId,
            accessKeyId: r2AccessKeyId,
            secretAccessKey: r2SecretAccessKey,
            bucketName: r2BucketName,
            customDomain: r2CustomDomain
          }, filename, buffer, file.type || 'image/webp');
          console.log('[UPLOAD] ✅ R2 upload success:', publicUrl);
        } else {
          console.log('[UPLOAD] Uploading to Supabase Storage...');
          // Upload to 'products' bucket
          const { data, error } = await supabaseAdmin.storage
            .from(TABLES.PRODUCTS)
            .upload(filename, buffer, {
              contentType: file.type || 'image/webp',
              cacheControl: '31536000',
              upsert: false
            });
      
          if (error) {
            console.error('[UPLOAD] ❌ Supabase Storage error:', JSON.stringify(error));
            return new Response(JSON.stringify({ success: false, error: `Storage error: ${error.message}` }), {
              status: 500,
              headers: { 'Content-Type': 'application/json' }
            });
          }
      
          console.log('[UPLOAD] ✅ Supabase upload success:', data?.path);
      
          // Get public URL
          const { data: publicUrlData } = supabaseAdmin.storage
            .from(TABLES.PRODUCTS)
            .getPublicUrl(filename);
          
          publicUrl = publicUrlData.publicUrl;
          console.log('[UPLOAD] ✅ Public URL:', publicUrl);
        }
        
        return new Response(JSON.stringify({ 
          success: true, 
          url: publicUrl 
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
    
      } catch (err: any) {
        console.error('[UPLOAD] ❌ CRASH:', err);
        return new Response(JSON.stringify({ success: false, error: err.message || 'Upload failed' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
  });
};
