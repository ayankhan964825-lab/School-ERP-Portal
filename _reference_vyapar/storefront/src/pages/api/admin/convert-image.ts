import { getPermissionContext, canManageSection } from '../../../lib/permissions';
import type { APIRoute } from 'astro';
import { storeContext } from "../../../lib/storeContext";

/**
 * Image Converter API
 * POST /api/admin/convert-image
 * Accepts: multipart/form-data with 'file' field (image/*)
 * Returns: WebP binary with Content-Type: image/webp
 *
 * Uses the browser's built-in Canvas API via a server-side approach.
 * For Vercel/Node, we use the 'sharp' library if available,
 * otherwise falls through with the original file.
 */
export const POST: APIRoute = async ({ request, cookies , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    const ctx = getPermissionContext(cookies);
    if (!canManageSection(ctx, 'products')) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
    
        if (!file) {
          return new Response(JSON.stringify({ error: 'No file provided' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }
    
        // Validate it's an image
        if (!file.type.startsWith('image/')) {
          return new Response(JSON.stringify({ error: 'File must be an image' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }
    
        // Max 10MB
        if (file.size > 10 * 1024 * 1024) {
          return new Response(JSON.stringify({ error: 'File too large (max 10MB)' }), {
            status: 413,
            headers: { 'Content-Type': 'application/json' },
          });
        }
    
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
    
        // Try sharp (available on Vercel Node runtime)
        try {
          const sharp = (await import('sharp')).default;
          const webpBuffer = await sharp(buffer)
            .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 85, effort: 4 })
            .toBuffer();
    
          const originalName = file.name.replace(/\.[^.]+$/, '');
          return new Response(webpBuffer, {
            status: 200,
            headers: {
              'Content-Type': 'image/webp',
              'Content-Disposition': `attachment; filename="${originalName}.webp"`,
              'Content-Length': webpBuffer.length.toString(),
              'X-Original-Size': buffer.length.toString(),
              'X-Converted-Size': webpBuffer.length.toString(),
            },
          });
        } catch (sharpError) {
          // sharp not installed — return original file with info header
          console.warn('[convert-image] sharp not available, returning original file');
          return new Response(buffer, {
            status: 200,
            headers: {
              'Content-Type': file.type,
              'Content-Disposition': `attachment; filename="${file.name}"`,
              'X-Convert-Note': 'sharp not installed; install with: npm install sharp',
            },
          });
        }
      } catch (err) {
        console.error('[convert-image] Error:', err);
        return new Response(JSON.stringify({ error: 'Conversion failed' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
  });
};
