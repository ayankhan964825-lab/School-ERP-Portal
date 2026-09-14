import { getPermissionContext, canManageSection } from '../../../lib/permissions';
import type { APIRoute } from 'astro';
import { updateOrderAwb, updateOrderStatus } from '../../../lib/database';
import { sendNotifications } from '../../../lib/notifications';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request, cookies , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    const ctx = getPermissionContext(cookies);
    if (!canManageSection(ctx, 'orders')) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    try {
        const body = await request.json();
        const {
          orderId,
          awb,
          courier_partner,
          routing_code,
          package_weight,
          package_dimensions,
          mark_shipped,
          fulfillmentId, // Sprint 1.6: Fulfillment level AWB
          rider_id, // Q-Commerce Rider
        } = body;
    
        if (!orderId && !awb && !rider_id) {
          return new Response(JSON.stringify({ error: 'Missing required parameters' }), { status: 400 });
        }
    
        const updated = await updateOrderAwb(orderId, awb || '', {
          courier_partner,
          routing_code,
          package_weight,
          package_dimensions,
          fulfillmentId,
          rider_id,
        });
    
        if (!updated) {
          return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404 });
        }
    
        // Optionally auto-mark order as shipped when AWB is saved
        if (mark_shipped) {
          await updateOrderStatus(orderId, 'shipped', undefined, fulfillmentId);
          
          // Trigger notification if marked as shipped
          await sendNotifications({
            type: 'order_shipped',
            orderId: updated.orderId,
            amount: updated.amount,
            customerName: updated.customer?.name || 'Customer',
            customerPhone: updated.customer?.phone,
            customerEmail: updated.customer?.email,
            trackingLink: updated.awb_number ? `AWB: ${updated.awb_number}` : ''
          });
        }
    
        return new Response(JSON.stringify({ success: true, order: updated }), { status: 200 });
      } catch (error: any) {
        console.error('[AWB Update Error]', error);
        return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), { status: 500 });
      }
  });
};
