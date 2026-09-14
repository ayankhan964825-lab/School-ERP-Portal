import { supabaseAdmin } from './database';

export interface PlatformSettings {
  id?: number;
  auth_mode?: 'phone_only' | 'email_only' | 'both';
  otp_length?: string;
  resend_api_key?: string;
  twilio_account_sid?: string;
  twilio_auth_token?: string;
  twilio_phone_number?: string;
  platform_name?: string;
  support_email?: string;
  platform_domain?: string;
  default_commission?: number;
  platform_tax?: number;
  razorpay_api_key?: string;
  razorpay_api_secret?: string;
  updated_at?: string;
}

const DEFAULT_SETTINGS: PlatformSettings = {
  id: 1,
  auth_mode: 'phone_only',
  otp_length: '4',
};

/**
 * Fetch global platform settings.
 * If the table doesn't exist or is empty, returns safe defaults.
 */
export async function getPlatformSettings(): Promise<PlatformSettings> {
  try {
    const { data, error } = await supabaseAdmin
      .from('platform_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (error) {
      if (error.code === '42P01') {
        // Table doesn't exist yet
        console.warn('[PlatformSettings] table not found. Using defaults.');
        return DEFAULT_SETTINGS;
      }
      console.error('[PlatformSettings] fetch error:', error);
      return DEFAULT_SETTINGS;
    }

    return data || DEFAULT_SETTINGS;
  } catch (err) {
    console.error('[PlatformSettings] exception:', err);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save global platform settings.
 */
export async function savePlatformSettings(updates: Partial<PlatformSettings>): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('platform_settings')
      .upsert({ id: 1, ...updates });

    if (error) {
      console.error('[PlatformSettings] save error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[PlatformSettings] save exception:', err);
    return false;
  }
}
