import type { APIRoute } from 'astro';
import { getStaff, getSettings, saveSettings, updateStaffMember, getStaffDescendantIds, supabaseAdmin } from '../../../lib/database';
import { TABLES } from '../../../lib/constants';
import { sendEmailOTP, verifyEmailOTP, buildEmailOtpCookie } from '../../../lib/email-otp';
import { getSuperAdminToken, hashPassword, signAdminSession } from '../../../lib/permissions';

import { getPermissionContext, canManageSection } from '../../../lib/permissions';
import { storeContext } from "../../../lib/storeContext";

export const GET: APIRoute = async ({ cookies, locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    const ctx = getPermissionContext(cookies);
    const callerHierarchy = ctx.hierarchyLevel;
    const callerId = ctx.adminId;
    const isOriginalSuperAdmin = ctx.isOriginalSuperAdmin;

    // Only managers (3) and above can view requests
    if (callerHierarchy > 3) {
      return new Response(JSON.stringify({ error: 'Not authorized' }), { status: 403 });
    }

    try {
      const allStaff = await getStaff();
      let pendingStaff = allStaff.filter((s: any) => s.reset_requested);

      if (!isOriginalSuperAdmin) {
        const descendants = await getStaffDescendantIds(callerId);
        pendingStaff = pendingStaff.filter((s: any) => descendants.includes(s.id));
      }

      const requests = pendingStaff.map((s: any) => ({
         id: s.id, // Using staff ID as request ID since we use the reset_requested flag
         requester_id: s.id,
         requester_name: s.name,
         requester_email: s.email,
         requester_level: s.hierarchy_level,
         recovery_method: 'contact_super',
         created_at: new Date().toISOString(),
         status: 'pending'
      }));

      return new Response(JSON.stringify({ success: true, requests }), { status: 200 });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: 'Failed to fetch requests', details: err?.message }), { status: 500 });
    }
  });
};

