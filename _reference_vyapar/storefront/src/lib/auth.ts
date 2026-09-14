import crypto from 'node:crypto';

// Use service role key as the HMAC secret, or fallback to JWT_SECRET.
// This ensures that only the server can sign and verify customer auth cookies.
const getSecret = () => {
    return (import.meta as any).env?.SUPABASE_SERVICE_ROLE_KEY || 
           process.env.SUPABASE_SERVICE_ROLE_KEY || 
           process.env.JWT_SECRET || 
           'vyaparpe-local-dev-secret';
};

/**
 * Signs a customer ID to create a secure cookie value.
 * Format: customerId.hmac_signature
 */
export function signCustomerAuth(customerId: string): string {
    const secret = getSecret();
    const hmac = crypto.createHmac('sha256', secret).update(customerId).digest('hex');
    return `${customerId}.${hmac}`;
}

/**
 * Verifies a signed cookie value and returns the customer ID if valid.
 * Returns null if the signature is invalid or tampered with.
 */
export function verifyCustomerAuth(cookieValue: string | null | undefined): string | null {
    if (!cookieValue) return null;
    
    const lastDotIndex = cookieValue.lastIndexOf('.');
    if (lastDotIndex === -1) {
        return null;
    }

    const customerId = cookieValue.substring(0, lastDotIndex);
    const signature = cookieValue.substring(lastDotIndex + 1);
    if (!customerId || !signature) return null;

    const secret = getSecret();
    const expected = crypto.createHmac('sha256', secret).update(customerId).digest('hex');
    
    try {
        if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
            return customerId;
        }
    } catch (e) {
        // Fallthrough to reject
    }

    console.warn(`[Security] Invalid customer_auth signature detected for customerId: ${customerId}`);
    return null;
}

export function signRiderAuth(riderId: string, storeId: string): string {
    const secret = getSecret();
    const payload = `${riderId}:${storeId}`;
    const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    return Buffer.from(`${payload}.${hmac}`).toString('base64');
}

export function verifyRiderAuth(token: string): { riderId: string, storeId: string } | null {
    if (!token) return null;
    try {
        const decoded = Buffer.from(token, 'base64').toString('utf-8');
        const lastDotIndex = decoded.lastIndexOf('.');
        if (lastDotIndex === -1) return null;
        
        const payload = decoded.substring(0, lastDotIndex);
        const signature = decoded.substring(lastDotIndex + 1);
        
        const secret = getSecret();
        const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
        
        if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
            const [riderId, storeId] = payload.split(':');
            return { riderId, storeId };
        }
    } catch (e) {
        // Fallthrough
    }
    console.warn(`[Security] Invalid rider auth signature detected`);
    return null;
}

import { getSettings } from './database';
import { getPlatformSettings } from './platform-settings';

/**
 * Returns the effective auth mode by falling back if the preferred mode's API keys are missing.
 * E.g., if phone_only is set but Twilio is not configured, it falls back to email_only (if Resend is available).
 */
export async function getEffectiveAuthMode(storeId?: string): Promise<{
    authMode: string;
    hasTwilio: boolean;
    hasResend: boolean;
    otpLength: number;
    testMode: boolean;
}> {
    const settings = await getSettings(storeId);
    const platformSettings = await getPlatformSettings();
    
    const hasStoreTwilio = !!settings?.twilio_account_sid && !!settings?.twilio_auth_token && !!settings?.twilio_phone_number;
    const hasStoreResend = !!settings?.resend_api_key;
    
    const hasPlatformTwilio = !!platformSettings?.twilio_account_sid && !!platformSettings?.twilio_auth_token && !!platformSettings?.twilio_phone_number;
    const hasPlatformResend = !!platformSettings?.resend_api_key;

    let authMode = 'phone_only';

    if (hasStoreTwilio || hasStoreResend) {
        // Store has configured at least one API
        if (hasStoreTwilio && !hasStoreResend) {
            authMode = 'phone_only';
        } else if (!hasStoreTwilio && hasStoreResend) {
            authMode = 'email_only';
        } else {
            // Both are set by the store
            authMode = settings?.auth_mode || 'both';
        }
    } else {
        // Store has configured nothing. Use Platform configuration.
        if (hasPlatformTwilio && !hasPlatformResend) {
            authMode = 'phone_only';
        } else if (!hasPlatformTwilio && hasPlatformResend) {
            authMode = 'email_only';
        } else if (hasPlatformTwilio && hasPlatformResend) {
            // Platform has both
            authMode = platformSettings?.auth_mode || 'both';
        }
    }

    const hasTwilio = hasStoreTwilio || hasPlatformTwilio;
    const hasResend = hasStoreResend || hasPlatformResend;
    const testMode = settings?.test_otp_mode_enabled === 'true';
    
    return {
        authMode,
        hasTwilio,
        hasResend,
        otpLength: parseInt(settings?.otp_length || '4', 10),
        testMode
    };
}
