import type { APIRoute } from 'astro';
import { getAffiliates, saveAffiliate, getSettings, incrementFailedOtpAttempt, clearFailedOtpAttempts } from '../../../lib/database';
import { verifyOTP } from '../../../lib/twilio';
import { verifyEmailOTP } from '../../../lib/email-otp';
import { sendNotifications } from '../../../lib/notifications';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request, cookies , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    try {
        const body = await request.json();
        const { action, otp, via, ...details } = body;
        // action is 'login' or 'register'
        // via is 'phone' or 'email'
        // details contains phone, email, name, etc.
    
        const settings = await getSettings();
    
        function parseSession(val: string | undefined): { hash?: string; expiry?: string; attempts: number } {
          if (!val) return { attempts: 0 };
          const parts = val.split('.');
          return { 
            hash: parts[0], 
            expiry: parts[1], 
            attempts: parts[2] ? parseInt(parts[2], 10) : 0 
          };
        }
    
        if (via === 'phone') {
          const phone = details.phone;
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
    
        } else if (via === 'email') {
          const email = details.email;
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
    
        } else {
          return new Response(JSON.stringify({ error: 'Missing via parameter' }), { status: 400 });
        }
    
        // OTP is verified. Now proceed with login or register
        const allAffiliates = await getAffiliates();
    
        if (action === 'login') {
          let affiliate = null;
          if (via === 'phone') {
            affiliate = allAffiliates.find((a: any) => a.phone === details.phone);
          } else {
            affiliate = allAffiliates.find((a: any) => a.email === details.email);
          }
    
          if (!affiliate) {
            return new Response(JSON.stringify({ error: 'Affiliate account not found. Please apply first.' }), { status: 404 });
          }
    
          if (affiliate.status === 'banned') {
            return new Response(JSON.stringify({ error: 'Your affiliate account has been suspended. Please contact support.' }), { status: 403 });
          }
    
          // Login successful
          cookies.set('vyaparpe_affiliate_id', affiliate.id, { path: '/', maxAge: 60 * 60 * 24 * 30, httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
          return new Response(JSON.stringify({ success: true, user: affiliate }), { status: 200 });
        }
    
        if (action === 'register') {
          // Check if email or phone already exists
          const exists = allAffiliates.find((a: any) => a.email === details.email || a.phone === details.phone);
          if (exists) {
            return new Response(JSON.stringify({ error: 'An affiliate with this email or phone already exists.' }), { status: 400 });
          }
    
          const baseName = details.name ? details.name.split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '') : 'AFF';
          const defaultReferralCode = baseName + Math.floor(1000 + Math.random() * 9000);
    
          // Create new affiliate
          const newAffiliate = await saveAffiliate({
            name: details.name,
            email: details.email,
            phone: details.phone,
            password_hash: '', // Deprecated password field
            referral_code: defaultReferralCode,
            instagram_handle: details.instagram || null,
            upi_id: details.upi_id || null,
            bank_account_name: details.bank_account_name || null,
            bank_account_number: details.bank_account_number || null,
            bank_ifsc: details.bank_ifsc || null,
          });
    
          // Send Admin Notification
          sendNotifications({
            type: 'affiliate_application',
            affiliateName: details.name,
            affiliateEmail: details.email,
            affiliatePhone: details.phone,
            affiliateInsta: details.instagram,
          }).catch(console.error);
    
          // Login immediately after register
          cookies.set('vyaparpe_affiliate_id', newAffiliate.id, { path: '/', maxAge: 60 * 60 * 24 * 30, httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
          return new Response(JSON.stringify({ success: true, user: newAffiliate }), { status: 200 });
        }
    
        return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 });
      } catch (error: any) {
        console.error('Verify OTP error:', error);
        return new Response(JSON.stringify({ error: error.message || 'Server error' }), { status: 500 });
      }
  });
};
