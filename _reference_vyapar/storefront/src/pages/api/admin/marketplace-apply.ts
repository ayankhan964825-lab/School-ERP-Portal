import { TABLES } from '../../../lib/constants';
import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/database';
import { getPermissionContext, canViewSection } from '../../../lib/permissions';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request, cookies, redirect , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    const ctx = getPermissionContext(cookies);
    const storeId = ctx.storeId;
    if (!storeId) {
        return new Response('Unauthorized', { status: 401 });
      }
    if (!canViewSection(ctx, 'marketing')) {
        return new Response('Forbidden. Insufficient permissions.', { status: 403 });
      }
    if (import.meta.env.MARKETPLACE_ENABLED !== 'true') {
        return new Response('Marketplace applications are not currently open.', { status: 403 });
      }
    const formData = await request.formData();
    const action = formData.get('action')?.toString();
    if (action === 'reapply') {
        // Delete old rejected application to allow new one
        await supabaseAdmin
          .from(TABLES.MARKETPLACE_APPLICATIONS)
          .delete()
          .eq('store_id', storeId)
          .eq('status', 'rejected');
        if (request.headers.get('accept')?.includes('application/json')) {
            return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        return redirect('/admin/marketplace');
      }
    const business_name = formData.get('business_name')?.toString();
    const gstin = formData.get('gstin')?.toString();
    const pan = formData.get('pan')?.toString();
    const bank_name = formData.get('bank_name')?.toString();
    const bank_account_no = formData.get('bank_account_no')?.toString();
    const bank_ifsc = formData.get('bank_ifsc')?.toString();
    if (!business_name || !pan || !bank_name || !bank_account_no || !bank_ifsc) {
        return new Response('Missing required fields', { status: 400 });
      }
    const { data: result, error } = await supabaseAdmin.rpc('atomic_marketplace_apply', {
        p_store_id: storeId,
        p_business_name: business_name,
        p_gstin: gstin,
        p_pan: pan.toUpperCase(),
        p_bank_name: bank_name,
        p_bank_account_no: bank_account_no,
        p_bank_ifsc: bank_ifsc.toUpperCase()
      });
    if (error) {
        console.error('Error applying for marketplace:', error);
        return new Response('Failed to submit application', { status: 500 });
      }
    if (!result.success) {
        return new Response(result.error || 'Failed to submit application', { status: 400 });
      }
    if (request.headers.get('accept')?.includes('application/json')) {
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return redirect('/admin/marketplace');
  });
};
