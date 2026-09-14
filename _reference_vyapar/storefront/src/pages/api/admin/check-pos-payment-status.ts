import { supabaseAdmin, getSettings } from '../../../lib/database';
import { verifyPhonePeCallback } from '../../../lib/phonepe';
import { fetchWithRetry } from '../../../lib/fetch-retry';

export async function GET({ request, locals }) {
  try {
    const url = new URL(request.url);
    const orderId = url.searchParams.get('order_id');

    if (!orderId) {
      return new Response(JSON.stringify({ error: 'Missing orderId' }), { status: 400 });
    }

    if (!supabaseAdmin) {
       return new Response(JSON.stringify({ error: 'Database not initialized' }), { status: 500 });
    }

    const storeId = locals?.storeId;
    if (!storeId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { data: order, error } = await supabaseAdmin.from('orders').select('payment_status, status').eq('order_id', orderId).eq('store_id', storeId).single();
    
    if (error || !order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404 });
    }

    // Check DB first
    let isPaid = order.payment_status?.toLowerCase() === 'paid' || order.status?.toLowerCase() === 'completed';

    if (!isPaid) {
      // Actively check payment gateways
      const settings = await getSettings();
      
      if (settings.phonepe_enabled !== false && String(settings.phonepe_enabled) !== 'false') {
        const ppStatus = await verifyPhonePeCallback(orderId);
        if (ppStatus.success) isPaid = true;
      } else if (settings.razorpay_enabled !== false && String(settings.razorpay_enabled) !== 'false') {
        const keyId = settings.razorpay_key_id?.trim();
        const keySecret = settings.razorpay_key_secret?.trim();
        if (keyId && keySecret) {
          const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
          const rzpRes = await fetchWithRetry(`https://api.razorpay.com/v1/payment_links?reference_id=${orderId}`, {
            headers: { 'Authorization': `Basic ${auth}` }
          });
          const rzpData = await rzpRes.json();
          if (rzpData.items && rzpData.items.length > 0) {
            const plink = rzpData.items[0];
            if (plink.status === 'paid') isPaid = true;
          }
        }
      }

      // If gateway confirms it's paid, update DB
      if (isPaid) {
        await supabaseAdmin.from('orders').update({ payment_status: 'paid' }).eq('order_id', orderId).eq('store_id', storeId);
      }
    }

    return new Response(JSON.stringify({ isPaid, status: isPaid ? 'paid' : order.payment_status }), { status: 200 });
  } catch (error) {
    console.error('Error checking payment status:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
