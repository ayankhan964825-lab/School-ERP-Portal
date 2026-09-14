import { supabaseAdmin, getSettings } from '../../../lib/database';
import { initiatePhonePePayment } from '../../../lib/phonepe';
import { fetchWithRetry } from '../../../lib/fetch-retry';

export async function POST({ request, locals }) {
  try {
    const { orderId, amount, customerPhone } = await request.json();

    if (!orderId || !amount) {
      return new Response(JSON.stringify({ error: 'Missing orderId or amount' }), { status: 400 });
    }

    const settings = await getSettings();
    let paymentUrl = '';
    const host = request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') || 'http';

    if (settings.phonepe_enabled !== false && String(settings.phonepe_enabled) !== 'false') {
      const callbackUrl = `${protocol}://${host}/api/checkout/phonepe-callback`;
      const ppRes = await initiatePhonePePayment(amount, orderId, callbackUrl);
      if (ppRes.success && ppRes.redirectUrl) {
         paymentUrl = ppRes.redirectUrl;
      } else {
         return new Response(JSON.stringify({ error: ppRes.error || 'PhonePe error' }), { status: 400 });
      }
    } else if (settings.razorpay_enabled !== false && String(settings.razorpay_enabled) !== 'false') {
      const keyId = settings.razorpay_key_id?.trim();
      const keySecret = settings.razorpay_key_secret?.trim();
      
      if (!keyId || !keySecret) {
        return new Response(JSON.stringify({ error: 'Razorpay API keys not configured in Settings' }), { status: 400 });
      }

      const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      const isSmartCollect = settings.razorpay_smart_collect_enabled === true || settings.razorpay_smart_collect_enabled === 'true';

      if (isSmartCollect) {
        const qrPayload = {
          type: "upi_qr",
          name: "Store POS",
          usage: "single_use",
          fixed_amount: true,
          payment_amount: amount * 100,
          description: `POS #${orderId}`,
          notes: { order_id: orderId }
        };
        const rzpRes = await fetchWithRetry('https://api.razorpay.com/v1/payments/qr_codes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${auth}`
          },
          body: JSON.stringify(qrPayload)
        });
        const rzpData = await rzpRes.json();
        
        if (rzpData.image_url) {
          if (supabaseAdmin) {
            await supabaseAdmin.from('orders').update({
              paymentIntentUrl: rzpData.image_url,
              posQrMode: 'dynamic'
            }).eq('order_id', orderId).eq('store_id', locals.storeId);
          }
          return new Response(JSON.stringify({ paymentUrl: rzpData.image_url, isImageUrl: true }), { status: 200 });
        } else {
          return new Response(JSON.stringify({ error: rzpData.error?.description || 'Razorpay Smart Collect error' }), { status: 400 });
        }
      }
      let contactNum = '';
      if (customerPhone && customerPhone.length >= 10) {
        contactNum = customerPhone.startsWith('+91') ? customerPhone : '+91' + customerPhone;
      } else {
        const firstDigit = [9, 8, 7, 6][Math.floor(Math.random() * 4)];
        const rest = Math.floor(100000000 + Math.random() * 900000000);
        contactNum = `+91${firstDigit}${rest}`;
      }

      let rzpPayload: any = {
        amount: amount * 100,
        currency: 'INR',
        reference_id: orderId,
        description: 'POS Purchase',
        upi_link: true,
        customer: {
          name: 'Walk-in Customer',
          contact: contactNum
        },
        notify: {
          sms: false,
          email: false
        }
      };

      const rzpRes = await fetchWithRetry('https://api.razorpay.com/v1/payment_links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`
        },
        body: JSON.stringify(rzpPayload)
      });
      const rzpData = await rzpRes.json();
      if (rzpData.short_url) {
        paymentUrl = rzpData.short_url;
      } else {
        return new Response(JSON.stringify({ error: rzpData.error?.description || 'Razorpay error' }), { status: 400 });
      }
    } else {
      return new Response(JSON.stringify({ error: 'No dynamic payment gateway enabled' }), { status: 400 });
    }

    // Save intent to order
    if (supabaseAdmin) {
      await supabaseAdmin.from('orders').update({
        paymentIntentUrl: paymentUrl,
        posQrMode: 'dynamic'
      }).eq('order_id', orderId).eq('store_id', locals.storeId);
    }

    return new Response(JSON.stringify({ paymentUrl }), { status: 200 });
  } catch (error) {
    console.error('Error generating POS payment:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
