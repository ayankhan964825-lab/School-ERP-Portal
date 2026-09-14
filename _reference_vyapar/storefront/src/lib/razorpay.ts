/**
 * Razorpay Service â€” handles order creation and payment verification
 * 
 * API Keys are loaded from the mock database settings.
 * Set these keys in Admin â†’ API Settings:
 * - razorpay_key_id: Your Razorpay Key ID (rzp_live_... or rzp_test_...)
 * - razorpay_key_secret: Your Razorpay Key Secret
 */

import { getSettings } from './database';
import { fetchWithRetry } from './fetch-retry';
import crypto from 'node:crypto';

export async function createRazorpayOrder(amount: number, receipt: string) {
  const settings = await getSettings();
  const keyId = settings.razorpay_key_id?.trim();
  const keySecret = settings.razorpay_key_secret?.trim();

  if (!keyId || !keySecret) {
    console.log('[Razorpay] No API keys configured â€” using mock mode');
    return {
      success: true,
      mock: true,
      id: `order_mock_${Date.now()}`,
      amount: Math.round(amount * 100),
      currency: 'INR',
      key_id: 'rzp_test_PLACEHOLDER',
    };
  }

  try {
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const res = await fetchWithRetry('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100), // paise
        currency: 'INR',
        receipt,
        notes: { source: 'yourstore' }
      })
    });

    const data = await res.json();
    if (data.id) {
      return { success: true, mock: false, ...data, key_id: keyId };
    }
    return { success: false, error: data.error?.description || 'Failed to create order' };
  } catch (err) {
    console.error('[Razorpay] Order creation error:', err);
    return { success: false, error: 'Network error' };
  }
}

export async function verifyRazorpayPayment(orderId: string, paymentId: string, signature: string) {
  const settings = await getSettings();
  const keySecret = settings.razorpay_key_secret?.trim();

  if (!keySecret) {
    console.error('[Razorpay] CRITICAL: No API secret configured. Rejecting payment verification.');
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  try {
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    const signatureBuffer = Buffer.from(signature || '', 'hex');

    if (expectedBuffer.length !== signatureBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
  } catch (err) {
    return false;
  }
}
