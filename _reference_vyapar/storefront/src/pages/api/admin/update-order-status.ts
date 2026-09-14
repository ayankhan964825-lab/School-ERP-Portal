import { getPermissionContext, canManageSection } from '../../../lib/permissions';
import type { APIRoute } from 'astro';
import { updateOrderStatus } from '../../../lib/database';
import { sendNotifications } from '../../../lib/notifications';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request, cookies , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    const ctx = getPermissionContext(cookies);
    if (!canManageSection(ctx, 'orders_all') && !canManageSection(ctx, 'orders')) return new Response(JSON.stringify({ error: `Forbidden: Role=${ctx.adminRole}, Perms=${JSON.stringify(ctx.permissions)}` }), { status: 403 });
    try {
        const body = await request.json();
        const { orderId, status, fulfillmentId } = body;
        
        if (!orderId || !status) {
          return new Response(JSON.stringify({ error: 'Missing parameters' }), { status: 400 });
        }
        
        const updated = await updateOrderStatus(orderId, status, undefined, fulfillmentId);
        if (!updated) {
          return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404 });
        }
    
    
        // Trigger notification if marked as shipped
        if (status === 'shipped') {
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
        
        return new Response(JSON.stringify({ success: true, updated }), { status: 200 });
      } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), { status: 500 });
      }
  });
};
