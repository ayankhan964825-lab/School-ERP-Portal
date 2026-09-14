import { TABLES } from '../../../lib/constants';
import type { APIRoute } from 'astro';
import { supabaseAdmin, isSupabase, updateOrderStatus } from '../../../lib/database';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request, locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    try {
        const payload = await request.json();
        const awb = payload.awb_number || payload.awb_code || payload.awb;
        const currentStatus = payload.current_status || payload.status;
        const scanData = payload.scan_data || payload.tracking_data || [];
    
        if (!awb) return new Response(JSON.stringify({ error: 'Missing AWB' }), { status: 400 });
    
    if (isSupabase && supabaseAdmin) {
          let orderIdToUpdate = null;
          let fulfillmentIdToUpdate = undefined;
          let storeIdToUpdate = undefined;

          const { data: fulfillments } = await supabaseAdmin.from('fulfillments').select('id, order_id, store_id').eq('awb_number', awb);
          if (fulfillments && fulfillments.length > 0) {
             orderIdToUpdate = fulfillments[0].order_id;
             fulfillmentIdToUpdate = fulfillments[0].id;
             storeIdToUpdate = fulfillments[0].store_id;
          } else {
             const { data: order } = await supabaseAdmin.from(TABLES.ORDERS).select('order_id, store_id').eq('awb_number', awb).single();
             if (order) {
                 orderIdToUpdate = order.order_id;
                 storeIdToUpdate = order.store_id;
             }
          }

          if (orderIdToUpdate) {
             let mappedStatus = 'shipped';
             const lowerStatus = String(currentStatus).toLowerCase();
             if (lowerStatus.includes('delivered')) mappedStatus = 'delivered';
             else if (lowerStatus.includes('return') || lowerStatus.includes('cancelled') || lowerStatus.includes('rto')) mappedStatus = 'cancelled';

             await supabaseAdmin.from(TABLES.ORDERS).update({ tracking_history: scanData }).eq('order_id', orderIdToUpdate).eq('store_id', storeIdToUpdate);
             
             // This will also properly invoke atomic DB procedures internally and trigger affiliate payouts
             await updateOrderStatus(orderIdToUpdate, mappedStatus, storeIdToUpdate, fulfillmentIdToUpdate);
          }
        }
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      } catch (error) {
        console.error('[iCarry Webhook Error]', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
      }
  });
};
