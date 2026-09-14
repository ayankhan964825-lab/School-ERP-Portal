import { TABLES } from '../../../lib/constants';
import type { APIRoute } from 'astro';
import { getStaff, getSettings, supabaseAdmin, incrementFailedOtpAttempt, clearFailedOtpAttempts, clearCached } from '../../../lib/database';
import { getSuperAdminToken, hashPassword, signAdminSession } from '../../../lib/permissions';
import { storeContext } from "../../../lib/storeContext";
import { randomBytes } from 'node:crypto';

export const POST: APIRoute = async ({ request, cookies, redirect, locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    const storeId = locals.storeId || '';
    const formData = await request.formData();
    const email    = formData.get('email')?.toString().trim().toLowerCase() || '';
    const password = formData.get('password')?.toString() || '';
    
    if (email) {
      const maxAttempts = 10;
      // Increment attempt counter on every request. On successful login,
      // clearFailedOtpAttempts() resets it — so real users never get locked.
      if (!await incrementFailedOtpAttempt(`admin_${email}`, 'email', maxAttempts)) {
        return redirect('/admin/login?error=too_many_attempts');
      }
    }

    const currentSettings = await getSettings();
    let pc = currentSettings?.pages_content;
    if (typeof pc === 'string') { try { pc = JSON.parse(pc); } catch { pc = {}; } }
    if (!pc || typeof pc !== 'object') pc = {};
    const customEmail = pc.super_admin_custom_email;
    const customPasswordHash = pc.super_admin_custom_password_hash;
    const customName = pc.super_admin_custom_name || 'Super Admin';
    const adminEmail = customEmail || import.meta.env.ADMIN_EMAIL || process.env.ADMIN_EMAIL || '';
    const envAdminPassword = import.meta.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || '';
    let isPlatformSuperAdmin = false;
    let isStoreSuperAdmin = false;
    
    if (email && adminEmail && email === adminEmail.toLowerCase()) {
        if (customPasswordHash) {
          // Store has its own L0 password — ONLY check against that (not .env)
          if (hashPassword(password) === customPasswordHash) isStoreSuperAdmin = true;
        } else if (password === envAdminPassword) {
          // No custom password set — fall back to .env password
          isPlatformSuperAdmin = true;
        }
      }
      
    if (isPlatformSuperAdmin || isStoreSuperAdmin) {
        await clearFailedOtpAttempts(`admin_${email}`, 'email');
        // Single Active Session handling
        const adminSessionToken = randomBytes(32).toString('hex'); // 256-bit cryptographic entropy
        const superAdminId = getSuperAdminToken();
        
        // Check if an existing session is active to show the alert
        const activeSessions = pc.active_sessions || {};
        const hasExistingSession = !!activeSessions[superAdminId];
        
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        for (const [key, val] of Object.entries(activeSessions)) {
          const ts = typeof val === 'object' && val !== null ? (val as any).timestamp : 0;
          if (ts < thirtyDaysAgo) delete activeSessions[key];
        }
        activeSessions[superAdminId] = { token: adminSessionToken, timestamp: Date.now() };
        pc.active_sessions = activeSessions;
        if (supabaseAdmin) {
          await supabaseAdmin.from(TABLES.SETTINGS)
            .update({ pages_content: pc })
            .eq('id', currentSettings.id || '00000000-0000-0000-0000-000000000002');
          clearCached(`settings_${currentSettings.id || '00000000-0000-0000-0000-000000000002'}`);
          if (storeId) clearCached(`settings_${storeId}`);
          clearCached(`settings_SUPER_ADMIN_BYPASS`);
        }
    
        // Determine the scope of their super admin powers
        const grantedStoreId = isPlatformSuperAdmin ? 'SUPER_ADMIN_BYPASS' : storeId;
    
        cookies.set('admin_auth', 'true', { path: '/', maxAge: 60 * 60 * 24 * 7, httpOnly: true, secure: request.url.startsWith("https"), sameSite: 'lax' });
        cookies.set('admin_role', 'super_admin', { path: '/', maxAge: 60 * 60 * 24 * 7, httpOnly: true, secure: request.url.startsWith("https"), sameSite: 'lax' });
        const superAdminPerms = JSON.stringify({
          orders: 'manage', products: 'manage', customers: 'manage', marketing: 'manage', blog: 'manage', reports: 'manage', settings: 'manage', staff: 'manage'
        });
        cookies.set('admin_permissions', encodeURIComponent(superAdminPerms), { path: '/', maxAge: 60 * 60 * 24 * 7, httpOnly: true, secure: request.url.startsWith("https"), sameSite: 'lax' });
        cookies.set('admin_hierarchy', '0', { path: '/', maxAge: 60 * 60 * 24 * 7, httpOnly: true, secure: request.url.startsWith("https"), sameSite: 'lax' });
        cookies.set('admin_name', encodeURIComponent(customName), { path: '/', maxAge: 60 * 60 * 24 * 7, httpOnly: true, secure: request.url.startsWith("https"), sameSite: 'lax' });
        cookies.set('admin_id', superAdminId, { path: '/', maxAge: 60 * 60 * 24 * 7, httpOnly: true, secure: request.url.startsWith("https"), sameSite: 'lax' });
        cookies.set('admin_signature', signAdminSession(superAdminId, 'super_admin', grantedStoreId, superAdminPerms), { path: '/', maxAge: 60 * 60 * 24 * 7, httpOnly: true, secure: request.url.startsWith("https"), sameSite: 'lax' });
        cookies.set('admin_store', grantedStoreId, { path: '/', maxAge: 60 * 60 * 24 * 7, httpOnly: true, secure: request.url.startsWith("https"), sameSite: 'lax' });
        cookies.set('admin_session_token', adminSessionToken, { path: '/', maxAge: 60 * 60 * 24 * 7, httpOnly: true, secure: request.url.startsWith("https"), sameSite: 'lax' });
        
        if (hasExistingSession) {
          return redirect('/admin?alert=session_replaced');
        }
        return redirect('/admin');
      }
    try {
        const allStaff = await getStaff();
    
        const hashedInput = hashPassword(password);
        const member = allStaff.find(
          (s: any) =>
            s.email?.toString().trim().toLowerCase() === email &&
            s.password?.toString().trim() === hashedInput &&
            s.is_active !== false
        );
    
        if (member) {
          const normalizedRole = (member.role || 'custom').toLowerCase().replace(/ /g, '_');
          await clearFailedOtpAttempts(`admin_${email}`, 'email');
          cookies.set('admin_auth', 'true', {
            path: '/',
            maxAge: 60 * 60 * 24 * 7,
            httpOnly: true,
            secure: request.url.startsWith("https"),
            sameSite: 'lax',
          });
          cookies.set('admin_role', normalizedRole, {
            path: '/',
            maxAge: 60 * 60 * 24 * 7,
            httpOnly: true,
            secure: request.url.startsWith("https"),
            sameSite: 'lax',
          });
          const staffPerms = JSON.stringify(member.permissions || {});
          cookies.set('admin_permissions', encodeURIComponent(staffPerms), {
            path: '/',
            maxAge: 60 * 60 * 24 * 7,
            httpOnly: true,
            secure: request.url.startsWith("https"),
            sameSite: 'lax',
          });
          cookies.set('admin_name', member.name || 'Staff', {
            path: '/',
            maxAge: 60 * 60 * 24 * 7,
            httpOnly: true,
            secure: request.url.startsWith("https"),
            sameSite: 'lax',
          });
          cookies.set('admin_hierarchy', (member.hierarchy_level || 5).toString(), {
            path: '/',
            maxAge: 60 * 60 * 24 * 7,
            httpOnly: true,
            secure: request.url.startsWith("https"),
            sameSite: 'lax',
          });
          cookies.set('admin_id', member.id || '', {
            path: '/',
            maxAge: 60 * 60 * 24 * 7,
            httpOnly: true,
            secure: request.url.startsWith("https"),
            sameSite: 'lax',
          });
          cookies.set('admin_signature', signAdminSession(member.id || '', normalizedRole, storeId, staffPerms), {
            path: '/',
            maxAge: 60 * 60 * 24 * 7,
            httpOnly: true,
            secure: request.url.startsWith("https"),
            sameSite: 'lax',
          });
          cookies.set('admin_store', storeId, {
            path: '/',
            maxAge: 60 * 60 * 24 * 7,
            httpOnly: true,
            secure: request.url.startsWith("https"),
            sameSite: 'lax',
          });
          // Single Active Session handling
          const adminSessionToken = randomBytes(32).toString('hex'); // 256-bit cryptographic entropy
          const staffId = member.id || '';
          
          const activeSessions = pc.active_sessions || {};
          const hasExistingSession = !!activeSessions[staffId];
          
          const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
          for (const [key, val] of Object.entries(activeSessions)) {
            const ts = typeof val === 'object' && val !== null ? (val as any).timestamp : 0;
            if (ts < thirtyDaysAgo) delete activeSessions[key];
          }
          activeSessions[staffId] = { token: adminSessionToken, timestamp: Date.now() };
          pc.active_sessions = activeSessions;
          if (supabaseAdmin) {
            await supabaseAdmin.from(TABLES.SETTINGS)
              .update({ pages_content: pc })
              .eq('id', currentSettings.id || '00000000-0000-0000-0000-000000000002');
            clearCached(`settings_${currentSettings.id || '00000000-0000-0000-0000-000000000002'}`);
            if (storeId) clearCached(`settings_${storeId}`);
          }
    
          cookies.set('admin_session_token', adminSessionToken, {
            path: '/',
            maxAge: 60 * 60 * 24 * 7,
            httpOnly: true,
            secure: request.url.startsWith("https"),
            sameSite: 'lax',
          });
    
          if (hasExistingSession) {
            return redirect('/admin?alert=session_replaced');
          }
          return redirect('/admin');
        }
      } catch (err) {
        console.error('Staff login lookup error:', err);
      }
      // Auth failed — now increment the rate limit counter
      if (email) {
        await incrementFailedOtpAttempt(`admin_${email}`, 'email', 10).catch(() => {});
      }
    return redirect('/admin/login?error=invalid');
  });
};
