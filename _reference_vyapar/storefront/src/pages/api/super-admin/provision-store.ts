import { TABLES } from '../../../lib/constants';
import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/database';
import { getPermissionContext, canManageSection } from '../../../lib/permissions';
import { logAdminActivity } from '../../../lib/activity-logger';
import { validateCsrfToken } from '../../../lib/csrf';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request, cookies , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    if (!validateCsrfToken(request, cookies)) {
        return new Response(JSON.stringify({ error: 'CSRF token missing or invalid' }), { status: 403 });
      }
    try {
        const ctx = getPermissionContext(cookies);
        if (!canManageSection(ctx, "super_admin")) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
        }
    
        const body = await request.json();
        const { name, subdomain, contact_email, contact_phone, plan_id } = body;
    
        if (!name || !subdomain) {
          return new Response(JSON.stringify({ error: 'Name and Subdomain are required' }), { status: 400 });
        }
    
        const cleanSubdomain = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '');
    
        // Check subdomain uniqueness
        const { data: existing } = await supabaseAdmin
          .from(TABLES.STORES)
          .select('id')
          .eq('subdomain', cleanSubdomain)
          .single();
    
        if (existing) {
          return new Response(JSON.stringify({ error: `Subdomain "${cleanSubdomain}" is already taken. Choose another.` }), { status: 409 });
        }
    
        // Resolve plan details for commission rate
        let commission_rate = 2.0;
        let resolvedPlanId = null;
        if (plan_id) {
          const { data: plan } = await supabaseAdmin
            .from(TABLES.SUBSCRIPTION_PLANS)
            .select('id, commission_rate')
            .eq('id', plan_id)
            .single();
          if (plan) {
            commission_rate = plan.commission_rate ?? 2.0;
            resolvedPlanId = plan.id;
          }
        }
    
        // Insert store
        const { data: newStore, error: storeError } = await supabaseAdmin
          .from(TABLES.STORES)
          .insert({
            name,
            subdomain: cleanSubdomain,
            owner_email: contact_email,
            owner_phone: contact_phone,
            status: 'active',
            plan_id: resolvedPlanId,
            commission_rate
          })
          .select()
          .single();
    
        if (storeError) {
          return new Response(JSON.stringify({ error: storeError.message }), { status: 500 });
        }
    
        // Initialize default settings for this store
        const { error: settingsError } = await supabaseAdmin
          .from(TABLES.SETTINGS)
          .insert({
            id: 'default',
            store_id: newStore.id,
            store_name: name,
            brand_name: name,
            currency: 'INR',
            contact_email: contact_email || '',
            contact_phone: contact_phone || '',
            team_members: [],
            parent_company_name: '',
            footer_description: 'Welcome to our store. We provide the best quality products.',
            about_hero_title: `Welcome to ${name}`,
            about_hero_text: 'We are committed to delivering the best products and experience to our customers.',
            about_mission_title: 'Our Mission',
            about_mission_text: 'To provide high-quality products that enrich the lives of our customers.',
            about_approach_title: 'Our Approach',
            about_approach_text: 'We focus on quality, sustainability, and customer satisfaction above all else.'
          });
    
        if (settingsError) {
          console.error('[Provision] Failed to create settings for store', settingsError);
        }
    
        // Create wallet for the store
        const { error: walletError } = await supabaseAdmin
          .from(TABLES.WALLETS)
          .insert({
            store_id: newStore.id,
            balance: 0,
            total_earned: 0,
            total_commission_paid: 0,
            total_payouts: 0,
            last_updated: new Date().toISOString()
          });
    
        if (walletError) {
          console.error('[Provision] Failed to create wallet for store', walletError);
        }
    
        // Log the activity
        await logAdminActivity(ctx, request, 'Provisioned Store', `Store: ${name} (${cleanSubdomain}.vyaparpe.in)`);
    
        return new Response(JSON.stringify({ success: true, store: newStore }), { status: 200 });
      } catch (err: any) {
        console.error('[Provision] Error:', err);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
      }
  });
};

