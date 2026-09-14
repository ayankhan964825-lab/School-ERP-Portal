import { TABLES } from '../../../lib/constants';
import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/database';
import { getPermissionContext, canManageSection } from '../../../lib/permissions';
import { logAdminActivity } from '../../../lib/activity-logger';
import { validateCsrfToken } from '../../../lib/csrf';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request, cookies, redirect , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    const ctx = getPermissionContext(cookies);
    if (!canManageSection(ctx, "super_admin")) {
        return redirect('/super-admin/login');
      }
    const formData = await request.formData();
    const id = formData.get('id')?.toString();
    const status = formData.get('status')?.toString();
    const csrfToken = formData.get('_csrf')?.toString();
    if (!validateCsrfToken(request, cookies, csrfToken)) {
        return redirect('/super-admin/services?error=csrf_invalid');
      }
    if (!id || !status) {
        return redirect('/super-admin/services?error=missing_data');
      }
    const allowedStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
    if (!allowedStatuses.includes(status)) {
        return redirect('/super-admin/services?error=invalid_status');
      }
    const { error } = await supabaseAdmin
        .from(TABLES.STORE_SERVICE_REQUESTS)
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
    if (error) {
        console.error('Error updating service request:', error);
        return redirect('/super-admin/services?error=update_failed');
      }
    await logAdminActivity(ctx, request, 'Updated Service Request', `New Status: ${status} | Request ID: ${id}`);
    return redirect('/super-admin/services?success=true');
  });
};

