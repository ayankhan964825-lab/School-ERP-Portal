import { getPermissionContext, canManageSection } from '../../../../lib/permissions';
import type { APIRoute } from 'astro';
import { markNotificationRead } from '../../../../lib/database';
import { storeContext } from "../../../../lib/storeContext";

export const POST: APIRoute = async ({ request, cookies , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    const ctx = getPermissionContext(cookies);
    if (!canManageSection(ctx, 'orders')) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    try {
        const { id } = await request.json();
        if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 });
    
        const updated = await markNotificationRead(id, ctx.adminId);
        if (!updated) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
    
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      } catch (err: any) {
        console.error('Failed to mark notification read:', err);
        return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
      }
  });
};
