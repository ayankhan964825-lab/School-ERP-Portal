import { verifyCustomerAuth } from '../../../lib/auth';
import type { APIRoute } from 'astro';
import { sendOTP } from '../../../lib/twilio';
import { sendEmailOTP, buildEmailOtpCookie } from '../../../lib/email-otp';
import { getCustomerByPhone, getCustomerByEmail, checkRateLimit, getSettings } from '../../../lib/database';
import { isRateLimited, getClientIp } from '../../../lib/rateLimit';
import crypto from 'node:crypto';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    try {
        const body = await request.json();
        const { changeType, newValue } = body;
    
        if (!changeType || !newValue) {
          return new Response(JSON.stringify({ error: 'Missing parameters' }), { status: 400 });
        }

        // Global IP Rate Limit: Max 20 OTP requests per hour per IP
        const clientIp = getClientIp(request);
        if (await isRateLimited(`ip_${clientIp}`, 3600, 20)) {
          return new Response(JSON.stringify({ error: 'Too many requests from this IP. Please try again later.' }), { status: 429 });
        }
    
        const customerId = verifyCustomerAuth(cookies.get('customer_auth')?.value);
        
        if (!customerId) {
          return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
        }
        
        const { getCustomerById } = await import('../../../lib/database');
        const cust = await getCustomerById(customerId);
        
        let verifiedPhone = cust?.phone || null;
        let verifiedEmail = cust?.email || null;
        
        const authCookie = customerId; // keep variable for unlock token hashing
        
        // Verify unlock token if the user had an old verified credential
        const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.JWT_SECRET || 'fallback';
        const expectedToken = crypto.createHmac('sha256', secret).update(`unlocked:${authCookie}`).digest('hex');
        const providedToken = cookies.get('profile_unlock_token')?.value;

        if (changeType === 'email' && verifiedEmail) {
            if (providedToken !== expectedToken) return new Response(JSON.stringify({ error: 'Session not unlocked' }), { status: 403 });
        } else if (changeType === 'phone' && verifiedPhone) {
            if (providedToken !== expectedToken) return new Response(JSON.stringify({ error: 'Session not unlocked' }), { status: 403 });
        }

        // Send OTP to new credential
        if (changeType === 'email') {
          // Validate new email format
          if (!newValue.includes('@') || !newValue.includes('.')) {
            return new Response(JSON.stringify({ error: 'Invalid email format' }), { status: 400 });
          }
          
          const settings = await getSettings();
          const maxReqE = parseInt(settings.rate_limit_email_otp_requests || '0', 10);
          const winMinE = parseInt(settings.rate_limit_email_otp_window_minutes || '0', 10);
          const allowedE = await checkRateLimit(newValue, 'email', 'send_otp', maxReqE, winMinE);
          if (!allowedE) {
            return new Response(JSON.stringify({ error: `Too many requests. Please try again after ${winMinE} minutes.` }), { status: 429 });
          }

          const result = await sendEmailOTP(newValue);
          if (!result.success) {
            return new Response(JSON.stringify({ error: result.error || 'Failed to send email OTP' }), { status: 500 });
          }
          if (result.otp && result.expiry) {
            cookies.set('new_credential_otp_session', buildEmailOtpCookie(newValue, result.otp, result.expiry), {
              path: '/',
              httpOnly: true,
              maxAge: 5 * 60,
            });
          }
          return new Response(JSON.stringify({ success: true, sentTo: 'email' }), { status: 200 });

        } else if (changeType === 'phone') {
          // Validate new phone format
          if (!/^\d{10}$/.test(newValue)) {
             return new Response(JSON.stringify({ error: 'Invalid phone number' }), { status: 400 });
          }

          const settings = await getSettings();
          const maxReqP = parseInt(settings.rate_limit_phone_otp_requests || '0', 10);
          const winMinP = parseInt(settings.rate_limit_phone_otp_window_minutes || '0', 10);
          const allowedP = await checkRateLimit(newValue, 'phone', 'send_otp', maxReqP, winMinP);
          if (!allowedP) {
            return new Response(JSON.stringify({ error: `Too many requests. Please try again after ${winMinP} minutes.` }), { status: 429 });
          }

          const result = await sendOTP(newValue);
          if (!result.success) {
            // Note: If Twilio is disabled, sendOTP might fail or return success depending on test mode.
            // Wait, we need to handle Twilio disabled properly in UI, but if it hits here, sendOTP will handle it.
            return new Response(JSON.stringify({ error: result.error || 'Failed to send SMS OTP' }), { status: 500 });
          }
          if (result.otp && result.expiry) {
            const hash = crypto
              .createHmac('sha256', secret)
              .update(`${newValue}:${result.otp}:${result.expiry}`)
              .digest('hex');
            cookies.set('new_credential_otp_session', `${hash}.${result.expiry}.0`, {
              path: '/',
              httpOnly: true,
              maxAge: 5 * 60,
            });
          }
          return new Response(JSON.stringify({ success: true, sentTo: 'phone' }), { status: 200 });
        }

        return new Response(JSON.stringify({ error: 'Unknown state' }), { status: 500 });
      } catch (error) {
        console.error('request-new-otp error:', error);
        return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
      }
  });
};
