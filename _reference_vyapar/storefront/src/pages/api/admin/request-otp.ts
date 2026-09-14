import { TABLES } from '../../../lib/constants';
import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/database';
import { getPlatformSettings } from '../../../lib/platform-settings';
import { sendEmailOTP } from '../../../lib/email-otp';
import { getEffectiveAuthMode } from '../../../lib/auth';
import { isRateLimited, getClientIp } from '../../../lib/rateLimit';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request, locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    if (!supabaseAdmin) {
        return new Response(JSON.stringify({ error: "Database client not configured" }), { status: 500 });
      }
    try {
        const { phone, email, isOnboarding } = await request.json();
        const settings = await getPlatformSettings();
        const { authMode: mode } = await getEffectiveAuthMode(locals.storeId);

        // Global IP Rate Limit: Max 20 OTP requests per hour per IP
        const clientIp = getClientIp(request);
        if (await isRateLimited(`ip_${clientIp}`, 3600, 20)) {
          return new Response(JSON.stringify({ error: 'Too many requests from this IP. Please try again later.' }), { status: 429 });
        }
    
        // Validation
        if (mode === 'email_only' && !email) {
          return new Response(JSON.stringify({ error: "Email is required" }), { status: 400 });
        }
        if (mode === 'phone_only' && !phone) {
          return new Response(JSON.stringify({ error: "Phone is required" }), { status: 400 });
        }
        if (mode === 'both' && !phone && !email) {
          return new Response(JSON.stringify({ error: "Phone or Email is required" }), { status: 400 });
        }
    
        const identifier = email || phone;
        const isEmail = !!email;
    
        // --- RATE LIMITING CHECK ---
        const RATE_LIMIT_MAX = 5;
        const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
    
        const { data: rateData, error: rateError } = await supabaseAdmin
          .from(TABLES.AUTH_RATE_LIMITS)
          .select('*')
          .eq('identifier', identifier)
          .single();
    
        if (rateData) {
          if (new Date() > new Date(rateData.reset_time)) {
            // Window expired, reset count
            await supabaseAdmin.from(TABLES.AUTH_RATE_LIMITS)
              .update({ requests_count: 1, reset_time: new Date(Date.now() + RATE_LIMIT_WINDOW_MS).toISOString() })
              .eq('identifier', identifier);
          } else if (rateData.requests_count >= RATE_LIMIT_MAX) {
            return new Response(JSON.stringify({ error: "Too many OTP requests. Please try again after 10 minutes." }), { status: 429 });
          } else {
            // Increment count
            await supabaseAdmin.from(TABLES.AUTH_RATE_LIMITS)
              .update({ requests_count: rateData.requests_count + 1 })
              .eq('identifier', identifier);
          }
        } else if (rateError && rateError.code === 'PGRST116') {
          // Not found, create new record
          await supabaseAdmin.from(TABLES.AUTH_RATE_LIMITS).insert({
            identifier,
            requests_count: 1,
            reset_time: new Date(Date.now() + RATE_LIMIT_WINDOW_MS).toISOString()
          });
        }
        // --- END RATE LIMITING ---
    
        // 1. Verify if this belongs to a store (unless onboarding)
        if (!isOnboarding) {
          const storeIdFromContext = locals?.storeId;
          if (storeIdFromContext === 'SUPER_ADMIN_BYPASS') {
            return new Response(JSON.stringify({ error: "Sellers must log in from their specific store subdomain (e.g. your-store.vyaparpe.in)" }), { status: 403 });
          }
    
          const column = isEmail ? 'owner_email' : 'owner_phone';
          const { data: store, error } = await supabaseAdmin
            .from(TABLES.STORES)
            .select('id, name')
            .eq(column, identifier)
            .eq('id', storeIdFromContext)
            .single();
    
          if (error || !store) {
            return new Response(JSON.stringify({ error: `Store not found for this ${isEmail ? 'email' : 'phone'} on this subdomain.` }), { status: 404 });
          }
        }
    
        // 2. Generate and Send OTP
        if (isEmail) {
          // If onboarding, force platform settings. Otherwise, let sendEmailOTP fetch store settings and fallback to platform settings.
          const configOverride = isOnboarding ? {
            resendKey: settings.resend_api_key || '',
            storeName: "VyaparPe Platform",
            otpLength: settings.otp_length || "4"
          } : undefined;
    
          if (isOnboarding && !settings.resend_api_key) {
            return new Response(JSON.stringify({ error: "Email service not configured globally. Please contact VyaparPe support." }), { status: 500 });
          }
    
          const result = await sendEmailOTP(email, configOverride);
          if (!result.success) {
            return new Response(JSON.stringify({ error: result.error }), { status: 500 });
          }
    
          return new Response(JSON.stringify({ 
            success: true, 
            message: "OTP sent to email",
            sessionHash: result.hash,
            sessionExpiry: result.expiry
          }), { status: 200 });
    
        } else {
          const configOverrideTwilio = isOnboarding ? {
            accountSid: settings.twilio_account_sid || '',
            authToken: settings.twilio_auth_token || '',
            fromNumber: settings.twilio_phone_number || '',
            storeName: "VyaparPe Platform",
            otpLength: settings.otp_length || "4"
          } : undefined;

          const { sendOTP } = await import('../../../lib/twilio');
          const result = await sendOTP(phone, undefined, configOverrideTwilio);
          if (!result.success && !result.mock) {
            return new Response(JSON.stringify({ error: result.error || 'Failed to send SMS OTP' }), { status: 500 });
          }
          
          let sessionHash = undefined;
          if (!result.mock && result.otp && result.expiry) {
            const crypto = await import('node:crypto');
            const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.JWT_SECRET || '';
            sessionHash = crypto.default.createHmac('sha256', secret)
                .update(`${phone}:${result.otp}:${result.expiry}`).digest('hex');
          }
          
          return new Response(JSON.stringify({ 
            success: true, 
            message: "OTP sent to phone",
            sessionHash: sessionHash,
            sessionExpiry: result.expiry
          }), { status: 200 });
        }
    
      } catch (error: any) {
        console.error('Request OTP error:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }
  });
};
