import type { APIRoute } from 'astro';
import { supabaseAdmin, isSupabase } from '../../../lib/database';
import { getPermissionContext } from '../../../lib/permissions';

export const POST: APIRoute = async ({ request, locals, cookies }) => {
  try {
    const storeId = locals.storeId;
    if (!storeId) return new Response(JSON.stringify({ error: 'Store ID missing' }), { status: 400 });

    const ctx = getPermissionContext(cookies);
    if (ctx.adminRole !== 'super_admin' && ctx.permissions['orders'] !== 'manage') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
    }

    const { orderId, riderName, riderPhone } = await request.json();
    if (!orderId || !riderName || !riderPhone) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    if (isSupabase && supabaseAdmin) {
      // Find the actual rider ID based on phone number to ensure Rider App visibility
      let finalRiderId = null;
      const { data: riders } = await supabaseAdmin.from('riders')
        .select('id')
        .eq('phone', riderPhone)
        .eq('store_id', storeId)
        .single();
      
      if (riders) {
        finalRiderId = riders.id;
      }

      // Update existing fulfillment for the rider
      const { error: fError } = await supabaseAdmin.from('fulfillments')
        .update({
          delivery_type: 'q_commerce_inhouse',
          status: 'shipped', // Assigning a rider means it's out for delivery/shipped
          awb_number: `RIDER-${riderPhone.slice(-4)}`,
          rider_name: riderName,
          rider_phone: riderPhone,
          rider_status: 'assigned',
          tracking_url: null,
          updated_at: new Date().toISOString()
        })
        .eq('order_id', orderId)
        .eq('store_id', storeId);

      if (fError) throw fError;

      // Update main order
      const orderUpdatePayload: any = {
        delivery_partner_name: riderName,
        delivery_partner_phone: riderPhone,
        status: 'shipped'
      };

      if (finalRiderId) {
        orderUpdatePayload.rider_id = finalRiderId;
      }

      const { error: oError } = await supabaseAdmin
        .from('orders')
        .update(orderUpdatePayload)
        .eq('order_id', orderId)
        .eq('store_id', storeId);
      
      if (oError) throw oError;

      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    return new Response(JSON.stringify({ error: 'Database not configured' }), { status: 500 });
  } catch (error: any) {
    console.error('Assign rider error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
