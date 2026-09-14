/**
 * Twilio OTP Service â€” sends SMS OTP for customer authentication
 * 
 * API Keys are loaded from the mock database settings.
 * Set these keys in Admin â†’ API Settings:
 * - twilio_account_sid: Your Twilio Account SID
 * - twilio_auth_token: Your Twilio Auth Token
 * - twilio_phone_number: Your Twilio Phone Number (e.g. +1XXXXXXXXXX)
 * 
 * For testing without Twilio keys, any 4-digit OTP is accepted (mock mode).
 */

import { getSettings } from './database';
import { getPlatformSettings } from './platform-settings';
import { fetchWithRetry } from './fetch-retry';
import crypto from 'node:crypto';

export async function sendOTP(phone: string, hostname?: string, configOverride?: { accountSid?: string; authToken?: string; fromNumber?: string; storeName?: string; otpLength?: string }): Promise<{ success: boolean; mock: boolean; bypassOTP?: boolean; error?: string; otp?: string; expiry?: number }> {
  const settings = await getSettings();
  const platformSettings = await getPlatformSettings();
  
  const accountSid = configOverride?.accountSid || settings.twilio_account_sid || platformSettings.twilio_account_sid;
  const authToken = configOverride?.authToken || settings.twilio_auth_token || platformSettings.twilio_auth_token;
  const fromNumber = configOverride?.fromNumber || settings.twilio_phone_number || platformSettings.twilio_phone_number;


  // Generate OTP based on length setting
  const otpLength = parseInt(configOverride?.otpLength || settings.otp_length || '4', 10);
  const min = Math.pow(10, otpLength - 1);
  const max = Math.pow(10, otpLength) - 1;
  const otp = crypto.randomInt(min, max + 1).toString();
  const expiry = Date.now() + 5 * 60 * 1000; // 5 minutes

  if (!accountSid || !authToken || !fromNumber) {
    console.error('[Twilio] Missing Twilio credentials and Test Mode is OFF');
    return { success: false, mock: false, error: 'SMS service not configured. Please contact admin.' };
  }

  try {
    const actualStoreName = configOverride?.storeName || settings.store_name || platformSettings.platform_name || 'Store Name';
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    let messageBody = `Your ${actualStoreName} verification code is: ${otp}. Valid for 5 minutes.`;
    if (hostname) {
      const cleanHost = hostname.replace('www.', '');
      messageBody += `\n\n@${cleanHost} #${otp}`;
    }

    const body = new URLSearchParams({
      To: `+91${phone}`,
      From: fromNumber,
      Body: messageBody
    });

    const res = await fetchWithRetry(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${auth}`
      },
      body: body.toString()
    });

    const data = await res.json();
    if (data.sid) {
      return { success: true, mock: false, otp, expiry };
    }
    return { success: false, mock: false, error: data.message || 'Failed to send SMS' };
  } catch (err) {
    console.error('[Twilio] Error sending OTP:', err);
    return { success: false, mock: false, error: 'Network error' };
  }
}

export async function verifyOTP(phone: string, userOtp: string, sessionHash?: string, sessionExpiry?: string): Promise<boolean> {
  const settings = await getSettings();
  const platformSettings = await getPlatformSettings();

  const accountSid = settings.twilio_account_sid || platformSettings.twilio_account_sid;
  const authToken = settings.twilio_auth_token || platformSettings.twilio_auth_token;
  const fromNumber = settings.twilio_phone_number || platformSettings.twilio_phone_number;
  
  if (!accountSid || !authToken || !fromNumber) {
    console.error('[Twilio] Cannot verify OTP: Twilio not configured and Test Mode is OFF');
    return false;
  }

  if (!sessionHash || !sessionExpiry) {
    console.error('[Twilio] Missing session hash or expiry');
    return false;
  }

  if (Date.now() > parseInt(sessionExpiry, 10)) {
    console.error('[Twilio] OTP expired');
    return false;
  }

  // Recompute hash
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.JWT_SECRET || '';
  if (!secret) {
    console.error('[Twilio] CRITICAL: No signing secret configured. OTP verification will fail.');
    return false;
  }
  const expectedHash = crypto
    .createHmac('sha256', secret)
    .update(`${phone}:${userOtp}:${sessionExpiry}`)
    .digest('hex');

  return expectedHash === sessionHash;
}
