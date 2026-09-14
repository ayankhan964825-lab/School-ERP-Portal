import type { APIRoute } from 'astro';
import { supabaseAdmin, getOrders } from '../../../lib/database';
import { storeContext } from '../../../lib/storeContext';

export const GET: APIRoute = async ({ request, locals }) => {
  return storeContext.run({ storeId: locals.storeId || 'test-store' }, async () => {
    try {
      // 1. Verify Authorization Header
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
      }
      
      const token = authHeader.substring(7);
      const { verifyRiderAuth } = await import('../../../lib/auth');
      const decoded = verifyRiderAuth(token);
      
      if (!decoded || !decoded.riderId || decoded.storeId !== locals.storeId) {
        return new Response(JSON.stringify({ error: 'Invalid or forged token' }), { status: 401 });
      }
      const riderId = decoded.riderId;

      if (!supabaseAdmin) {
        return new Response(JSON.stringify({ error: 'Database connection failed' }), { status: 500 });
      }

      // 2. Fetch the rider details to get their phone number
      const { data: staffData } = await supabaseAdmin
        .from('staff')
        .select('phone')
        .eq('id', riderId)
        .single();
        
      if (!staffData?.phone) {
        return new Response(JSON.stringify({ error: 'Rider not found' }), { status: 404 });
      }

      // 3. Fetch fulfillments assigned to this rider
      const { data: fulfillments } = await supabaseAdmin
        .from('fulfillments')
        .select('*')
        .eq('rider_phone', staffData.phone)
        .in('rider_status', ['assigned', 'at_store', 'out_for_delivery'])
        .order('created_at', { ascending: false });

      if (!fulfillments || fulfillments.length === 0) {
        return new Response(JSON.stringify({ deliveries: [] }), { status: 200 });
      }

      // 4. Fetch associated orders to get customer & address details
      const allOrders = await getOrders();
      const enrichedDeliveries = fulfillments.map((f: any) => {
        const order = allOrders.find((o: any) => o.orderId === f.order_id || o.order_id === f.order_id);
        return {
          ...f,
          customer: order?.customer || {},
          items: f.items || order?.items || [],
          total_amount: order?.amount || 0,
          payment_method: order?.paymentMethod || 'Prepaid'
        };
      });

      return new Response(JSON.stringify({ deliveries: enrichedDeliveries }), { status: 200 });

    } catch (error: any) {
      console.error('Pending deliveries error:', error);
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    }
  });
};
