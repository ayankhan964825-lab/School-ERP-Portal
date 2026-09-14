import type { APIRoute } from 'astro';
import { sendOTP } from '../../../lib/twilio';
import { sendEmailOTP, buildEmailOtpCookie } from '../../../lib/email-otp';
import { getSettings, getCustomerByPhone, checkRateLimit } from '../../../lib/database';
import { isRateLimited, getClientIp } from '../../../lib/rateLimit';
import { getEffectiveAuthMode } from '../../../lib/auth';
import crypto from 'node:crypto';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request, cookies , locals }) => {
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
    
        // ── PHONE ONLY (default) ─────────────────────────────────────────────
        if (authMode === 'phone_only') {
          const { phone } = body;
          if (!phone || phone.length !== 10 || !/^\d+$/.test(phone)) {
            return new Response(JSON.stringify({ error: 'Invalid phone number' }), { status: 400 });
          }
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
              if (!secret) {
                return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 500 });
              }
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
        if (authMode === 'email_only') {
          const { email } = body;
          if (!email || !email.includes('@')) {
            return new Response(JSON.stringify({ error: 'Invalid email address' }), { status: 400 });
          }
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
    
        // ── BOTH MODE ────────────────────────────────────────────────────────
        // New user       → phone OTP only (email added later from profile)
        // Returning user, email NOT verified → phone OTP
        // Returning user, BOTH phone+email verified → email OTP only
        if (authMode === 'both') {
          const { phone, email } = body;
    
          // If email is provided → returning user with both verified, send email OTP
          if (email && !phone) {
            if (!email.includes('@')) {
              return new Response(JSON.stringify({ error: 'Invalid email address' }), { status: 400 });
            }
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
              return new Response(JSON.stringify({ ...safe, via: 'email' }), { status: 200 });
            }
            return new Response(JSON.stringify({ error: result.error || 'Failed to send email OTP' }), { status: 500 });
          }
    
          // Phone provided → new user OR returning user without email verified → send phone OTP
          if (phone) {
            if (phone.length !== 10 || !/^\d+$/.test(phone)) {
              return new Response(JSON.stringify({ error: 'Invalid phone number' }), { status: 400 });
            }
            
            // Enforce the rule: if both are verified, they MUST use email to login (saves SMS cost)
            const existingCustomer = await getCustomerByPhone(phone);
            if (existingCustomer && existingCustomer.email) {
              return new Response(JSON.stringify({ 
                error: 'Your email is verified. Please switch to Email Login to receive your OTP.' 
              }), { status: 400 });
            }
    
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
              if (!secret) {
                return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 500 });
              }
              const hash = crypto.createHmac('sha256', secret)
                  .update(`${phone}:${result.otp}:${result.expiry}`).digest('hex');
                cookies.set('otp_session_phone', `${hash}.${result.expiry}.0`, { path: '/', httpOnly: true, maxAge: 5 * 60 });
              }
              const { otp: _o, expiry: _e, ...safe } = result;
              return new Response(JSON.stringify({ ...safe, via: 'phone' }), { status: 200 });
            }
            return new Response(JSON.stringify({ error: result.error || 'Failed to send SMS OTP' }), { status: 500 });
          }
    
          return new Response(JSON.stringify({ error: 'Provide phone or email' }), { status: 400 });
        }
    
        return new Response(JSON.stringify({ error: 'Unknown auth mode' }), { status: 400 });
      } catch (error) {
        console.error('Send OTP error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
      }
  });
};
