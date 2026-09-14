import type { APIRoute } from 'astro';
import { getOrders, getOrdersByPhone } from '../../lib/database';
import { storeContext } from "../../lib/storeContext";

export const POST: APIRoute = async ({ request , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    try {
        const { orderId, phone } = await request.json();
    
        if (!orderId || !phone) {
          return new Response(JSON.stringify({ error: 'Order ID and Phone Number are required.' }), { status: 400 });
        }
    
        const orders = await getOrdersByPhone(phone);
        const order = orders.find((o: any) => 
          (o.id?.toLowerCase() === orderId.toLowerCase() || o.orderId?.toLowerCase() === orderId.toLowerCase() || o.masterOrderId?.toLowerCase() === orderId.toLowerCase()) && 
          o.customer?.phone === phone
        );
    
        if (!order) {
          return new Response(JSON.stringify({ error: 'No order found with this ID and Phone combination.' }), { status: 404 });
        }
    
        return new Response(JSON.stringify({ success: true, order }), { status: 200 });
      } catch (error) {
        console.error('Track order error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
      }
  });
};
