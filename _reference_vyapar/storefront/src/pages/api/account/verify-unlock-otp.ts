import { verifyCustomerAuth } from '../../../lib/auth';
import type { APIRoute } from 'astro';
import { verifyOTP } from '../../../lib/twilio';
import { verifyEmailOTP } from '../../../lib/email-otp';
import { getCustomerByPhone, getCustomerByEmail, getSettings, incrementFailedOtpAttempt, clearFailedOtpAttempts } from '../../../lib/database';
import crypto from 'node:crypto';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    try {
        const body = await request.json();
        const { changeType, otp } = body;
    
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
        
        const authCookie = customerId; // maintain for HMAC hashing
    
        if (!otp) return new Response(JSON.stringify({ error: 'Missing OTP' }), { status: 400 });
    
        const sessionCookie = cookies.get('unlock_otp_session')?.value;
        let sessionHash: string | undefined;
        let sessionExpiry: string | undefined;
        if (sessionCookie) {
          const parts = sessionCookie.split('.');
          if (parts.length >= 2) {
            sessionHash = parts[0];
            sessionExpiry = parts[1];
          }
        }
    
        let isValid = false;
        let method: 'email' | 'phone' = 'email';
    
        if (changeType === 'email') {
          if (!customerEmail) return new Response(JSON.stringify({ error: 'No existing email to verify' }), { status: 400 });
          method = 'email';
          
          const settings = await getSettings();
          const maxAttempts = parseInt(settings.rate_limit_email_otp_attempts || '5', 10) || 5;
          if (!await incrementFailedOtpAttempt(customerEmail, 'email', maxAttempts)) {
            cookies.delete('unlock_otp_session', { path: '/' });
            return new Response(JSON.stringify({ error: 'Too many failed attempts. Request a new OTP.' }), { status: 429 });
          }
          
          isValid = await verifyEmailOTP(customerEmail, otp, sessionHash, sessionExpiry);
          if (isValid) await clearFailedOtpAttempts(customerEmail, 'email');
    
        } else if (changeType === 'phone') {
          if (!customerPhone) return new Response(JSON.stringify({ error: 'No existing phone to verify' }), { status: 400 });
          method = 'phone';
          
          const settings = await getSettings();
          const maxAttempts = parseInt(settings.rate_limit_phone_otp_attempts || '5', 10) || 5;
          if (!await incrementFailedOtpAttempt(customerPhone, 'phone', maxAttempts)) {
            cookies.delete('unlock_otp_session', { path: '/' });
            return new Response(JSON.stringify({ error: 'Too many failed attempts. Request a new OTP.' }), { status: 429 });
          }
          
          isValid = await verifyOTP(customerPhone, otp, sessionHash, sessionExpiry);
          if (isValid) await clearFailedOtpAttempts(customerPhone, 'phone');
    
        } else {
          return new Response(JSON.stringify({ error: 'Invalid changeType' }), { status: 400 });
        }
    
        if (!isValid) {
          return new Response(JSON.stringify({ error: 'Invalid or expired OTP' }), { status: 400 });
        }
    
        // Success: Unlock profile for this session
        cookies.delete('unlock_otp_session', { path: '/' });
        
        const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.JWT_SECRET || 'fallback';
        const unlockToken = crypto.createHmac('sha256', secret).update(`unlocked:${authCookie}`).digest('hex');
        
        cookies.set('profile_unlock_token', unlockToken, {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 15 * 60, // 15 mins to complete the change
        });
    
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      } catch (error) {
        console.error('verify-unlock-otp error:', error);
        return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
      }
  });
};
