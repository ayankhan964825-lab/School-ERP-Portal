import type { APIRoute } from 'astro';
import { getPermissionContext, canManageSection } from '../../../lib/permissions';
import { clearActivityLogs } from '../../../lib/database';
import { storeContext } from '../../../lib/storeContext';

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    try {
      const ctx = getPermissionContext(cookies);
      if (ctx.adminRole !== 'super_admin') return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });

      await clearActivityLogs(ctx.adminId, ctx.isOriginalSuperAdmin);
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (err: any) {
      console.error('Failed to clear activity logs:', err);
      return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
    }
  });
};
