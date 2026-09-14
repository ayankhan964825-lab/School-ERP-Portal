import { TABLES } from '../../../lib/constants';
import { getPermissionContext, canManageSection } from '../../../lib/permissions';
import type { APIRoute } from 'astro';
import { supabaseAdmin, isSupabase } from '../../../lib/database';
import crypto from 'node:crypto';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    const ctx = getPermissionContext(cookies);
    if (!canManageSection(ctx, 'settings')) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    if (!isSupabase || !supabaseAdmin) {
        return new Response(JSON.stringify({ error: 'Supabase is not configured properly.' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    try {
        const body = await request.json();
        const { folder = 'videos', filename } = body;
        
        if (!filename) {
          return new Response(JSON.stringify({ error: 'Filename is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
    
        const ext = filename.split('.').pop() || 'mp4';
        const storeId = locals.storeId || 'unknown';
        const uniqueFilename = `${storeId}/${folder}/${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
    
        // Create signed upload URL
        const { getSettings } = await import('../../../lib/database');
        const settings = await getSettings(storeId);
        
        const r2AccountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID || (import.meta as any).env?.CLOUDFLARE_R2_ACCOUNT_ID;
        const r2AccessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || (import.meta as any).env?.CLOUDFLARE_R2_ACCESS_KEY_ID;
        const r2SecretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || (import.meta as any).env?.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
        const r2BucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || (import.meta as any).env?.CLOUDFLARE_R2_BUCKET_NAME;
        const r2CustomDomain = process.env.CLOUDFLARE_R2_CUSTOM_DOMAIN || (import.meta as any).env?.CLOUDFLARE_R2_CUSTOM_DOMAIN;

        if (r2AccountId && r2AccessKeyId && r2SecretAccessKey && r2BucketName && r2CustomDomain) {
          console.log('[UPLOAD] Uploading to Cloudflare R2...');
          const { getR2SignedUrl } = await import('../../../lib/r2');
          
          // Use 'video/mp4' as a safe default if mime type is unknown
          const contentType = ext === 'webm' ? 'video/webm' : 'video/mp4';
          
          const r2Data = await getR2SignedUrl({
            accountId: r2AccountId,
            accessKeyId: r2AccessKeyId,
            secretAccessKey: r2SecretAccessKey,
            bucketName: r2BucketName,
            customDomain: r2CustomDomain
          }, uniqueFilename, contentType, 3600);
          
          return new Response(JSON.stringify({ 
            success: true, 
            signedUrl: r2Data.signedUrl,
            token: 'r2-presigned', // Frontend might expect a token, passing dummy for compatibility
            path: uniqueFilename,
            publicUrl: r2Data.publicUrl
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        // Fallback to Supabase
        const { data, error } = await supabaseAdmin.storage
          .from(TABLES.PRODUCTS)
          .createSignedUploadUrl(uniqueFilename);
    
        if (error) {
          throw error;
        }
    
        const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/products/${uniqueFilename}`;
    
        return new Response(JSON.stringify({ 
          success: true, 
          signedUrl: data.signedUrl,
          token: data.token,
          path: data.path,
          publicUrl
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error: any) {
        console.error('Video upload URL generation error:', error);
        return new Response(JSON.stringify({ error: error.message || 'Failed to generate upload URL' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
  });
};
