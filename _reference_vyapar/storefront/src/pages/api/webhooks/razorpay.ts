import { TABLES } from '../../../lib/constants';
import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/database';
import { storeContext } from "../../../lib/storeContext";
import crypto from 'node:crypto';

export const POST: APIRoute = async ({ request }) => {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    if (!signature) {
      return new Response(JSON.stringify({ error: 'Missing signature' }), { status: 400 });
    }

    const payload = JSON.parse(rawBody);
    console.log('[Razorpay Webhook] Event received:', payload.event);

    if (payload.event === 'order.paid' || payload.event === 'payment.captured') {
      const razorpay_order_id = payload.payload?.payment?.entity?.order_id;
      const razorpay_payment_id = payload.payload?.payment?.entity?.id;
      const amount = payload.payload?.payment?.entity?.amount ? payload.payload.payment.entity.amount / 100 : 0;

      if (!razorpay_order_id || !supabaseAdmin) {
         return new Response('Webhook ignored', { status: 200 });
      }

      // 1. Resolve Store ID from the Order globally
      const { data: existingOrder } = await supabaseAdmin
          .from(TABLES.ORDERS)
          .select('*')
          .eq('razorpay_order_id', razorpay_order_id)
          .limit(1)
          .single();

      if (!existingOrder) {
          console.warn(`[Razorpay Webhook] Order not found for Razorpay Order ID: ${razorpay_order_id}`);
          return new Response('Order not found', { status: 200 });
      }

      // 2. Fetch settings securely under the Tenant Context
      const settings = await storeContext.run({ storeId: existingOrder.store_id }, async () => {
         const { getSettings } = await import('../../../lib/database');
         return await getSettings();
      });

      const webhookSecret = settings.razorpay_webhook_secret;

      if (!webhookSecret) {
        console.warn('[Razorpay Webhook] Webhook received but razorpay_webhook_secret not configured.');
        return new Response('Webhook received', { status: 200 });
      }

      // 3. Verify Signature
      const expectedSignature = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
      let isMatch = false;
      try {
        isMatch = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
      } catch {
        isMatch = false;
      }

      if (!isMatch) {
        return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400 });
      }

// 4. Update Order Atomically
      const isTrackingOff = (settings.global_inventory_tracking !== true && settings.global_inventory_tracking !== 'true');

      const { data: rpcData, error: rpcErr } = await supabaseAdmin.rpc('atomic_confirm_payment', {
        p_lookup_id: razorpay_order_id,
        p_razorpay_payment_id: razorpay_payment_id || razorpay_order_id,
        p_skip_deduction: isTrackingOff,
        p_store_id: existingOrder.store_id
      });

      if (rpcErr) {
        console.error('[Razorpay Webhook RPC Error]', rpcErr);
        // Do not return 200 so Razorpay retries
        return new Response(JSON.stringify({ error: 'Database update failed' }), { status: 500 });
      }

      if (rpcData && rpcData.already_paid) {
        console.log(`[Razorpay Webhook] Order ${rpcData.order_id} already paid. Ignoring duplicate call.`);
      } else {
        console.log(`[Razorpay Webhook] Order ${rpcData.order_id} marked as paid via webhook.`);
      }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (err) {
    console.error('[Razorpay Webhook] Error:', err);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
};
