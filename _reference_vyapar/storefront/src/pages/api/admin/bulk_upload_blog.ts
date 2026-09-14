import { TABLES } from '../../../lib/constants';
import { getPermissionContext, canManageSection } from '../../../lib/permissions';
import type { APIRoute } from 'astro';
import { supabaseAdmin, isSupabase } from '../../../lib/database';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request, cookies , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    const ctx = getPermissionContext(cookies);
    if (!canManageSection(ctx, 'blog')) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    try {
        const body = await request.json();
        
        if (!Array.isArray(body)) {
          return new Response(JSON.stringify({ error: 'Payload must be an array of blog posts' }), { status: 400 });
        }
    
        if (isSupabase && supabaseAdmin) {
          // Validate array
          const validItems = body.filter(c => c.title && c.slug);
          
          if (validItems.length === 0) {
            return new Response(JSON.stringify({ error: 'No valid posts found. title and slug are required.' }), { status: 400 });
          }
    
          const itemsToUpsert = validItems.map((c, index) => {
            return {
              id: c.id || 'BLOG-' + Date.now() + '-' + index,
              store_id: ctx.storeId,
              title: c.title,
              slug: c.slug,
              excerpt: c.excerpt || '',
              content: c.content || '',
              author: c.author || 'Admin',
              tags: Array.isArray(c.tags) ? c.tags : [],
              image_url: c.image_url || '',
              created_at: new Date().toISOString()
            };
          });
    
          const { data, error } = await supabaseAdmin.from(TABLES.BLOG_POSTS)
            .upsert(itemsToUpsert, { onConflict: 'slug, store_id' })
            .select();
    
          if (error) {
            console.error('Supabase Bulk Blog Upsert Error:', error);
            
            // Fallback to insert if onConflict fails
            if (error.code === '42P10') {
               const { data: insertData, error: insertError } = await supabaseAdmin.from(TABLES.BLOG_POSTS).insert(itemsToUpsert).select();
               if (insertError) {
                 return new Response(JSON.stringify({ error: insertError.message }), { status: 500 });
               }
               return new Response(JSON.stringify({ success: true, count: insertData.length }), { status: 200 });
            }
    
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
          }
    
          return new Response(JSON.stringify({ success: true, count: data.length }), { status: 200 });
        } else {
          // Mock mode
          return new Response(JSON.stringify({ success: true, count: body.length }), { status: 200 });
        }
      } catch (error) {
        console.error('Bulk upload blog error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
      }
  });
};
