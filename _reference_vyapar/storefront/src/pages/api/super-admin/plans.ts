import { TABLES } from '../../../lib/constants';
import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/database';
import { getPermissionContext, canManagePlans } from '../../../lib/permissions';
import { logAdminActivity } from '../../../lib/activity-logger';
import { validateCsrfToken } from '../../../lib/csrf';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request, cookies, redirect , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    const ctx = getPermissionContext(cookies);
    if (!canManagePlans(ctx)) {
        return new Response('Unauthorized', { status: 401 });
      }
    const formData = await request.formData();
    const id = formData.get('id')?.toString();
    const action = formData.get('action')?.toString();
    const csrfToken = formData.get('_csrf')?.toString();
    if (!validateCsrfToken(request, cookies, csrfToken)) {
        return redirect('/super-admin/plans?error=csrf_invalid');
      }
    const name = formData.get('name')?.toString() || '';
    const slug = formData.get('slug')?.toString() || '';
    const plan_type = formData.get('plan_type')?.toString() || 'free';
    const is_active = formData.get('is_active') === 'true';
    const price_monthly = parseFloat(formData.get('price_monthly')?.toString() || '0');
    const price_yearly = parseFloat(formData.get('price_yearly')?.toString() || '0');
    const price_onetime = parseFloat(formData.get('price_onetime')?.toString() || '0');
    let commission_rate = parseFloat(formData.get('commission_rate')?.toString() || '5.0');
    if (isNaN(commission_rate) || commission_rate < 0 || commission_rate > 100) {
        commission_rate = 5.0; // fallback to default if invalid
      }
    const digital_commission_str = formData.get('digital_commission_rate')?.toString();
    const digital_commission_rate = digital_commission_str ? parseFloat(digital_commission_str) : null;
    const max_products = parseInt(formData.get('max_products')?.toString() || '50', 10);
    const max_staff = parseInt(formData.get('max_staff')?.toString() || '3', 10);
    const features = {
        custom_domain: formData.get('feat_custom_domain') === 'on',
        premium_themes: formData.get('feat_premium_themes') === 'on',
        marketplace_access: formData.get('feat_marketplace_access') === 'on'
      };
    const payload = {
        name,
        slug,
        plan_type,
        is_active,
        price_monthly,
        price_yearly,
        price_onetime,
        commission_rate,
        digital_commission_rate,
        max_products,
        max_staff,
        features,
        updated_at: new Date().toISOString()
      };
    let error;
    if (id) {
        // Update existing
        const { error: updateError } = await supabaseAdmin
          .from(TABLES.SUBSCRIPTION_PLANS)
          .update(payload)
          .eq('id', id);
        error = updateError;
      } else {
        // Insert new
        const { error: insertError } = await supabaseAdmin
          .from(TABLES.SUBSCRIPTION_PLANS)
          .insert([payload]);
        error = insertError;
      }
    if (error) {
        console.error('Error saving plan:', error);
        return new Response('Database Error', { status: 500 });
      }
    await logAdminActivity(ctx, request, id ? 'Updated Plan' : 'Created Plan', `Plan: ${name} (${plan_type})`);
    return redirect('/super-admin/plans');
  });
};
