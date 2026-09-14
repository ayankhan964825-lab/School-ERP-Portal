import type { APIRoute } from 'astro';
import { supabaseAdmin, updateOrderStatus } from '../../../lib/database';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    console.log('[Shadowfax Webhook] Received:', body);

    const { order_id, order_state } = body;
    if (!order_id || !order_state) return new Response(JSON.stringify({ error: 'Missing payload' }), { status: 400 });

    let riderStatus = 'assigned';
    let fulfillmentStatus = 'shipped';

    if (order_state === 'RIDER_AT_STORE') riderStatus = 'at_store';
    else if (order_state === 'OUT_FOR_DELIVERY') riderStatus = 'out_for_delivery';
    else if (order_state === 'DELIVERED') { riderStatus = 'delivered'; fulfillmentStatus = 'delivered'; }
    else if (order_state === 'RTO' || order_state === 'CANCELLED') riderStatus = 'failed';

    const { data: fulfillments } = await supabaseAdmin.from('fulfillments').select('id, order_id, store_id').eq('awb_number', order_id).eq('courier_name', 'Shadowfax');
    if (fulfillments && fulfillments.length > 0) {
        const fulfillment = fulfillments[0];
        await supabaseAdmin.from('fulfillments').update({ rider_status: riderStatus, updated_at: new Date().toISOString() }).eq('id', fulfillment.id).eq('store_id', fulfillment.store_id);
        await updateOrderStatus(fulfillment.order_id, fulfillmentStatus, fulfillment.store_id, fulfillment.id);
    } else {
        const { data: order } = await supabaseAdmin.from('orders').select('order_id, store_id').eq('awb_number', order_id).eq('courier_partner', 'Shadowfax').single();
        if (order) await updateOrderStatus(order.order_id, fulfillmentStatus, order.store_id);
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (e: any) {
    console.error('Shadowfax Error:', e);
    return new Response(JSON.stringify({ error: 'Internal Error' }), { status: 500 });
  }
};