export const POST: APIRoute = async ({ request, cookies , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    try {
        const body = await request.json();
        const { action, email, otp, new_password, request_id, staff_id } = body;
        
        const ctx = getPermissionContext(cookies);
        const callerHierarchy = ctx.hierarchyLevel;
        const callerId = ctx.adminId;
        const isOriginalSuperAdmin = ctx.isOriginalSuperAdmin;
    
        // Reject unauthenticated requests for all actions except send_otp and verify_and_reset
        if (ctx.adminRole === 'guest' && !['send_otp', 'verify_and_reset'].includes(action)) {
          return new Response(JSON.stringify({ error: 'Unauthorized session' }), { status: 401 });
        }
    
        // ── Super Admin OTP Flow ─────────────────────────────
        if (action === 'send_otp') {
          if (!email) return new Response(JSON.stringify({ error: 'Email required' }), { status: 400 });
          const cleanEmail = email.trim().toLowerCase();
          
          if (supabaseAdmin) {
            const RATE_LIMIT_MAX = 5;
            const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
            const identifier = cleanEmail;
            
            const { data: rateData, error: rateError } = await supabaseAdmin
              .from(TABLES.AUTH_RATE_LIMITS)
              .select('*')
              .eq('identifier', identifier)
              .single();
              
            if (rateData) {
              if (new Date() > new Date(rateData.reset_time)) {
                await supabaseAdmin.from(TABLES.AUTH_RATE_LIMITS).update({ requests_count: 1, reset_time: new Date(Date.now() + RATE_LIMIT_WINDOW_MS).toISOString() }).eq('identifier', identifier);
              } else if (rateData.requests_count >= RATE_LIMIT_MAX) {
                return new Response(JSON.stringify({ error: "Too many OTP requests. Please try again after 10 minutes." }), { status: 429 });
              } else {
                await supabaseAdmin.from(TABLES.AUTH_RATE_LIMITS).update({ requests_count: rateData.requests_count + 1 }).eq('identifier', identifier);
              }
            } else if (rateError && rateError.code === 'PGRST116') {
              await supabaseAdmin.from(TABLES.AUTH_RATE_LIMITS).insert({ identifier, requests_count: 1, reset_time: new Date(Date.now() + RATE_LIMIT_WINDOW_MS).toISOString() });
            }
          }
          
          const { success, error, mock, bypassOTP, otp: generatedOtp, expiry } = await sendEmailOTP(cleanEmail);
          if (!success) return new Response(JSON.stringify({ error: error || 'Failed to send OTP email.' }), { status: 500 });
    
          if (generatedOtp && expiry) {
            const hash = buildEmailOtpCookie(cleanEmail, generatedOtp, expiry);
            cookies.set('admin_reset_otp_hash', hash, { path: '/', httpOnly: true, secure: true, maxAge: 600 });
            cookies.set('admin_reset_otp_expiry', expiry.toString(), { path: '/', httpOnly: true, secure: true, maxAge: 600 });
            cookies.set('admin_reset_otp_email', cleanEmail, { path: '/', httpOnly: true, secure: true, maxAge: 600 });
          }
    
          return new Response(JSON.stringify({ success: true, mock, bypassOTP }), { status: 200 });
        }
    
        if (action === 'verify_and_reset') {
          if (!otp || !new_password) return new Response(JSON.stringify({ error: 'OTP and new password required' }), { status: 400 });
          
          const cleanEmail = email.trim().toLowerCase();
          const hash = cookies.get('admin_reset_otp_hash')?.value;
          const sessionExpiry = cookies.get('admin_reset_otp_expiry')?.value;
          const storedEmail = cookies.get('admin_reset_otp_email')?.value;
    
          if (!hash || !sessionExpiry || !storedEmail || storedEmail !== cleanEmail) {
            return new Response(JSON.stringify({ error: 'Session expired or invalid.' }), { status: 400 });
          }
    
          const isValid = await verifyEmailOTP(cleanEmail, otp.trim(), hash, sessionExpiry);
          if (!isValid) return new Response(JSON.stringify({ error: 'Invalid or expired OTP.' }), { status: 400 });
    
          const currentSettings = await getSettings();
          let pc = currentSettings.pages_content;
          if (typeof pc === 'string') { try { pc = JSON.parse(pc); } catch {} }
          const customEmail = (pc && typeof pc === 'object' && pc.super_admin_custom_email) ? pc.super_admin_custom_email : null;
          const adminEmail = (customEmail || import.meta.env.ADMIN_EMAIL || process.env.ADMIN_EMAIL || '').toLowerCase();
          
          if (cleanEmail === adminEmail) {
            // Original Super Admin
            const currentSettings = await getSettings();
            let pc = currentSettings.pages_content;
            if (typeof pc === 'string') { try { pc = JSON.parse(pc); } catch { pc = {}; } }
            if (!pc || typeof pc !== 'object') pc = {};
            pc.super_admin_custom_password_hash = hashPassword(new_password.trim());
            delete pc.super_admin_custom_password;
            
            const adminSessionToken = Date.now().toString() + Math.random().toString(36).substring(2, 7);
            const activeSessions = pc.active_sessions || {};
            activeSessions[getSuperAdminToken()] = adminSessionToken;
            pc.active_sessions = activeSessions;
            
            await saveSettings({ pages_content: pc });
    
            setLoginCookies(cookies, {
              id: getSuperAdminToken(), name: 'Super Admin', role: 'super_admin', hierarchy_level: 0,
              permissions: { orders: 'manage', products: 'manage', customers: 'manage', marketing: 'manage', blog: 'manage', reports: 'manage', settings: 'manage', staff: 'manage' }
            }, locals.storeId, adminSessionToken);
          } else {
            const allStaff = await getStaff();
            const targetStaff = allStaff.find((s: any) => s.email?.toLowerCase() === cleanEmail);
            if (targetStaff) {
              await updateStaffMember(targetStaff.id, { password: hashPassword(new_password.trim()), reset_requested: false });
              
              const currentSettings = await getSettings();
              let pc = currentSettings.pages_content;
              if (typeof pc === 'string') { try { pc = JSON.parse(pc); } catch { pc = {}; } }
              if (!pc || typeof pc !== 'object') pc = {};
              
              const adminSessionToken = Date.now().toString() + Math.random().toString(36).substring(2, 7);
              const activeSessions = pc.active_sessions || {};
              activeSessions[targetStaff.id] = adminSessionToken;
              pc.active_sessions = activeSessions;
              
              await saveSettings({ pages_content: pc });
              
              setLoginCookies(cookies, targetStaff, locals.storeId, adminSessionToken);
            }
          }
    
          cookies.delete('admin_reset_otp_hash', { path: '/' });
          cookies.delete('admin_reset_otp_expiry', { path: '/' });
          cookies.delete('admin_reset_otp_email', { path: '/' });
    
          return new Response(JSON.stringify({ success: true }), { status: 200 });
        }
    
        // ── Standard Staff Reset Requests Management ─────────────────────────────
        if (action === 'approve') {
          if (!staff_id || !new_password) return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
          if (!isOriginalSuperAdmin) {
            const descendants = await getStaffDescendantIds(callerId);
            if (!descendants.includes(staff_id)) return new Response(JSON.stringify({ error: 'Not authorized' }), { status: 403 });
          }
          await updateStaffMember(staff_id, { password: hashPassword(new_password.trim()), reset_requested: false });
          return new Response(JSON.stringify({ success: true }), { status: 200 });
        }
    
        if (action === 'reject' || action === 'dismiss') {
          if (!staff_id) return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
          if (!isOriginalSuperAdmin) {
            const descendants = await getStaffDescendantIds(callerId);
            if (!descendants.includes(staff_id)) return new Response(JSON.stringify({ error: 'Not authorized' }), { status: 403 });
          }
          await updateStaffMember(staff_id, { reset_requested: false });
          return new Response(JSON.stringify({ success: true }), { status: 200 });
        }
    
        return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 });
      } catch (err: any) {
        console.error('Password recovery error:', err);
        return new Response(JSON.stringify({ error: 'Internal server error', details: err?.message }), { status: 500 });
      }
  });
};

function setLoginCookies(cookies: any, member: any, storeId: string, sessionToken: string) {
  const maxAge = 60 * 60 * 24 * 7;
  const cookieOpts = { path: '/', maxAge, httpOnly: true, secure: true, sameSite: 'lax' as any };
  const permsString = JSON.stringify(member.permissions || {});
  cookies.set('admin_auth', 'true', cookieOpts);
  cookies.set('admin_role', member.role || 'custom', cookieOpts);
  cookies.set('admin_permissions', encodeURIComponent(permsString), cookieOpts);
  cookies.set('admin_name', member.name || 'Staff', cookieOpts);
  cookies.set('admin_hierarchy', (member.hierarchy_level || 5).toString(), cookieOpts);
  cookies.set('admin_id', member.id || '', cookieOpts);
  cookies.set('admin_signature', signAdminSession(member.id || '', member.role || 'custom', storeId, permsString), cookieOpts);
  cookies.set('admin_store', storeId, cookieOpts);
  cookies.set('admin_session_token', sessionToken, cookieOpts);
}
