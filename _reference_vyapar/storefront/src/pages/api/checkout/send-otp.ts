import type { APIRoute } from 'astro';
import { sendOTP } from '../../../lib/twilio';
import crypto from 'node:crypto';

import { isRateLimited, getClientIp } from '../../../lib/rateLimit';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    try {
        const { phone } = await request.json();
        if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
          return new Response(JSON.stringify({ success: false, error: 'Invalid Indian phone number' }), { status: 400 });
        }

        // Global IP Rate Limit: Max 20 OTP requests per hour per IP
        const clientIp = getClientIp(request);
        if (await isRateLimited(`ip_${clientIp}`, 3600, 20)) {
          return new Response(JSON.stringify({ success: false, error: 'Too many requests from this IP. Please try again later.' }), { status: 429 });
        }
    
        // Distributed Rate limiting check (3 requests per 60 seconds)
        if (await isRateLimited(phone, 60, 3)) {
          return new Response(JSON.stringify({ success: false, error: 'Too many OTP requests. Please wait 1 minute.' }), { status: 429 });
        }
    
        const result = await sendOTP(phone);
        if (!result.success) {
          return new Response(JSON.stringify({ success: false, error: result.error }), { status: 400 });
        }
    
        // Use secure secret for HMAC signing (no hardcoded fallback)
        const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.JWT_SECRET || '';
        if (!secret) {
          console.error('[send-otp] CRITICAL: No signing secret configured.');
          return new Response(JSON.stringify({ success: false, error: 'OTP service misconfigured. Contact admin.' }), { status: 500 });
        }
        const hash = crypto
          .createHmac('sha256', secret)
          .update(`${phone}:${result.otp}:${result.expiry}`)
          .digest('hex');
    
        return new Response(JSON.stringify({ success: true, hash, expiry: result.expiry }), { status: 200 });
      } catch (error) {
        return new Response(JSON.stringify({ success: false, error: 'Server error' }), { status: 500 });
      }
  });
};
