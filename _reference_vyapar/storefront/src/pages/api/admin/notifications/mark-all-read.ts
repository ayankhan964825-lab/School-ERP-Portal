import { getPermissionContext, canManageSection } from '../../../../lib/permissions';
import type { APIRoute } from 'astro';
import { markAllNotificationsRead } from '../../../../lib/database';
import { storeContext } from "../../../../lib/storeContext";

export const POST: APIRoute = async ({ cookies , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    const ctx = getPermissionContext(cookies);
    if (!canManageSection(ctx, 'orders')) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    try {
        await markAllNotificationsRead(ctx.adminId, locals.storeId);
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      } catch (err: any) {
        console.error('Failed to mark all notifications read:', err);
        return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
      }
  });
};
