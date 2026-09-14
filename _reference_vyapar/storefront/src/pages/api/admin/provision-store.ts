import { TABLES } from '../../../lib/constants';
import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/database';
import { getPermissionContext, canManageSection } from '../../../lib/permissions';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request, cookies, redirect , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    const ctx = getPermissionContext(cookies);
    if (!canManageSection(ctx, "super_admin")) {
        return new Response("Forbidden", { status: 403 });
      }
    if (!supabaseAdmin) {
        return new Response("Database client not configured", { status: 500 });
      }
    try {
        // 2. Parse Form Data
        const formData = await request.formData();
        const name = formData.get('store_name')?.toString().trim();
        const subdomain = formData.get('subdomain')?.toString().trim().toLowerCase();
        const owner_phone = formData.get('owner_phone')?.toString().trim();
        const contact_email = formData.get('contact_email')?.toString().trim();
        const plan_type = formData.get('plan_type')?.toString().trim() || 'free';
    
        if (!name || !subdomain || !owner_phone) {
          return new Response("Missing required fields", { status: 400 });
        }
    
        // 3. Check Subdomain Availability
        const { data: existing } = await supabaseAdmin
          .from(TABLES.STORES)
          .select('id')
          .eq('subdomain', subdomain)
          .single();
    
        if (existing) {
          return new Response(`Subdomain "${subdomain}" is already taken.`, { status: 400 });
        }
    
        // 4. Generate Store ID (uuid v4)
        const store_id = crypto.randomUUID();
    
        // Determine Commission Rate
        let commission_rate = 2.0;
        if (plan_type === 'free') commission_rate = 5.0;
        if (plan_type === 'enterprise') commission_rate = 1.0;
        if (plan_type === 'god_mode') commission_rate = 0.0;
    
        // Fetch the plan_id based on plan_type string
        let plan_id = null;
        if (plan_type !== 'god_mode') {
          const { data: planData } = await supabaseAdmin
            .from(TABLES.SUBSCRIPTION_PLANS)
            .select('id')
            .eq('plan_type', plan_type === 'enterprise' ? 'growth' : plan_type)
            .single();
          if (planData) plan_id = planData.id;
        }
    
        // 5. Insert Store
        const { error: storeErr } = await supabaseAdmin
          .from(TABLES.STORES)
          .insert({
            id: store_id,
            name,
            subdomain,
            owner_phone,
            owner_email: contact_email,
            plan_id,
            commission_rate,
            status: 'active',
            domain_status: 'pending'
          });
    
        if (storeErr) throw storeErr;
    
        // 6. Provision Default Settings for new tenant
        const { error: settingsErr } = await supabaseAdmin
          .from(TABLES.SETTINGS)
          .insert({
            store_id,
            store_name: name,
            support_phone: owner_phone,
            support_email: contact_email || '',
            currency: 'INR',
            timezone: 'Asia/Kolkata',
            pages_content: {},
            website_theme: { active_preset: 'classic' },
            website_configuration: { enable_whatsapp_float: true }
          });
    
        if (settingsErr) throw settingsErr;
    
        // 7. Redirect back to stores page on success
        return redirect('/super-admin/stores?success=provisioned');
    
      } catch (error: any) {
        console.error('Provisioning error:', error);
        return new Response(`Error provisioning store: ${error.message}`, { status: 500 });
      }
  });
};
