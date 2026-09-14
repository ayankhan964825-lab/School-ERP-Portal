/**
 * PhonePe Service — handles payment initiation and callback verification (Smart Auto-Detect)
 * 
 * Automatically detects whether the provided keys are for PG v1 (Merchant ID + Salt) 
 * or PG v2 (OAuth Client ID + Client Secret).
 */

import { getSettings } from './database';
import crypto from 'crypto';
import { fetchWithRetry } from './fetch-retry';

const PHONEPE_PG_V1_API = 'https://api.phonepe.com/apis/hermes/pg/v1/pay';
const PHONEPE_PG_V2_OAUTH = 'https://api.phonepe.com/apis/identity-manager/v1/oauth/token';
const PHONEPE_PG_V2_PAY = 'https://api.phonepe.com/apis/pg/checkout/v2/pay';

const integrationTypeCache: Record<string, 'v1' | 'v2'> = {};
const oauthTokenCache: Record<string, { token: string, expiresAt: number }> = {};

async function getOAuthToken(clientId: string, clientSecret: string) {
  const cached = oauthTokenCache[clientId];
  if (cached && cached.expiresAt > Date.now() + 60000) {
    return cached.token;
  }
  
  try {
    const data = new URLSearchParams();
    data.append('client_id', clientId);
    data.append('client_secret', clientSecret);
    data.append('client_version', '1');
    data.append('grant_type', 'client_credentials');

    const res = await fetchWithRetry(PHONEPE_PG_V2_OAUTH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: data.toString()
    });
    const result = await res.json();
    if (result.access_token) {
      oauthTokenCache[clientId] = {
        token: result.access_token,
        expiresAt: Date.now() + (result.expires_in * 1000)
      };
      return result.access_token;
    }
  } catch (err) {
    // Falls back to v1
  }
  return null;
}

async function detectIntegrationType(key1: string, key2: string): Promise<'v1' | 'v2'> {
  if (integrationTypeCache[key1]) return integrationTypeCache[key1];
  const token = await getOAuthToken(key1, key2);
  const type = token ? 'v2' : 'v1';
  integrationTypeCache[key1] = type;
  return type;
}

export async function initiatePhonePePayment(amount: number, orderId: string, callbackUrl: string) {
  const settings = await getSettings();
  const merchantId = settings.phonepe_merchant_id?.replace(/[^a-zA-Z0-9-]/g, '');
  const saltKey = settings.phonepe_salt_key?.replace(/[^a-zA-Z0-9-]/g, '');

  if (!merchantId || !saltKey) {
    console.log('[PhonePe] No API keys configured — using mock mode');
    return {
      success: true,
      mock: true,
      redirectUrl: `${callbackUrl}&mock=true`,
    };
  }

  try {
    const integrationType = await detectIntegrationType(merchantId, saltKey);

    if (integrationType === 'v2') {
      const token = await getOAuthToken(merchantId, saltKey);
      const payload = {
        merchantId: merchantId,
        merchantOrderId: orderId,
        amount: Math.round(amount * 100), // paise
        expireAfter: 1200,
        paymentFlow: {
          type: 'PG_CHECKOUT',
          merchantUrls: {
            redirectUrl: callbackUrl
        }
      }
      };
      const res = await fetchWithRetry(PHONEPE_PG_V2_PAY, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `O-Bearer ${token}`
      },
        body: JSON.stringify(payload)
      });
        const data = await res.json();
        if (data.redirectUrl) {
          return { success: true, mock: false, redirectUrl: data.redirectUrl };
        }
      return { success: false, error: data.message || 'PhonePe initiation failed' };
    } else {
      const payload = {
        merchantId,
        merchantTransactionId: orderId,
        merchantUserId: 'MUID_' + Date.now(),
        amount: Math.round(amount * 100), // paise
        redirectUrl: callbackUrl,
        redirectMode: 'POST',
        callbackUrl: callbackUrl,
        paymentInstrument: { type: 'PAY_PAGE' }
      };

      const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
      const saltIndex = 1;
      const string = base64Payload + '/pg/v1/pay' + saltKey;
      const sha256 = crypto.createHash('sha256').update(string).digest('hex');
      const checksum = sha256 + '###' + saltIndex;

      const res = await fetchWithRetry(PHONEPE_PG_V1_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-VERIFY': checksum
      },
        body: JSON.stringify({ request: base64Payload })
      });

      const data = await res.json();
      if (data.success && data.data?.instrumentResponse?.redirectInfo?.url) {
        return {
          success: true,
          mock: false,
          redirectUrl: data.data.instrumentResponse.redirectInfo.url
      };
      }
      return { success: false, error: data.message || 'PhonePe initiation failed' };
    }
  } catch (err) {
    console.error('[PhonePe] Payment initiation error:', err);
    return { success: false, error: 'Network error' };
  }
}

export async function verifyPhonePeCallback(merchantTransactionId: string) {
  const settings = await getSettings();
  const merchantId = settings.phonepe_merchant_id;
  const saltKey = settings.phonepe_salt_key;

  if (!merchantId || !saltKey) {
    console.log('[PhonePe] No secret — accepting mock payment');
    return { success: true, mock: true };
  }

  try {
    const integrationType = await detectIntegrationType(merchantId, saltKey);

    if (integrationType === 'v2') {
      const token = await getOAuthToken(merchantId, saltKey);
      const statusUrl = `https://api.phonepe.com/apis/pg/checkout/v2/order/${merchantTransactionId}/status`;
      const res = await fetchWithRetry(statusUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `O-Bearer ${token}`
      }
      });
      const data = await res.json();
      return { success: data.state === 'COMPLETED', data };
    } else {
      const saltIndex = 1;
      const statusUrl = `https://api.phonepe.com/apis/hermes/pg/v1/status/${merchantId}/${merchantTransactionId}`;
      const string = `/pg/v1/status/${merchantId}/${merchantTransactionId}` + saltKey;
      const sha256 = crypto.createHash('sha256').update(string).digest('hex');
      const checksum = sha256 + '###' + saltIndex;

      const res = await fetchWithRetry(statusUrl, {
        headers: { 'X-VERIFY': checksum, 'X-MERCHANT-ID': merchantId }
      });
      const data = await res.json();
      return { success: data.code === 'PAYMENT_SUCCESS', data };
    }
  } catch (err) {
    console.error('[PhonePe] Verification error:', err);
    return { success: false };
  }
}
