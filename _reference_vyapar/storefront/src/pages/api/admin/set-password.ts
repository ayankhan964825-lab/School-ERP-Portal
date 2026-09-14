import type { APIRoute } from 'astro';
import { getSettings, supabaseAdmin } from '../../../lib/database';
import { getPermissionContext, canManageSection, hashPassword } from '../../../lib/permissions';
import { storeContext } from '../../../lib/storeContext';
import { TABLES } from '../../../lib/constants';

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    const ctx = getPermissionContext(cookies);
    if (!canManageSection(ctx, 'settings')) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }

    if (!supabaseAdmin) {
      return new Response(JSON.stringify({ error: 'Database client not configured' }), { status: 500 });
    }

    try {
      const body = await request.json();
      const { password, confirmPassword } = body;

      if (!password || typeof password !== 'string' || password.length < 6) {
        return new Response(JSON.stringify({ error: 'Password must be at least 6 characters.' }), { status: 400 });
      }
      if (password !== confirmPassword) {
        return new Response(JSON.stringify({ error: 'Passwords do not match.' }), { status: 400 });
      }

      const currentSettings = await getSettings();
      let pc = currentSettings?.pages_content || {};
      if (typeof pc === 'string') { try { pc = JSON.parse(pc); } catch { pc = {}; } }
      if (!pc || typeof pc !== 'object') pc = {};

      // Hash the new password and store it in pages_content
      pc.super_admin_custom_password_hash = hashPassword(password);

      // Also preserve the email if not already set (to override ADMIN_EMAIL env)
      const settingsId = currentSettings?.id;
      if (!settingsId) {
        return new Response(JSON.stringify({ error: 'Settings not found for this store.' }), { status: 500 });
      }

      const { error } = await supabaseAdmin
        .from(TABLES.SETTINGS)
        .update({ pages_content: pc })
        .eq('id', settingsId);

      if (error) {
        console.error('[set-password] Supabase error:', error);
        throw error;
      }

      return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (err: any) {
      console.error('[set-password] Error:', err);
      return new Response(JSON.stringify({ error: err.message || 'Failed to set password' }), { status: 500 });
    }
  });
};
