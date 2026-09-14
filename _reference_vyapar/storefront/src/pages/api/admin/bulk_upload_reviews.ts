import { TABLES } from '../../../lib/constants';
import { getPermissionContext, canManageSection } from '../../../lib/permissions';
import type { APIRoute } from 'astro';
import { supabaseAdmin, isSupabase } from '../../../lib/database';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request, cookies , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    const ctx = getPermissionContext(cookies);
    if (!canManageSection(ctx, 'reviews') && !canManageSection(ctx, 'store_front')) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    try {
        const body = await request.json();
        
        if (!Array.isArray(body)) {
          return new Response(JSON.stringify({ error: 'Payload must be an array of reviews' }), { status: 400 });
        }
    
        if (isSupabase && supabaseAdmin) {
          // DoS Protection: Cap to 500 reviews per upload
          if (body.length > 500) {
            return new Response(JSON.stringify({ error: 'Maximum 500 reviews per upload request.' }), { status: 400 });
          }

          // Validate array
          const validItems = body.filter(c => c.customer_name && c.comment);
          
          if (validItems.length === 0) {
            return new Response(JSON.stringify({ error: 'No valid reviews found. customer_name and comment are required.' }), { status: 400 });
          }
    
          const itemsToInsert = validItems.map((c, index) => {
            return {
              id: c.id || 'REV-BULK-' + Date.now() + '-' + index,
              store_id: locals.storeId, // Use middleware-verified store ID (NOT cookie-based ctx.storeId)
              customer_name: c.customer_name || 'Guest',
              rating: c.rating || 5,
              comment: c.comment || '',
              product_id: c.product_id || null,
              status: 'pending',
              created_at: new Date().toISOString()
            };
          });
    
          const { data, error } = await supabaseAdmin.from(TABLES.REVIEWS).insert(itemsToInsert).select();
    
          if (error) {
            console.error('Supabase Bulk Reviews Insert Error:', error);
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
          }
    
          return new Response(JSON.stringify({ success: true, count: data.length }), { status: 200 });
        } else {
          // Mock mode
          return new Response(JSON.stringify({ success: true, count: body.length }), { status: 200 });
        }
      } catch (error) {
        console.error('Bulk upload reviews error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
      }
  });
};
