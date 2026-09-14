import { TABLES } from '../../../lib/constants';
import { getPermissionContext, canManageSection } from '../../../lib/permissions';
import type { APIRoute } from 'astro';
import { supabaseAdmin, isSupabase } from '../../../lib/database';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request, cookies , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    const ctx = getPermissionContext(cookies);
    if (!canManageSection(ctx, 'feedback') && !canManageSection(ctx, 'store_front')) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    try {
        const body = await request.json();
        
        if (!Array.isArray(body)) {
          return new Response(JSON.stringify({ error: 'Payload must be an array of feedback items' }), { status: 400 });
        }

        if (body.length > 500) {
          return new Response(JSON.stringify({ error: 'Too many items. Maximum 500 allowed per request.' }), { status: 400 });
        }
    
        if (isSupabase && supabaseAdmin) {
          // Validate array
          const validItems = body.filter(c => c.subject || c.message);
          
          if (validItems.length === 0) {
            return new Response(JSON.stringify({ error: 'No valid feedback found. subject or message required.' }), { status: 400 });
          }
    
          const itemsToInsert = validItems.map((c, index) => {
            return {
              id: c.id || 'FB-BULK-' + Date.now() + '-' + index,
              store_id: ctx.storeId,
              name: c.name || 'Guest',
              email: c.email || '',
              subject: c.subject || 'No Subject',
              message: c.message || '',
              type: c.type === 'complaint' ? 'complaint' : 'feedback',
              status: 'open',
              created_at: new Date().toISOString()
            };
          });
    
          const { data, error } = await supabaseAdmin.from(TABLES.FEEDBACK).insert(itemsToInsert).select();
    
          if (error) {
            console.error('Supabase Bulk Feedback Insert Error:', error);
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
          }
    
          return new Response(JSON.stringify({ success: true, count: data.length }), { status: 200 });
        } else {
          // Mock mode
          return new Response(JSON.stringify({ success: true, count: body.length }), { status: 200 });
        }
      } catch (error) {
        console.error('Bulk upload feedback error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
      }
  });
};
