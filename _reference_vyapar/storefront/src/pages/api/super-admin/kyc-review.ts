import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/database';
import { getPermissionContext, canApproveMarketplace } from '../../../lib/permissions';
import { validateCsrfToken } from '../../../lib/csrf';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request, cookies, redirect , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    const ctx = getPermissionContext(cookies);
    if (!canApproveMarketplace(ctx)) {
        return new Response('Unauthorized', { status: 401 });
      }
    const formData = await request.formData();
    const application_id = formData.get('application_id')?.toString();
    const store_id = formData.get('store_id')?.toString();
    const decision = formData.get('decision')?.toString();
    const review_notes = formData.get('review_notes')?.toString() || '';
    const csrfFromForm = formData.get('_csrf')?.toString();
    if (!validateCsrfToken(request, cookies, csrfFromForm)) {
        return new Response("CSRF Validation Failed", { status: 403 });
      }
    if (!application_id || !store_id || !decision) {
        return new Response('Missing required fields', { status: 400 });
      }
    const { error: kycError } = await supabaseAdmin.rpc('atomic_kyc_review', {
        p_application_id: application_id,
        p_store_id: store_id,
        p_decision: decision,
        p_review_notes: review_notes,
        p_admin_name: ctx.adminName
      });
    if (kycError) {
        console.error('Error updating KYC atomically:', kycError);
        return new Response('Failed to update KYC application', { status: 500 });
      }
    return redirect('/super-admin/kyc');
  });
};
