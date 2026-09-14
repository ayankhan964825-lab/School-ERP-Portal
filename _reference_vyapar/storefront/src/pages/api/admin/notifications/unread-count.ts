import type { APIRoute } from 'astro';
import { getNotifications } from '../../../../lib/database';
import { getPermissionContext } from '../../../../lib/permissions';

export const GET: APIRoute = async ({ cookies }) => {
  if (!cookies.has('admin_auth')) {
    return new Response(JSON.stringify({ count: 0 }), { status: 200 });
  }
  try {
    const ctx = getPermissionContext(cookies);
    const notifications = await getNotifications(ctx.adminId);
    const count = notifications.filter((n: any) => !n.is_read).length;
    return new Response(JSON.stringify({ count }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    });
  } catch {
    return new Response(JSON.stringify({ count: 0 }), { status: 200 });
  }
};
