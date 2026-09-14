import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/database';
import { verifyRiderAuth } from '../../../lib/auth';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const token = cookies.get('vyaparpe_rider_id')?.value;
    if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    
    const authPayload = verifyRiderAuth(token);
    if (!authPayload || !authPayload.riderId || !authPayload.storeId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { orderId, status } = await request.json();
    if (!orderId || !status) {
      return new Response(JSON.stringify({ error: 'Missing parameters' }), { status: 400 });
    }

    // STRICT INPUT VALIDATION: Riders can only update to specific delivery statuses
    const allowedStatuses = ['out_for_delivery', 'delivered'];
    if (!allowedStatuses.includes(status)) {
      return new Response(JSON.stringify({ error: 'Invalid status update requested' }), { status: 400 });
    }

    // STRICT AUTHORIZATION: Verify order belongs to this exact rider AND store (Tenant Isolation)
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('rider_id, store_id')
      .eq('order_id', orderId)
      .single();

    if (orderError || !order || order.rider_id !== authPayload.riderId || order.store_id !== authPayload.storeId) {
      return new Response(JSON.stringify({ error: 'Order not found or unauthorized access' }), { status: 404 });
    }

    // Find the specific fulfillment for this rider
    const { data: fulfillments } = await supabaseAdmin
      .from('fulfillments')
      .select('id, store_id')
      .eq('order_id', orderId)
      .eq('store_id', authPayload.storeId)
      .limit(1);

    const fulfillmentId = fulfillments && fulfillments.length > 0 ? fulfillments[0].id : undefined;

    // We must use the central updateOrderStatus function to ensure affiliate and webhook triggers run correctly
    const { updateOrderStatus } = await import('../../../lib/database');
    
    // Map rider status to fulfillment status
    let riderStatus = 'out_for_delivery';
    let mappedOrderStatus = 'shipped'; // out_for_delivery in rider app means shipped in main system

    if (status === 'delivered') {
        riderStatus = 'delivered';
        mappedOrderStatus = 'delivered';
    }

    // 1. Update Fulfillment Status First
    if (fulfillmentId) {
      await supabaseAdmin
        .from('fulfillments')
        .update({ 
          rider_status: riderStatus, 
          status: mappedOrderStatus 
        })
        .eq('id', fulfillmentId);
    }

    // 2. Update Global Order Status (handles webhooks, affiliate payouts, etc)
    await updateOrderStatus(orderId, mappedOrderStatus, authPayload.storeId, fulfillmentId);

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error: any) {
    console.error('Rider Update Status Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
};
