import type { APIRoute } from 'astro';
import { getActivityLogs } from '../../../lib/database';
import { getPermissionContext, canManageSection } from '../../../lib/permissions';

export const GET: APIRoute = async ({ cookies }) => {
  const ctx = getPermissionContext(cookies);
  if (ctx.adminRole !== 'super_admin') return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });

  try {
    const ctx = getPermissionContext(cookies);
    const callerId = ctx.adminId;
    const isOriginalSuperAdmin = ctx.isOriginalSuperAdmin;

    // Fetch logs (getActivityLogs will enforce the branch-level scoping logic)
    const logs = await getActivityLogs(callerId, isOriginalSuperAdmin);

    return new Response(JSON.stringify({ success: true, logs }), { status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: 'Failed to fetch activity logs', details: error?.message }), { status: 500 });
  }
};
