import type { APIRoute } from 'astro';
import { supabaseAdmin, getSettings, incrementFailedOtpAttempt, clearFailedOtpAttempts } from '../../../lib/database';
import { verifyOTP } from '../../../lib/twilio';
import { verifyEmailOTP } from '../../../lib/email-otp';
import { signRiderAuth } from '../../../lib/auth';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    try {
      const body = await request.json();
      const { otp, via, phone, email, action, name, vehicle_type, vehicle_number } = body;
      // via is 'phone' or 'email'

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
        if (!phone || !otp) return new Response(JSON.stringify({ error: 'Missing phone or OTP' }), { status: 400 });

        const { hash, expiry } = parseSession(cookies.get('otp_session_phone')?.value);
        const settings = await getSettings();
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
        if (!email || !otp) return new Response(JSON.stringify({ error: 'Missing email or OTP' }), { status: 400 });

        const { hash, expiry } = parseSession(cookies.get('otp_session_email')?.value);
        const settings = await getSettings();
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
      if (action === 'register') {
        // Check if phone or email already exists
        let checkQuery = supabaseAdmin.from('riders').select('id').eq('store_id', locals.storeId);
        if (via === 'phone') checkQuery = checkQuery.eq('phone', phone);
        else checkQuery = checkQuery.eq('email', email.toLowerCase());

        const { data: existing } = await checkQuery.limit(1);
        if (existing && existing.length > 0) {
          return new Response(JSON.stringify({ error: 'A rider with this phone or email already exists.' }), { status: 400 });
        }

        const { data: newRider, error: insertError } = await supabaseAdmin.from('riders').insert({
          store_id: locals.storeId,
          name: name,
          phone: phone || null,
          email: email ? email.toLowerCase() : null,
          vehicle_type: vehicle_type,
          vehicle_number: vehicle_number || null,
          status: 'pending' // Admin must approve
        }).select().single();

        if (insertError || !newRider) {
          console.error("Rider register error:", insertError);
          return new Response(JSON.stringify({ error: 'Failed to create rider account.' }), { status: 500 });
        }

        // Login immediately after register
        const token = signRiderAuth(newRider.id, locals.storeId || 'test-store');
        cookies.set('vyaparpe_rider_id', token, { 
          path: '/', maxAge: 60 * 60 * 24 * 30, httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' 
        });
        return new Response(JSON.stringify({ success: true, rider: newRider }), { status: 200 });
      }

      // LOGIN FLOW
      let query = supabaseAdmin.from('riders').select('*').eq('store_id', locals.storeId);
      if (via === 'phone') query = query.eq('phone', phone);
      else query = query.eq('email', email.toLowerCase());

      const { data: riders, error } = await query.limit(1);

      if (error || !riders || riders.length === 0) {
        return new Response(JSON.stringify({ error: 'Rider account not found.' }), { status: 404 });
      }

      const rider = riders[0];
      if (rider.status === 'suspended') {
        return new Response(JSON.stringify({ error: `Rider account is suspended. Cannot login.` }), { status: 403 });
      }

      // Login successful
      const token = signRiderAuth(rider.id, locals.storeId || 'test-store');
      
      // Set a secure HttpOnly cookie for Rider session
      cookies.set('vyaparpe_rider_id', token, { 
        path: '/', 
        maxAge: 60 * 60 * 24 * 30, // 30 days
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production', 
        sameSite: 'lax' 
      });

      return new Response(JSON.stringify({ success: true, rider }), { status: 200 });

    } catch (error: any) {
      console.error('Rider verify OTP error:', error);
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    }
  });
};
