import { verifyCustomerAuth, signCustomerAuth } from '../../../lib/auth';
import type { APIRoute } from 'astro';
import { getOrders, getOrdersByCustomerId, updateOrderStatus, addNotification } from '../../../lib/database';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request, cookies , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    try {
        const { orderId } = await request.json();
        const customerId = verifyCustomerAuth(cookies.get('customer_auth')?.value);
    
        if (!customerId) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }
    
        if (!orderId) {
          return new Response(JSON.stringify({ error: 'Missing orderId' }), { status: 400 });
        }
    
        const orders = await getOrdersByCustomerId(customerId);
        const matchingOrders = orders.filter((o: any) => o.orderId === orderId || o.masterOrderId === orderId);
    
        if (matchingOrders.length === 0) {
          return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404 });
        }
    
        for (const order of matchingOrders) {
          if (order.customer_id !== customerId) {
            return new Response(JSON.stringify({ error: 'Unauthorized to cancel this order' }), { status: 403 });
          }
      
          if (order.paymentMethod !== 'cod') {
            return new Response(JSON.stringify({ error: 'Only COD orders can be cancelled online' }), { status: 400 });
          }
      
          if (!['placed', 'pending', 'confirmed'].includes(order.status)) {
            return new Response(JSON.stringify({ error: 'Order cannot be cancelled at this stage' }), { status: 400 });
          }
        }
    
        // Update the status to cancelled for all matching orders
        await Promise.all(matchingOrders.map(async (order: any) => {
          await updateOrderStatus(order.orderId, 'cancelled');
          await addNotification('feedback', order.orderId, `Customer ${order.customer?.name || order.customer?.phone || order.customerPhone || 'Unknown'} cancelled order #${order.orderId}`);
        }));
    
        return new Response(JSON.stringify({ success: true, message: 'Order cancelled successfully' }), { status: 200 });
    
      } catch (error) {
        console.error('Cancel order error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
      }
  });
};
