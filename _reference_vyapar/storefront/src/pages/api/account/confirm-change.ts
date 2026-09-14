import { verifyCustomerAuth, signCustomerAuth } from '../../../lib/auth';
import type { APIRoute } from 'astro';
import { verifyOTP } from '../../../lib/twilio';
import { verifyEmailOTP } from '../../../lib/email-otp';
import { getCustomerByPhone, getCustomerByEmail, saveCustomer, getSettings, incrementFailedOtpAttempt, clearFailedOtpAttempts } from '../../../lib/database';
import { getEffectiveAuthMode } from '../../../lib/auth';
import crypto from 'node:crypto';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request, cookies , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    try {
        const body = await request.json();
        const { changeType, newValue, otp } = body;
    
        const authCookie = verifyCustomerAuth(cookies.get('customer_auth')?.value) || '';
        const loginMethod = cookies.get('login_method')?.value || '';
        const isEmailAuth = loginMethod === 'email' || authCookie.startsWith('email:');
        
        let verifiedPhone: string | null = null;
        let verifiedEmail: string | null = null;
    
        if (isEmailAuth) {
          verifiedEmail = authCookie.startsWith('email:') ? authCookie.replace('email:', '') : (await getCustomerByPhone(authCookie))?.email || null;
        } else if (authCookie) {
          verifiedPhone = authCookie.replace(/\D/g, '').slice(-10);
        }
    
        if (!authCookie) {
          return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
        }
    
        // 1. Check Unlock Token (If they had an old verified credential)
        const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.JWT_SECRET || 'fallback';
        const expectedToken = crypto.createHmac('sha256', secret).update(`unlocked:${authCookie}`).digest('hex');
        const providedToken = cookies.get('profile_unlock_token')?.value;

        if (changeType === 'email' && verifiedEmail) {
            if (providedToken !== expectedToken) return new Response(JSON.stringify({ error: 'Session not unlocked' }), { status: 403 });
        } else if (changeType === 'phone' && verifiedPhone) {
            if (providedToken !== expectedToken) return new Response(JSON.stringify({ error: 'Session not unlocked' }), { status: 403 });
        }

        // 2. Determine if OTP is required for this new credential
        let requiresOtp = true;
        
        if (changeType === 'phone') {
            const { hasTwilio } = await getEffectiveAuthMode(locals.storeId);
            if (!hasTwilio) {
                requiresOtp = false; // Bypass if Twilio is completely disabled for the store
            }
        }

        if (requiresOtp) {
            if (!otp) return new Response(JSON.stringify({ error: 'Missing OTP' }), { status: 400 });
            
            const sessionCookie = cookies.get('new_credential_otp_session')?.value;
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
            if (changeType === 'email') {
                const settings = await getSettings();
                const maxAttempts = parseInt(settings.rate_limit_email_otp_attempts || '5', 10) || 5;
                if (!await incrementFailedOtpAttempt(newValue, 'email', maxAttempts)) {
                    cookies.delete('new_credential_otp_session', { path: '/' });
                    return new Response(JSON.stringify({ error: 'Too many failed attempts. Request a new OTP.' }), { status: 429 });
                }
                isValid = await verifyEmailOTP(newValue, otp, sessionHash, sessionExpiry);
                if (isValid) await clearFailedOtpAttempts(newValue, 'email');
            } else if (changeType === 'phone') {
                const settings = await getSettings();
                const maxAttempts = parseInt(settings.rate_limit_phone_otp_attempts || '5', 10) || 5;
                if (!await incrementFailedOtpAttempt(newValue, 'phone', maxAttempts)) {
                    cookies.delete('new_credential_otp_session', { path: '/' });
                    return new Response(JSON.stringify({ error: 'Too many failed attempts. Request a new OTP.' }), { status: 429 });
                }
                isValid = await verifyOTP(newValue, otp, sessionHash, sessionExpiry);
                if (isValid) await clearFailedOtpAttempts(newValue, 'phone');
            }

            if (!isValid) {
                return new Response(JSON.stringify({ error: 'Invalid or expired OTP' }), { status: 400 });
            }
        }
    
        // Clear sessions
        cookies.delete('new_credential_otp_session', { path: '/' });
        cookies.delete('profile_unlock_token', { path: '/' });
    
        // 3. Apply the change
        if (changeType === 'phone') {
          if (!/^\d{10}$/.test(newValue)) return new Response(JSON.stringify({ error: 'Invalid phone number format' }), { status: 400 });
          
          const existing = await getCustomerByPhone(newValue);
          if (existing) return new Response(JSON.stringify({ error: 'This phone number is already registered' }), { status: 409 });
    
          if (verifiedPhone) {
            await saveCustomer({ phone: verifiedPhone, new_phone: newValue });
          } else if (verifiedEmail) {
            const cust = await getCustomerByEmail(verifiedEmail);
            if (cust) await saveCustomer({ phone: cust.phone || undefined, email: verifiedEmail, new_phone: newValue });
          }
    
          return new Response(JSON.stringify({ success: true, message: 'Phone number updated successfully' }), { status: 200 });
    
        } else if (changeType === 'email') {
          if (!newValue.includes('@') || !newValue.includes('.')) return new Response(JSON.stringify({ error: 'Invalid email format' }), { status: 400 });
          
          const existing = await getCustomerByEmail(newValue);
          if (existing) return new Response(JSON.stringify({ error: 'This email is already registered' }), { status: 409 });
    
          if (verifiedEmail) {
            await saveCustomer({ email: verifiedEmail, new_email: newValue });
          } else if (verifiedPhone) {
            await saveCustomer({ phone: verifiedPhone, email: newValue });
          }
    
          return new Response(JSON.stringify({ success: true, message: 'Email updated successfully' }), { status: 200 });
        }
      } catch (error) {
        console.error('confirm-change error:', error);
        return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
      }
  });
};
