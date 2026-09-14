import { verifyCustomerAuth, signCustomerAuth, getEffectiveAuthMode } from '../../../lib/auth';
import type { APIRoute } from 'astro';
import { saveCustomer, getSettings, getCustomerByEmail, getCustomerByPhone, incrementFailedOtpAttempt, clearFailedOtpAttempts } from '../../../lib/database';
import { verifyOTP } from '../../../lib/twilio';
import { verifyEmailOTP } from '../../../lib/email-otp';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request, cookies , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    try {
        const body = await request.json();
        const settings = await getSettings();
        const { authMode } = await getEffectiveAuthMode(locals.storeId);
    
        function parseSession(val: string | undefined): { hash?: string; expiry?: string; attempts: number } {
          if (!val) return { attempts: 0 };
          const parts = val.split('.');
          return { 
            hash: parts[0], 
            expiry: parts[1], 
            attempts: parts[2] ? parseInt(parts[2], 10) : 0 
          };
        }
    
        // ── PHONE ONLY ───────────────────────────────────────────────────────
        if (authMode === 'phone_only') {
          const { phone, otp } = body;
          if (!phone || !otp) return new Response(JSON.stringify({ error: 'Missing phone or OTP' }), { status: 400 });
    
          const { hash, expiry } = parseSession(cookies.get('otp_session_phone')?.value);
          const maxAttempts = parseInt(settings.rate_limit_phone_otp_attempts || '5', 10) || 5;
          
          if (!await incrementFailedOtpAttempt(phone, 'phone', maxAttempts)) {
            cookies.delete('otp_session_phone', { path: '/' });
            return new Response(JSON.stringify({ error: 'Too many failed attempts. Please request a new OTP.' }), { status: 429 });
          }
    
          if (!await verifyOTP(phone, otp, hash, expiry)) {
            return new Response(JSON.stringify({ error: 'Invalid or expired OTP' }), { status: 400 });
          }
          
          await clearFailedOtpAttempts(phone, 'phone');
          cookies.delete('otp_session_phone', { path: '/' });
          const customer = await saveCustomer({ phone });
          cookies.set('customer_auth', signCustomerAuth(customer.id), { path: '/', maxAge: 60 * 60 * 24 * 30, httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
          cookies.set('login_method', 'phone', { path: '/', maxAge: 60 * 60 * 24 * 30, httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
          return new Response(JSON.stringify({ success: true }), { status: 200 });
        }
    
        // ── EMAIL ONLY ───────────────────────────────────────────────────────
        if (authMode === 'email_only') {
          const { email, otp } = body;
          if (!email || !otp) return new Response(JSON.stringify({ error: 'Missing email or OTP' }), { status: 400 });
    
          const { hash, expiry } = parseSession(cookies.get('otp_session_email')?.value);
          const maxAttempts = parseInt(settings.rate_limit_email_otp_attempts || '5', 10) || 5;
          
          if (!await incrementFailedOtpAttempt(email, 'email', maxAttempts)) {
            cookies.delete('otp_session_email', { path: '/' });
            return new Response(JSON.stringify({ error: 'Too many failed attempts. Please request a new OTP.' }), { status: 429 });
          }
    
          if (!await verifyEmailOTP(email, otp, hash, expiry)) {
            return new Response(JSON.stringify({ error: 'Invalid or expired OTP' }), { status: 400 });
          }
          
          await clearFailedOtpAttempts(email, 'email');
          cookies.delete('otp_session_email', { path: '/' });
    
          const existing = await getCustomerByEmail(email);
          if (existing) {
            // Returning email-only user
            cookies.set('customer_auth', signCustomerAuth(existing.id), { path: '/', maxAge: 60 * 60 * 24 * 30, httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
            cookies.set('login_method', 'email', { path: '/', maxAge: 60 * 60 * 24 * 30, httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
          } else {
            // New email-only user
            const customer = await saveCustomer({ email });
            cookies.set('customer_auth', signCustomerAuth(customer.id), { path: '/', maxAge: 60 * 60 * 24 * 30, httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
            cookies.set('login_method', 'email', { path: '/', maxAge: 60 * 60 * 24 * 30, httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
          }
          return new Response(JSON.stringify({ success: true }), { status: 200 });
        }
    
        // ── BOTH MODE ────────────────────────────────────────────────────────
        if (authMode === 'both') {
          const { phone, email, otp, via } = body;
    
          if (via === 'phone') {
            // Verify phone OTP → login
            if (!phone || !otp) return new Response(JSON.stringify({ error: 'Missing phone or OTP' }), { status: 400 });
            const { hash, expiry } = parseSession(cookies.get('otp_session_phone')?.value);
            const maxAttempts = parseInt(settings.rate_limit_phone_otp_attempts || '5', 10) || 5;
            
            if (!await incrementFailedOtpAttempt(phone, 'phone', maxAttempts)) {
              cookies.delete('otp_session_phone', { path: '/' });
              return new Response(JSON.stringify({ error: 'Too many failed attempts. Please request a new OTP.' }), { status: 429 });
            }
    
            if (!await verifyOTP(phone, otp, hash, expiry)) {
              return new Response(JSON.stringify({ error: 'Invalid or expired OTP' }), { status: 400 });
            }
            
            await clearFailedOtpAttempts(phone, 'phone');
            cookies.delete('otp_session_phone', { path: '/' });
    
            const existingCustomer = await getCustomerByPhone(phone);
            const source = body.source;
    
            if (!existingCustomer && source === 'login') {
                // New user on main login page in BOTH mode
                cookies.set('pending_signup_phone', phone, { path: '/', maxAge: 60 * 15, httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
                return new Response(JSON.stringify({ requireEmailSignup: true }), { status: 200 });
            }
    
            // Save customer
            const customer = await saveCustomer({ phone });
            cookies.set('customer_auth', signCustomerAuth(customer.id), { path: '/', maxAge: 60 * 60 * 24 * 30, httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
            cookies.set('login_method', 'phone', { path: '/', maxAge: 60 * 60 * 24 * 30, httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
            return new Response(JSON.stringify({ success: true }), { status: 200 });
          }
    
          if (via === 'email_signup') {
             // Step 2 of dual-verification for new users
             const pendingPhone = cookies.get('pending_signup_phone')?.value;
             if (!pendingPhone) {
               return new Response(JSON.stringify({ error: 'Phone verification expired. Please start over.' }), { status: 400 });
             }
             
             if (!email || !otp) return new Response(JSON.stringify({ error: 'Missing email or OTP' }), { status: 400 });
             const { hash, expiry } = parseSession(cookies.get('otp_session_email')?.value);
             const maxAttempts = parseInt(settings.rate_limit_email_otp_attempts || '5', 10) || 5;
             
             if (!await incrementFailedOtpAttempt(email, 'email', maxAttempts)) {
               cookies.delete('otp_session_email', { path: '/' });
               return new Response(JSON.stringify({ error: 'Too many failed attempts. Please request a new OTP.' }), { status: 429 });
             }
    
             if (!await verifyEmailOTP(email, otp, hash, expiry)) {
               return new Response(JSON.stringify({ error: 'Invalid or expired OTP' }), { status: 400 });
             }
             
             await clearFailedOtpAttempts(email, 'email');
             cookies.delete('otp_session_email', { path: '/' });
             
             // Check if email already belongs to another account to prevent duplicate email issues
             const existingEmailCustomer = await getCustomerByEmail(email);
             if (existingEmailCustomer) {
               return new Response(JSON.stringify({ error: 'This email is already registered to another account. Please login instead.' }), { status: 409 });
             }

             cookies.delete('pending_signup_phone', { path: '/' });
             
             // Create the customer with both phone and email
             const customer = await saveCustomer({ phone: pendingPhone, email });
             cookies.set('customer_auth', signCustomerAuth(customer.id), { path: '/', maxAge: 60 * 60 * 24 * 30, httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
             cookies.set('login_method', 'email', { path: '/', maxAge: 60 * 60 * 24 * 30, httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
             return new Response(JSON.stringify({ success: true }), { status: 200 });
          }
    
          if (via === 'email') {
            // Verify email OTP → login
            if (!email || !otp) return new Response(JSON.stringify({ error: 'Missing email or OTP' }), { status: 400 });
            const { hash, expiry } = parseSession(cookies.get('otp_session_email')?.value);
            const maxAttempts = parseInt(settings.rate_limit_email_otp_attempts || '5', 10) || 5;
            
            if (!await incrementFailedOtpAttempt(email, 'email', maxAttempts)) {
              cookies.delete('otp_session_email', { path: '/' });
              return new Response(JSON.stringify({ error: 'Too many failed attempts. Please request a new OTP.' }), { status: 429 });
            }
    
            if (!await verifyEmailOTP(email, otp, hash, expiry)) {
              return new Response(JSON.stringify({ error: 'Invalid or expired OTP' }), { status: 400 });
            }
            
            await clearFailedOtpAttempts(email, 'email');
            cookies.delete('otp_session_email', { path: '/' });
            
            const existing = await getCustomerByEmail(email);
            if (!existing) {
              return new Response(JSON.stringify({ error: 'Account not found. Please login with your phone number.' }), { status: 404 });
            }
            cookies.set('customer_auth', signCustomerAuth(existing.id), { path: '/', maxAge: 60 * 60 * 24 * 30, httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
            cookies.set('login_method', 'email', { path: '/', maxAge: 60 * 60 * 24 * 30, httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
            return new Response(JSON.stringify({ success: true }), { status: 200 });
          }
    
          return new Response(JSON.stringify({ error: 'Missing via parameter (phone or email)' }), { status: 400 });
        }
    
        return new Response(JSON.stringify({ error: 'Unknown auth mode' }), { status: 400 });
      } catch (error) {
        console.error('Login error:', error);
        return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
      }
  });
};
