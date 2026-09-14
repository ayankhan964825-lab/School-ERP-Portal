/**
 * Email OTP Service – sends OTP via Resend for customer authentication
 *
 * API Keys are loaded from admin settings (stored in DB).
 * Set these in Admin → Settings → Notifications:
 * - resend_api_key: Your Resend.com API Key
 * - contact_email:  The "from" email (must be verified in Resend)
 *
 * For testing without Resend keys, any 4-digit OTP is accepted (mock mode).
 */

import { getSettings } from './database';
import { getPlatformSettings } from './platform-settings';
import crypto from 'node:crypto';

export async function sendEmailOTP(email: string, configOverride?: { resendKey: string; storeName: string; otpLength: string }): Promise<{
  success: boolean;
  mock: boolean;
  bypassOTP?: boolean;
  error?: string;
  otp?: string;
  expiry?: number;
  hash?: string;
}> {
  const settings = configOverride ? {} as any : await getSettings();
  const platformSettings = await getPlatformSettings();
  const resendKey = configOverride?.resendKey || settings.resend_api_key || platformSettings.resend_api_key;

  // Generate OTP based on length setting
  const otpLength = parseInt(configOverride?.otpLength || settings.otp_length || '4', 10);
  const min = Math.pow(10, otpLength - 1);
  const max = Math.pow(10, otpLength) - 1;
  const otp = crypto.randomInt(min, max + 1).toString();
  const expiry = Date.now() + 5 * 60 * 1000; // 5 minutes

  if (!resendKey) {
    console.error('[EmailOTP] Missing Resend API key and Test Mode is OFF');
    return {
      success: false,
      mock: false,
      error: 'Email service not configured. Please contact admin.',
    };
  }

  const actualStoreName = configOverride?.storeName || settings.store_name || 'Store Name';
  const platformName = platformSettings.platform_name || 'VyaparPe';
  
  // If the tenant hasn't provided their own key, it falls back to the VyaparPe platform key
  const isPlatformFallback = !configOverride?.resendKey && !settings.resend_api_key && !!platformSettings.resend_api_key;
  
  // Dynamically determine verified domain
  let tenantDomain = process.env.PUBLIC_DOMAIN || 'vyaparpe.in'; // Dynamic fallback
  if (settings?.contact_email && settings.contact_email.includes('@')) {
    const domain = settings.contact_email.split('@')[1].toLowerCase();
    const publicDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'aol.com'];
    if (!publicDomains.includes(domain)) {
      tenantDomain = domain;
    }
  }

  // Branding Logic
  const displayName = actualStoreName;
  const currentYear = new Date().getFullYear();
  
  const footerBranding = isPlatformFallback 
    ? `<div style="padding: 20px 32px; background-color: #f9fafb; border-top: 1px solid #f3f4f6; text-align: center;"><p style="margin: 0; font-size: 12px; color: #9ca3af;">&copy; ${currentYear} ${platformName}. All rights reserved.</p></div>` 
    : `<div style="padding: 20px 32px; background-color: #f9fafb; border-top: 1px solid #f3f4f6; text-align: center;"><p style="margin: 0; font-size: 12px; color: #9ca3af;">Powered by <strong style="color: #6b7280;">${platformName}</strong></p></div>`;

  // Always send FROM the verified domain, use contact_email as reply-to if set
  const fromEmail = isPlatformFallback
    ? `${displayName} <noreply@auth.vyaparpe.in>`
    : `${displayName} <noreply@auth.${tenantDomain}>`;

  const payload: any = {
    from: fromEmail,
    to: [email],
    subject: `${otp} is your verification code for ${displayName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; padding: 40px 20px; text-align: center;">
        <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); text-align: left;">
          
          <div style="padding: 24px 32px; border-bottom: 1px solid #f3f4f6; text-align: center;">
            <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #111827; letter-spacing: -0.5px;">${displayName}</h1>
          </div>
          
          <div style="padding: 32px;">
            <p style="font-size: 16px; color: #374151; margin-top: 0; margin-bottom: 16px;">Hello,</p>
            <p style="font-size: 15px; color: #4b5563; line-height: 1.5; margin-top: 0; margin-bottom: 24px;">Please use the verification code below to securely log in to your account.</p>
            
            <div style="background-color: #f3f4f6; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
              <p style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 36px; font-weight: 700; color: #111827; letter-spacing: 8px; margin: 0;">${otp}</p>
            </div>
            
            <p style="font-size: 13px; color: #6b7280; line-height: 1.5; margin: 0;">This code will expire in <strong>5 minutes</strong>. If you didn't request this, you can safely ignore this email.</p>
          </div>
          
          ${footerBranding}
          
        </div>
      </div>
    `,
    text: `Your ${displayName} verification code is: ${otp}. Valid for 5 minutes. Do not share this code.`,
  };

  if (settings?.contact_email) {
    payload.reply_to = settings.contact_email;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const hash = crypto
        .createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.JWT_SECRET || '')
        .update(`email:${email}:${otp}:${expiry}`)
        .digest('hex');
      return { success: true, mock: false, otp, expiry, hash };
    }
    const err = await res.json().catch(() => ({}));
    console.error('[EmailOTP] Resend API error:', err);
    return {
      success: false,
      mock: false,
      error: (err as any)?.message || 'Failed to send email OTP',
    };
  } catch (err) {
    console.error('[EmailOTP] Network error:', err);
    return { success: false, mock: false, error: 'Network error sending email' };
  }
}

export async function verifyEmailOTP(
  email: string,
  userOtp: string,
  sessionHash?: string,
  sessionExpiry?: string,
  configOverride?: { resendKey: string }
): Promise<boolean> {
  const settings = configOverride ? {} as any : await getSettings();
  const platformSettings = await getPlatformSettings();

  const resendKey = configOverride?.resendKey || settings.resend_api_key || platformSettings.resend_api_key;
  if (!resendKey) {
    console.error('[EmailOTP] Cannot verify OTP: Resend not configured and Test Mode is OFF');
    return false;
  }

  if (!sessionHash || !sessionExpiry) {
    console.error('[EmailOTP] Missing session hash or expiry');
    return false;
  }

  if (Date.now() > parseInt(sessionExpiry, 10)) {
    console.error('[EmailOTP] Email OTP expired');
    return false;
  }

  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.JWT_SECRET || '';
  if (!secret) {
    console.error('[EmailOTP] CRITICAL: No signing secret configured. OTP verification will fail.');
    return false;
  }
  const expectedHash = crypto
    .createHmac('sha256', secret)
    .update(`email:${email}:${userOtp}:${sessionExpiry}`)
    .digest('hex');

  return expectedHash === sessionHash;
}

/**
 * Build the signed cookie value for an email OTP session
 */
export function buildEmailOtpCookie(email: string, otp: string, expiry: number): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.JWT_SECRET || '';
  if (!secret) {
    console.error('[EmailOTP] CRITICAL: No signing secret configured. Cookie creation failed.');
    return '';
  }
  const hash = crypto
    .createHmac('sha256', secret)
    .update(`email:${email}:${otp}:${expiry}`)
    .digest('hex');
  return `${hash}.${expiry}.0`;
}

