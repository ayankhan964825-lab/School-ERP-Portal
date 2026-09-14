import { getPermissionContext, canManageSection } from '../../../lib/permissions';
import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/database';
import { storeContext } from "../../../lib/storeContext";

export const DELETE: APIRoute = async ({ request, cookies , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    const ctx = getPermissionContext(cookies);
    if (!canManageSection(ctx, 'orders')) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    try {
        const body = await request.json();
        const { orderId } = body;
        
        if (!orderId) {
          return new Response(JSON.stringify({ error: 'Missing orderId parameter' }), { status: 400 });
        }
        
        if (!supabaseAdmin) {
           return new Response(JSON.stringify({ error: 'Database admin connection not configured' }), { status: 500 });
        }

        const { data: orderData } = await supabaseAdmin
            .from('orders')
            .select('master_order_id')
            .eq('order_id', orderId)
            .single();

        const { error: orderError } = await supabaseAdmin
            .from('orders')
            .delete()
            .eq('order_id', orderId);
            
        if (orderError) throw orderError;
        
        if (orderData?.master_order_id) {
            const { data: remaining } = await supabaseAdmin
                .from('orders')
                .select('order_id')
                .eq('master_order_id', orderData.master_order_id);
                
            if (!remaining || remaining.length === 0) {
                await supabaseAdmin
                    .from('master_orders')
                    .delete()
                    .eq('id', orderData.master_order_id);
            }
        }
        
        return new Response(JSON.stringify({ success: true }), { status: 200 });
        
      } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), { status: 500 });
      }
  });
};
