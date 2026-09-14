import type { APIRoute } from 'astro';
import { supabaseAdmin, isSupabase } from '../../../lib/database';
import { sendNotifications } from '../../../lib/notifications';

export const GET: APIRoute = async ({ request }) => {
  // Standardize security check for cron endpoints via Authorization header
  const authHeader = request.headers.get('authorization');
  const envSecret = process.env.CRON_SECRET || import.meta.env.CRON_SECRET;
  
  if (!envSecret || authHeader !== `Bearer ${envSecret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  if (!isSupabase || !supabaseAdmin) {
    return new Response(JSON.stringify({ error: 'Supabase not configured' }), { status: 500 });
  }

  try {
    // Look for orders created between 1 and 2 hours ago that are still pending
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    const { data: pendingOrders, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('payment_status', 'pending')
      .neq('payment_method', 'cod') // Exclude COD, as they are instantly confirmed usually, or handled differently
      .gte('created_at', twoHoursAgo)
      .lte('created_at', oneHourAgo);

    if (error) throw error;

    let sentCount = 0;

    for (const order of pendingOrders || []) {
      // Check if we already sent an abandoned cart notification
      const notifications = order.notification_sent || {};
      if (notifications.abandoned_cart) {
        continue;
      }

      const checkoutUrl = `https://${process.env.PUBLIC_DOMAIN || 'vyaparpe.in'}/checkout?recover=${order.order_id || order.id}`;

      // Send Abandoned Cart Notification
      await sendNotifications({
        type: 'abandoned_cart',
        storeId: order.store_id,
        orderId: order.order_id || order.order_number,
        customerName: order.customer?.name || order.customer_name,
        customerPhone: order.customer?.phone || order.customer_phone,
        message: checkoutUrl
      });

      // Mark as sent
      notifications.abandoned_cart = true;
      await supabaseAdmin
        .from('orders')
        .update({ notification_sent: notifications })
        .eq('id', order.id);
        
      sentCount++;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      processed: pendingOrders?.length || 0,
      sent: sentCount 
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('[Cron] Abandoned Cart Error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
  }
};
