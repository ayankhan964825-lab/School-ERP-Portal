import type { APIRoute } from 'astro';
import { getPermissionContext, canManageSection } from '../../../lib/permissions';
import { saveOrder } from '../../../lib/database';
import { generateManualOrderId } from '../../../lib/orderIds';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request, cookies , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    const ctx = getPermissionContext(cookies);
    if (!canManageSection(ctx, "orders")) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
      }
    try {
        const body = await request.json();
        
        if (!body.items || !body.items.length) {
          return new Response(JSON.stringify({ error: "No items provided" }), { status: 400 });
        }
    
        const orderId = body.edit_order_id || generateManualOrderId();
    
        const orderData = {
          orderId,
          id: orderId, // Some legacy code uses id, some uses orderId
          customer: {
            name: body.customer?.name || 'Guest',
            phone: body.customer?.phone || '',
            email: body.customer?.email || '',
            address: body.customer?.address || '',
            city: body.customer?.city || '',
            state: body.customer?.state || '',
            pincode: body.customer?.pincode || '',
            gstin: body.customer?.gstin || '',
            source: body.is_quotation ? 'quotation' : (body.is_b2b ? 'b2b_pos' : (body.is_pos ? 'pos' : 'manual_whatsapp')),
          } as any,
          shipping: body.shipping || 0,
          items: body.items.map((i: any) => ({ ...i, isB2B: body.is_b2b || false })), // Array of { name, price, quantity, hsn_code, gst_rate, variant }
          subtotal: body.subtotal,
          discount: body.discount || 0,
          amount: body.grandTotal, // Final amount
          couponCode: body.couponCode || null,
          paymentMethod: body.paymentMethod || 'COD',
          paymentStatus: body.paymentStatus || 'pending',
          status: body.is_quotation ? 'pending' : 'confirmed', // Quotations are marked pending
          createdAt: new Date().toISOString(),
          source: body.is_quotation ? 'quotation' : (body.is_b2b ? 'b2b_pos' : (body.is_pos ? 'pos' : 'manual_whatsapp')),
          is_b2b: body.is_b2b || false,
          store_id: locals.storeId,
          notes: body.notes || ''
        };
    
        if (body.is_b2b) {
          orderData.customer.is_b2b = true;
          orderData.customer.amount_received = body.amountReceived || 0;
        }
    
        const saved = await saveOrder(orderData);
    
        return new Response(JSON.stringify({ success: true, orderId: saved.orderId || saved.id }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
    
      } catch (error: any) {
        console.error("Create manual order error:", error);
        return new Response(JSON.stringify({ error: error.message || "Failed to create order" }), { status: 500 });
      }
  });
};
