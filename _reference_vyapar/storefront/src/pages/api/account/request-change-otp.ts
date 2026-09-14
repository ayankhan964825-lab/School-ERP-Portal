import { verifyCustomerAuth, signCustomerAuth } from '../../../lib/auth';
import type { APIRoute } from 'astro';
import { sendOTP } from '../../../lib/twilio';
import { sendEmailOTP, buildEmailOtpCookie } from '../../../lib/email-otp';
import { getCustomerByPhone, checkRateLimit, getSettings } from '../../../lib/database';
import { isRateLimited, getClientIp } from '../../../lib/rateLimit';
import crypto from 'node:crypto';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request, cookies , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    try {
        const body = await request.json();
        const { changeType, newValue } = body;
    
        if (!changeType || !newValue) {
          return new Response(JSON.stringify({ error: 'Missing changeType or newValue' }), { status: 400 });
        }

        // Global IP Rate Limit: Max 20 OTP requests per hour per IP
        const clientIp = getClientIp(request);
        if (await isRateLimited(`ip_${clientIp}`, 3600, 20)) {
          return new Response(JSON.stringify({ error: 'Too many requests from this IP. Please try again later.' }), { status: 429 });
        }
    
        // Determine current identity from cookie
        const customerId = verifyCustomerAuth(cookies.get('customer_auth')?.value);
        if (!customerId) {
          return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
        }

        let customerPhone: string | null = null;
        let customerEmail: string | null = null;
    
        const { getCustomerById } = await import('../../../lib/database');
        const cust = await getCustomerById(customerId);
        if (cust) {
            customerPhone = cust.phone || null;
            customerEmail = cust.email || null;
        }
    
        if (changeType === 'phone') {
          // Changing phone → verify via email OTP
          if (!customerEmail) {
            return new Response(JSON.stringify({ error: 'No email on file. Cannot cross-verify.' }), { status: 400 });
          }

          const settings = await getSettings();
          const maxReqE = parseInt(settings.rate_limit_email_otp_requests || '0', 10);
          const winMinE = parseInt(settings.rate_limit_email_otp_window_minutes || '0', 10);
          const allowedE = await checkRateLimit(customerEmail, 'email', 'send_otp', maxReqE, winMinE);
          if (!allowedE) {
            return new Response(JSON.stringify({ error: `Too many requests. Please try again after ${winMinE} minutes.` }), { status: 429 });
          }

          const result = await sendEmailOTP(customerEmail);
          if (!result.success) {
            return new Response(JSON.stringify({ error: result.error || 'Failed to send email OTP' }), { status: 500 });
          }
          if (result.otp && result.expiry) {
            cookies.set('change_otp_session', buildEmailOtpCookie(customerEmail, result.otp, result.expiry), {
              path: '/',
              httpOnly: true,
              maxAge: 5 * 60,
            });
          }
          const { otp: _o, expiry: _e, ...safeResult } = result;
          return new Response(JSON.stringify({ ...safeResult, sentTo: 'email', maskedTarget: maskEmail(customerEmail) }), { status: 200 });
    
        } else if (changeType === 'email') {
          // Changing email → verify via phone OTP
          if (!customerPhone) {
            return new Response(JSON.stringify({ error: 'No phone on file. Cannot cross-verify.' }), { status: 400 });
          }

          const settings = await getSettings();
          const maxReqP = parseInt(settings.rate_limit_phone_otp_requests || '0', 10);
          const winMinP = parseInt(settings.rate_limit_phone_otp_window_minutes || '0', 10);
          const allowedP = await checkRateLimit(customerPhone, 'phone', 'send_otp', maxReqP, winMinP);
          if (!allowedP) {
            return new Response(JSON.stringify({ error: `Too many requests. Please try again after ${winMinP} minutes.` }), { status: 429 });
          }

          const result = await sendOTP(customerPhone);
          if (!result.success) {
            return new Response(JSON.stringify({ error: result.error || 'Failed to send SMS OTP' }), { status: 500 });
          }
          if (result.otp && result.expiry) {
            const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.JWT_SECRET || '';
            if (!secret) {
              return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 500 });
            }
            const hash = crypto
              .createHmac('sha256', secret)
              .update(`${customerPhone}:${result.otp}:${result.expiry}`)
              .digest('hex');
            cookies.set('change_otp_session', `${hash}.${result.expiry}.0`, {
              path: '/',
              httpOnly: true,
              maxAge: 5 * 60,
            });
          }
          const { otp: _o, expiry: _e, ...safeResult } = result;
          return new Response(JSON.stringify({ ...safeResult, sentTo: 'phone', maskedTarget: maskPhone(customerPhone) }), { status: 200 });
    
        } else {
          return new Response(JSON.stringify({ error: 'Invalid changeType' }), { status: 400 });
        }
      } catch (error) {
        console.error('request-change-otp error:', error);
        return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
      }
  });
};

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  return `${local.slice(0, 2)}***@${domain}`;
}

function maskPhone(phone: string): string {
  return `+91 ${phone.slice(0, 2)}****${phone.slice(-2)}`;
}
