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
        const { changeType } = body; // 'email' or 'phone'
    
        if (!changeType) {
          return new Response(JSON.stringify({ error: 'Missing changeType' }), { status: 400 });
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
        
        const authCookie = customerId; // maintain for hmac verification in verify-unlock-otp.ts
    
        let targetToSend = '';
        let method: 'email'|'phone' = 'email';
    
        if (changeType === 'email') {
           // We only require unlock if they are changing a VERIFIED email
           if (!verifiedEmail) {
             return new Response(JSON.stringify({ success: true, bypassed: true }), { status: 200 });
           }
           targetToSend = verifiedEmail;
           method = 'email';
        } else if (changeType === 'phone') {
           // We only require unlock if they are changing a VERIFIED phone
           if (!verifiedPhone) {
             return new Response(JSON.stringify({ success: true, bypassed: true }), { status: 200 });
           }
           targetToSend = verifiedPhone;
           method = 'phone';
        } else {
            return new Response(JSON.stringify({ error: 'Invalid change type' }), { status: 400 });
        }

        if (method === 'email' && targetToSend) {
          const settings = await getSettings();
          const maxReqE = parseInt(settings.rate_limit_email_otp_requests || '0', 10);
          const winMinE = parseInt(settings.rate_limit_email_otp_window_minutes || '0', 10);
          const allowedE = await checkRateLimit(targetToSend, 'email', 'send_otp', maxReqE, winMinE);
          if (!allowedE) {
            return new Response(JSON.stringify({ error: `Too many requests. Please try again after ${winMinE} minutes.` }), { status: 429 });
          }

          const result = await sendEmailOTP(targetToSend);
          if (!result.success) {
            return new Response(JSON.stringify({ error: result.error || 'Failed to send email OTP' }), { status: 500 });
          }
          if (result.otp && result.expiry) {
            cookies.set('unlock_otp_session', buildEmailOtpCookie(targetToSend, result.otp, result.expiry), {
              path: '/',
              httpOnly: true,
              maxAge: 5 * 60,
            });
          }
          return new Response(JSON.stringify({ success: true, sentTo: 'email', maskedTarget: maskEmail(targetToSend) }), { status: 200 });
        } 
        else if (method === 'phone' && targetToSend) {
          const settings = await getSettings();
          const maxReqP = parseInt(settings.rate_limit_phone_otp_requests || '0', 10);
          const winMinP = parseInt(settings.rate_limit_phone_otp_window_minutes || '0', 10);
          const allowedP = await checkRateLimit(targetToSend, 'phone', 'send_otp', maxReqP, winMinP);
          if (!allowedP) {
            return new Response(JSON.stringify({ error: `Too many requests. Please try again after ${winMinP} minutes.` }), { status: 429 });
          }

          const result = await sendOTP(targetToSend);
          if (!result.success) {
            return new Response(JSON.stringify({ error: result.error || 'Failed to send SMS OTP' }), { status: 500 });
          }
          if (result.otp && result.expiry) {
            const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.JWT_SECRET || '';
            const hash = crypto
              .createHmac('sha256', secret)
              .update(`${targetToSend}:${result.otp}:${result.expiry}`)
              .digest('hex');
            cookies.set('unlock_otp_session', `${hash}.${result.expiry}.0`, {
              path: '/',
              httpOnly: true,
              maxAge: 5 * 60,
            });
          }
          return new Response(JSON.stringify({ success: true, sentTo: 'phone', maskedTarget: maskPhone(targetToSend) }), { status: 200 });
        }

        return new Response(JSON.stringify({ error: 'Unknown state' }), { status: 500 });
      } catch (error) {
        console.error('request-unlock-otp error:', error);
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
