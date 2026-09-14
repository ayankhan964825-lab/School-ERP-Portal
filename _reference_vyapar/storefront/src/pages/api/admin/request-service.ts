import { TABLES } from '../../../lib/constants';
import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/database';
import { storeContext } from "../../../lib/storeContext";
import { getPermissionContext, canManageSection } from '../../../lib/permissions';

export const POST: APIRoute = async ({ request, locals, cookies, redirect }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    const ctx = getPermissionContext(cookies);
    if (!canManageSection(ctx, 'settings')) {
        return new Response(JSON.stringify({ success: false, error: 'Forbidden: You do not have permission to request services.' }), { status: 403 });
    }

    const storeId = locals.storeId;
    if (!storeId || storeId === 'SUPER_ADMIN_BYPASS') {
        return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), { status: 401 });
      }
    const formData = await request.formData();
    const service_type = formData.get('service_type')?.toString();
    const priceStr = formData.get('price')?.toString();
    const notes = formData.get('notes')?.toString();
    if (!service_type || !priceStr) {
        return redirect('/admin/services?error=missing_fields');
      }
    const price = parseFloat(priceStr);
    const { error } = await supabaseAdmin
        .from(TABLES.STORE_SERVICE_REQUESTS)
        .insert([{
          store_id: storeId,
          service_type,
          price,
          notes,
          status: 'pending'
        }]);
    if (error) {
        console.error('Error creating service request:', error);
        if (request.headers.get('accept')?.includes('application/json')) {
            return new Response(JSON.stringify({ error: 'Failed to create request' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }
        return redirect('/admin/services?error=creation_failed');
      }
    if (request.headers.get('accept')?.includes('application/json')) {
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return redirect('/admin/services?success=true');
  });
};
