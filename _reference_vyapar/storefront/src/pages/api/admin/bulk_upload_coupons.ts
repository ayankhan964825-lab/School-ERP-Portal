import { TABLES } from '../../../lib/constants';
import type { APIRoute } from 'astro';
import { supabaseAdmin, isSupabase, logActivity } from '../../../lib/database';
import { getPermissionContext, canManageSection } from '../../../lib/permissions';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request, cookies , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    const ctx = getPermissionContext(cookies);
    if (!canManageSection(ctx, 'marketing')) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    const callerId = ctx.adminId;
    const callerName = ctx.adminName;
    try {
        const body = await request.json();
    
        
        if (!Array.isArray(body)) {
          return new Response(JSON.stringify({ error: 'Payload must be an array of coupons' }), { status: 400 });
        }
        
        // DoS Protection: Cap to 500 coupons per upload
        if (body.length > 500) {
          return new Response(JSON.stringify({ error: 'Maximum 500 coupons per upload request.' }), { status: 400 });
        }
    
        if (isSupabase && supabaseAdmin) {
          // Validate array
          const validItems = body.filter(c => c.code && c.discount_value);
          
          if (validItems.length === 0) {
            return new Response(JSON.stringify({ error: 'No valid coupons found. code and discount_value required.' }), { status: 400 });
          }
    
          const itemsToUpsert = validItems.map((c, index) => {
            return {
              id: c.id || 'CPN-' + Date.now() + '-' + index,
              store_id: locals.storeId, // Fix: Use middleware-verified store ID (NOT cookie-based ctx.storeId)
              code: c.code.toUpperCase(),
              discount_type: c.discount_type || 'percentage',
              discount_value: c.discount_value,
              min_order_amount: c.min_order_amount || 0,
              usage_limit: c.usage_limit || null,
              used_count: c.used_count || 0,
              is_active: c.is_active !== undefined ? c.is_active : true,
              max_discount_amount: c.max_discount_amount || 0,
              valid_from: c.valid_from || null,
              valid_until: c.valid_until || null,
              created_at: new Date().toISOString()
            };
          });
    
          const { data, error } = await supabaseAdmin.from(TABLES.COUPONS)
            .upsert(itemsToUpsert, { onConflict: 'code, store_id' })
            .select();
    
          if (error) {
            console.error('Supabase Bulk Coupons Upsert Error:', error);
            
            // Fallback to insert if onConflict fails
            if (error.code === '42P10') {
               const { data: insertData, error: insertError } = await supabaseAdmin.from(TABLES.COUPONS).insert(itemsToUpsert).select();
               if (insertError) {
                 return new Response(JSON.stringify({ error: insertError.message }), { status: 500 });
               }
               return new Response(JSON.stringify({ success: true, count: insertData.length }), { status: 200 });
            }
    
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
          }
    
          try { await logActivity(callerId, callerName, 'Bulk Uploaded Coupons', 'Bulk', { count: data.length }, request); } catch(e) {}
          return new Response(JSON.stringify({ success: true, count: data.length }), { status: 200 });
        } else {
          // Mock mode
          return new Response(JSON.stringify({ success: true, count: body.length }), { status: 200 });
        }
      } catch (error) {
        console.error('Bulk upload coupons error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
      }
  });
};
