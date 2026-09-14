import type { APIRoute } from 'astro';
import { sendOTP } from '../../../lib/twilio';
import { sendEmailOTP, buildEmailOtpCookie } from '../../../lib/email-otp';
import { checkRateLimit, supabaseAdmin, getSettings } from '../../../lib/database';
import { isRateLimited, getClientIp } from '../../../lib/rateLimit';
import { getEffectiveAuthMode } from '../../../lib/auth';
import crypto from 'node:crypto';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    try {
      const body = await request.json();
      const settings = await getSettings();
      const { authMode } = await getEffectiveAuthMode(locals.storeId);
      const hostname = new URL(request.url).hostname;

      // Global IP Rate Limit: Max 20 OTP requests per hour per IP
      const clientIp = getClientIp(request);
      if (await isRateLimited(`ip_${clientIp}`, 3600, 20)) {
        return new Response(JSON.stringify({ error: 'Too many requests from this IP. Please try again later.' }), { status: 429 });
      }
      
      const { via, phone, email, action } = body; // via is 'phone' or 'email'

      if (action === 'login') {
        // Check if rider exists in DB
        let query = supabaseAdmin.from('riders').select('id, name, status').eq('store_id', locals.storeId);
        
        if (via === 'phone') {
          if (!phone || phone.length !== 10 || !/^\d+$/.test(phone)) {
            return new Response(JSON.stringify({ error: 'Invalid phone number' }), { status: 400 });
          }
          query = query.eq('phone', phone);
        } else if (via === 'email') {
          if (!email || !email.includes('@')) {
            return new Response(JSON.stringify({ error: 'Invalid email address' }), { status: 400 });
          }
          query = query.eq('email', email.toLowerCase());
        } else {
          return new Response(JSON.stringify({ error: 'Invalid login method' }), { status: 400 });
        }

        const { data: riders, error } = await query.limit(1);
        
        if (error || !riders || riders.length === 0) {
          return new Response(JSON.stringify({ error: 'Rider not found. Please apply first.' }), { status: 404 });
        }

        const rider = riders[0];
        if (rider.status === 'suspended') {
          return new Response(JSON.stringify({ error: `Rider account is suspended. Cannot login.` }), { status: 403 });
        }
      } else if (action === 'register') {
        // Only validate format before sending OTP
        if (via === 'phone' && (!phone || phone.length !== 10 || !/^\d+$/.test(phone))) {
          return new Response(JSON.stringify({ error: 'Invalid phone number' }), { status: 400 });
        }
        if (via === 'email' && (!email || !email.includes('@'))) {
          return new Response(JSON.stringify({ error: 'Invalid email address' }), { status: 400 });
        }
      }

      // ── PHONE ONLY ─────────────────────────────────────────────
      if (via === 'phone') {
        const maxReqP = parseInt(settings.rate_limit_phone_otp_requests || '0', 10);
        const winMinP = parseInt(settings.rate_limit_phone_otp_window_minutes || '0', 10);
        const allowedP = await checkRateLimit(phone, 'phone', 'send_otp', maxReqP, winMinP);
        if (!allowedP) {
          return new Response(JSON.stringify({ error: `Too many requests. Please try again after ${winMinP} minutes.` }), { status: 429 });
        }
        const result = await sendOTP(phone, hostname);
        if (result.success) {
          if (result.otp && result.expiry) {
            const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.JWT_SECRET || '';
            const hash = crypto.createHmac('sha256', secret)
              .update(`${phone}:${result.otp}:${result.expiry}`).digest('hex');
            cookies.set('otp_session_phone', `${hash}.${result.expiry}.0`, { path: '/', httpOnly: true, maxAge: 5 * 60 });
          }
          const { otp: _o, expiry: _e, ...safe } = result;
          return new Response(JSON.stringify(safe), { status: 200 });
        }
        return new Response(JSON.stringify({ error: result.error || 'Failed to send OTP' }), { status: 500 });
      }

      // ── EMAIL ONLY ───────────────────────────────────────────────────────
      if (via === 'email') {
        const maxReqE = parseInt(settings.rate_limit_email_otp_requests || '0', 10);
        const winMinE = parseInt(settings.rate_limit_email_otp_window_minutes || '0', 10);
        const allowedE = await checkRateLimit(email, 'email', 'send_otp', maxReqE, winMinE);
        if (!allowedE) {
          return new Response(JSON.stringify({ error: `Too many requests. Please try again after ${winMinE} minutes.` }), { status: 429 });
        }
        const result = await sendEmailOTP(email);
        if (result.success) {
          if (result.otp && result.expiry) {
            cookies.set('otp_session_email', buildEmailOtpCookie(email, result.otp, result.expiry), {
              path: '/', httpOnly: true, maxAge: 5 * 60,
            });
          }
          const { otp: _o, expiry: _e, ...safe } = result;
          return new Response(JSON.stringify(safe), { status: 200 });
        }
        return new Response(JSON.stringify({ error: result.error || 'Failed to send email OTP' }), { status: 500 });
      }

      return new Response(JSON.stringify({ error: 'Invalid configuration' }), { status: 500 });

    } catch (error: any) {
      console.error('Rider send OTP error:', error);
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    }
  });
};
