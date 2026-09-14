import { TABLES } from '../../../lib/constants';
import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/database';
import { getPermissionContext, canManageSection, signAdminSession, getSuperAdminToken, hashPassword } from '../../../lib/permissions';
import { validateCsrfToken } from '../../../lib/csrf';
import { storeContext } from "../../../lib/storeContext";
import { randomBytes } from 'node:crypto';

export const POST: APIRoute = async ({ request, cookies , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    const ctx = getPermissionContext(cookies);
    const isSuperAdmin = canManageSection(ctx, 'super_admin');
    const verifiedIdentifier = cookies.get('onboarding_verified_identifier')?.value;
    const isValidCsrf = validateCsrfToken(request, cookies);
    if (!isSuperAdmin && !isValidCsrf) {
        return new Response(JSON.stringify({ success: false, error: "CSRF token validation failed." }), { status: 403, headers: { 'Content-Type': 'application/json' } });
      }
    if (!isSuperAdmin && !verifiedIdentifier) {
        return new Response(JSON.stringify({ success: false, error: "Forbidden. OTP verification or Super Admin access required." }), { status: 403, headers: { 'Content-Type': 'application/json' } });
      }
    if (!supabaseAdmin) {
        return new Response(JSON.stringify({ success: false, error: "Database client not configured" }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    try {
        let body: Record<string, any>;
        const contentType = request.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          body = await request.json();
        } else {
          const fd = await request.formData();
          body = Object.fromEntries(fd.entries());
        }
        
        const name = (body.name || body.store_name)?.trim();
        const subdomain = (body.subdomain)?.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
        let contact_phone = (body.phone || body.owner_phone)?.trim() || null;
        let contact_email = (body.email || body.contact_email)?.trim() || null;
        const plan_id = body.plan_id || body.plan_type;
        const passwordHash = body.passwordHash?.trim() || null;
        const rawPassword = body.password?.trim() || null;
    
        if (!name || !subdomain || !plan_id) {
          return new Response(JSON.stringify({ success: false, error: "Missing required fields" }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
    
        if (!contact_phone && !contact_email) {
          return new Response(JSON.stringify({ success: false, error: "Either phone or email is required" }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
    
        // Verify the identifier matches the OTP verified identifier (if not super admin)
        if (!isSuperAdmin) {
           if (contact_phone !== verifiedIdentifier && contact_email !== verifiedIdentifier) {
             return new Response(JSON.stringify({ success: false, error: "Submitted contact does not match verified OTP." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
           }
        }
    
        // 1. Fetch Plan Details
        const { data: planData, error: planErr } = await supabaseAdmin
          .from(TABLES.SUBSCRIPTION_PLANS)
          .select('commission_rate')
          .eq('id', plan_id)
          .single();
    
        if (planErr || !planData) {
          return new Response(JSON.stringify({ success: false, error: "Invalid plan selected" }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
    
        // 2. Check Subdomain Availability
        const { data: existing } = await supabaseAdmin
          .from(TABLES.STORES)
          .select('id')
          .eq('subdomain', subdomain)
          .single();
    
        if (existing) {
          return new Response(JSON.stringify({ success: false, error: `Subdomain "${subdomain}" is already taken.` }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
    
        // 3. Manual Provisioning (Bypassing RPC to avoid allow_overselling error)
        const { data: newStore, error: storeError } = await supabaseAdmin
          .from(TABLES.STORES)
          .insert({
            name,
            subdomain,
            owner_phone: contact_phone,
            owner_email: contact_email,
            status: 'active',
            plan_id,
            commission_rate: planData.commission_rate
          })
          .select()
          .single();
    
        if (storeError || !newStore) {
          console.error('[Provision] Store Insert Failed:', storeError);
          throw storeError || new Error('Failed to create store');
        }
    
        // Initialize default settings for this store (without allow_overselling)
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

        // Save password hash in pages_content if provided
        const finalPasswordHash = passwordHash || (rawPassword ? hashPassword(rawPassword) : null);
        if (finalPasswordHash) {
          const { data: settingsRow } = await supabaseAdmin
            .from(TABLES.SETTINGS)
            .select('pages_content')
            .eq('store_id', newStore.id)
            .single();

          let pc = settingsRow?.pages_content || {};
          if (typeof pc === 'string') { try { pc = JSON.parse(pc); } catch { pc = {}; } }
          if (!pc || typeof pc !== 'object') pc = {};
          pc.super_admin_custom_password_hash = finalPasswordHash;

          await supabaseAdmin
            .from(TABLES.SETTINGS)
            .update({ pages_content: pc })
            .eq('store_id', newStore.id);
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
    
        // 4. Issue Session Cookies for the New Store Owner (Seamless Login)
        const adminId = getSuperAdminToken(); 
        const role = 'super_admin';
        const storeId = newStore.id;
        
        const permsString = JSON.stringify({
          orders: 'manage', products: 'manage', customers: 'manage', marketing: 'manage', blog: 'manage', reports: 'manage', settings: 'manage', staff: 'manage'
        });
        const signature = signAdminSession(adminId, role, storeId, permsString);
        const adminSessionToken = randomBytes(32).toString('hex');
    
        const host = new URL(request.url).hostname;
        // Fix: for localhost, set domain to localhost so cookies work across subdomains (e.g. store1.localhost).
        // On production, set domain to .vyaparpe.in so cookies are shared across subdomains.
        const cookieDomain = host.includes('vyaparpe.in') ? '.vyaparpe.in' : (host.includes('localhost') ? 'localhost' : undefined);

        const cookieOpts = {
          path: '/',
          httpOnly: true,
          secure: request.url.startsWith("https"),
          sameSite: 'lax' as const,
          domain: cookieDomain,
          maxAge: 60 * 60 * 24 * 7 // 7 days
        };

        cookies.set('admin_auth', 'true', cookieOpts);
        cookies.set('admin_id', adminId, cookieOpts);
        cookies.set('admin_role', role, cookieOpts);
        cookies.set('admin_signature', signature, cookieOpts);
        cookies.set('admin_store', storeId, cookieOpts);
        cookies.set('admin_session_token', adminSessionToken, cookieOpts);
        cookies.set('admin_permissions', encodeURIComponent(permsString), cookieOpts);
        cookies.set('admin_hierarchy', '0', cookieOpts);
        
        // Remove the temporary onboarding verification cookie
        cookies.delete('onboarding_verified_identifier', { path: '/' });

        return new Response(JSON.stringify({ success: true, store_id: newStore.id }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    
      } catch (error: any) {
        console.error('Provisioning error:', error);
        return new Response(JSON.stringify({ success: false, error: error.message || 'Error provisioning store' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
  });
};
