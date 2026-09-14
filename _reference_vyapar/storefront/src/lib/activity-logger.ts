import { supabaseAdmin } from './database';
import type { PermissionContext } from './permissions';
import { logSystemError } from './error-logger';

/**
 * Log an administrative action to the database.
 * @param ctx The permission context containing admin details
 * @param request The Astro request object (to extract IP address)
 * @param action The action performed (e.g., 'Provisioned Store', 'Approved Payout')
 * @param targetDetails Specifics of the action (e.g., 'Store: Bakery', 'Amount: 5000')
 */
export async function logAdminActivity(
  ctx: PermissionContext, 
  request: Request, 
  action: string, 
  targetDetails: string
) {
  try {
    // Attempt to extract IP address from common proxies (Cloudflare, Vercel, generic forwarded)
    const ipAddress = 
      request.headers.get('cf-connecting-ip') || 
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
      'unknown';

    const { error } = await supabaseAdmin.from('admin_activity_logs').insert({
      admin_id: ctx.adminId || 'unknown_admin',
      admin_name: ctx.adminName || 'Unknown Staff',
      admin_role: ctx.adminRole === 'super_admin' ? 'Super Admin' : (ctx.adminRole || 'Admin Staff'),
      action,
      target_details: targetDetails,
      ip_address: ipAddress
    });

    if (error) {
      console.error('[Activity Logger Error]: Failed to insert log', error);
    }
  } catch (err) {
    console.error('[Activity Logger Exception]:', err);
    await logSystemError(err, { source: 'activity-logger', action, targetDetails }, 'LOGGING_FAILURE');
  }
}
