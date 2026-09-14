import type { APIRoute } from 'astro';
import { supabaseAdmin, updateOrderStatus } from '../../../lib/database';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    console.log('[Dunzo Webhook] Received:', body);

    const { task_id, state } = body;
    if (!task_id || !state) return new Response(JSON.stringify({ error: 'Missing payload' }), { status: 400 });

    let riderStatus = 'assigned';
    let fulfillmentStatus = 'shipped';

    if (state === 'reached_for_pickup') riderStatus = 'at_store';
    else if (state === 'picked_up') riderStatus = 'out_for_delivery';
    else if (state === 'delivered') { riderStatus = 'delivered'; fulfillmentStatus = 'delivered'; }
    else if (state === 'cancelled') riderStatus = 'failed';

    const { data: fulfillments } = await supabaseAdmin.from('fulfillments').select('id, order_id, store_id').eq('awb_number', task_id).eq('courier_name', 'Dunzo');
    if (fulfillments && fulfillments.length > 0) {
        const fulfillment = fulfillments[0];
        await supabaseAdmin.from('fulfillments').update({ rider_status: riderStatus, updated_at: new Date().toISOString() }).eq('id', fulfillment.id).eq('store_id', fulfillment.store_id);
        await updateOrderStatus(fulfillment.order_id, fulfillmentStatus, fulfillment.store_id, fulfillment.id);
    } else {
        const { data: order } = await supabaseAdmin.from('orders').select('order_id, store_id').eq('awb_number', task_id).eq('courier_partner', 'Dunzo').single();
        if (order) await updateOrderStatus(order.order_id, fulfillmentStatus, order.store_id);
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (e: any) {
    console.error('Dunzo Error:', e);
    return new Response(JSON.stringify({ error: 'Internal Error' }), { status: 500 });
  }
};
