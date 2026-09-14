import { TABLES } from '../../../lib/constants';
import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/database';
import { signAdminSession } from '../../../lib/permissions';
import { getPlatformSettings } from '../../../lib/platform-settings';
import { verifyEmailOTP } from '../../../lib/email-otp';
import { getEffectiveAuthMode } from '../../../lib/auth';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    if (!supabaseAdmin) {
        return new Response(JSON.stringify({ error: "Database client not configured" }), { status: 500 });
      }
    try {
        const { phone, email, otp, hash, expiry, isOnboarding } = await request.json();
    
        if (!otp) {
          return new Response(JSON.stringify({ error: "OTP is required" }), { status: 400 });
        }
    
        const settings = await getPlatformSettings();
        const { authMode: mode } = await getEffectiveAuthMode(locals.storeId);
    
        const identifier = email || phone;
        const isEmail = !!email;
    
        // 1. Rate Limiting Check (Brute-Force Protection)
        const { incrementFailedOtpAttempt, clearFailedOtpAttempts } = await import('../../../lib/database');
        const maxAttempts = 5;
        if (!await incrementFailedOtpAttempt(`admin_${identifier}`, isEmail ? 'email' : 'phone', maxAttempts)) {
          return new Response(JSON.stringify({ error: "Too many failed attempts. Please try again after 15 minutes." }), { status: 429 });
        }

        // 2. Verify OTP
        if (isEmail) {
          if (!hash || !expiry) {
            return new Response(JSON.stringify({ error: "Missing session info" }), { status: 400 });
          }
          const configOverride = isOnboarding ? {
            resendKey: settings.resend_api_key || ''
          } : undefined;
    
          const isValid = await verifyEmailOTP(email, otp, hash, expiry, configOverride);
          if (!isValid) {
            return new Response(JSON.stringify({ error: "Invalid or expired Email OTP" }), { status: 401 });
          }
        } else {
          const { verifyOTP } = await import('../../../lib/twilio');
          // If hash and expiry are present, it means Twilio is configured and actually sent an SMS
          if (hash && expiry) {
            const isValid = await verifyOTP(phone, otp, hash, expiry);
            if (!isValid) {
              return new Response(JSON.stringify({ error: "Invalid or expired SMS OTP" }), { status: 401 });
            }
          } else {
            // Mock mode fallback when Twilio is not configured
            if (otp !== '123456') {
              return new Response(JSON.stringify({ error: "Invalid OTP. Please try again." }), { status: 401 });
            }
          }
        }
        
        await clearFailedOtpAttempts(`admin_${identifier}`, isEmail ? 'email' : 'phone');
    
        // 2. If this is an onboarding request, do NOT log them into a store.
        // Set a verification cookie so `provision-tenant` knows they are verified.
        if (isOnboarding) {
          const cookieOpts = {
            path: '/',
            httpOnly: true,
            secure: import.meta.env.PROD,
            sameSite: 'lax' as const,
            maxAge: 60 * 60 // 1 hour
          };
          // For simplicity, we just store the verified identifier
          cookies.set('onboarding_verified_identifier', identifier, cookieOpts);
    
          // Find existing stores
          const column = isEmail ? 'owner_email' : 'owner_phone';
          const { data: existingStores } = await supabaseAdmin
            .from(TABLES.STORES)
            .select('id, name, subdomain')
            .eq(column, identifier);

          return new Response(JSON.stringify({ 
              success: true, 
              message: "Verified successfully",
              existingStores: existingStores || []
          }), { status: 200 });
        }
    
        // 3. Normal Login Flow: Find the Store
        // Ensure sellers can only log into their specific subdomain
        const storeIdFromContext = locals?.storeId;
        
        // Block OTP login on the global marketplace domain for normal sellers
        if (storeIdFromContext === 'SUPER_ADMIN_BYPASS') {
          return new Response(JSON.stringify({ error: "Sellers must log in from their specific store subdomain (e.g. your-store.vyaparpe.in)" }), { status: 403 });
        }
    
        const column = isEmail ? 'owner_email' : 'owner_phone';
        const { data: store, error } = await supabaseAdmin
          .from(TABLES.STORES)
          .select('id, name')
          .eq(column, identifier)
          .eq('id', storeIdFromContext) // Security: Restrict lookup to current subdomain!
          .single();
    
        if (error || !store) {
          return new Response(JSON.stringify({ error: `Store not found for this ${isEmail ? 'email' : 'phone'} on this subdomain.` }), { status: 404 });
        }
    
        // 4. Issue Session Cookie for Tenant Admin
        const { getSuperAdminToken } = await import('../../../lib/permissions');
        const adminId = getSuperAdminToken(); 
        const role = 'super_admin';
        const storeId = store.id;
        
        const permsString = JSON.stringify({ products: 'manage', orders: 'manage', settings: 'manage', customers: 'manage', coupons: 'manage', blog: 'manage' });
        const signature = signAdminSession(adminId, role, storeId, permsString);
    
        const cookieOpts = {
          path: '/',
          httpOnly: true,
          secure: import.meta.env.PROD,
          sameSite: 'lax' as const,
          maxAge: 60 * 60 * 24 * 7 // 7 days
        };

        // Single Active Session handling
        const { getSettings } = await import('../../../lib/database');
        const currentSettings = await getSettings();
        let pc = currentSettings?.pages_content;
        if (typeof pc === 'string') { try { pc = JSON.parse(pc); } catch { pc = {}; } }
        if (!pc || typeof pc !== 'object') pc = {};
        
        const adminSessionToken = Date.now().toString() + Math.random().toString(36).substring(2, 7);
        const activeSessions = pc.active_sessions || {};
        const hasExistingSession = !!activeSessions[adminId];
        
        activeSessions[adminId] = adminSessionToken;
        pc.active_sessions = activeSessions;
        
        await supabaseAdmin
          .from(TABLES.SETTINGS)
          .update({ pages_content: pc })
          .eq('id', storeId);
    
        cookies.set('admin_auth', 'true', cookieOpts);
        cookies.set('admin_id', adminId, cookieOpts);
        cookies.set('admin_role', role, cookieOpts);
        cookies.set('admin_name', store.name, cookieOpts);
        cookies.set('admin_signature', signature, cookieOpts);
        cookies.set('admin_hierarchy', '0', cookieOpts);
        cookies.set('admin_permissions', encodeURIComponent(permsString), cookieOpts);
        cookies.set('admin_session_token', adminSessionToken, cookieOpts);
        cookies.set('admin_store', storeId, cookieOpts);
    
        return new Response(JSON.stringify({ 
          success: true, 
          redirect: hasExistingSession ? "/admin?alert=session_replaced" : "/admin" 
        }), { status: 200 });
    
      } catch (error: any) {
        console.error('Verify OTP error:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }
  });
};
