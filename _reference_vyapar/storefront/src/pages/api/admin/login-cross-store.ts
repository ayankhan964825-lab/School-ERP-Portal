import { TABLES } from '../../../lib/constants';
import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/database';
import { getSuperAdminToken, signAdminSession } from '../../../lib/permissions';
import { randomBytes } from 'node:crypto';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { storeId } = await request.json();

    if (!storeId) {
      return new Response(JSON.stringify({ error: "Missing storeId" }), { status: 400 });
    }

    // 1. Verify that the user has completed OTP verification during onboarding
    const verifiedIdentifier = cookies.get('onboarding_verified_identifier')?.value;
    
    if (!verifiedIdentifier) {
      return new Response(JSON.stringify({ error: "Unauthorized. Please verify your OTP first." }), { status: 401 });
    }

    // 2. Fetch the target store and verify ownership
    const { data: store, error } = await supabaseAdmin
      .from(TABLES.STORES)
      .select('id, name, subdomain, owner_email, owner_phone')
      .eq('id', storeId)
      .single();

    if (error || !store) {
      return new Response(JSON.stringify({ error: "Store not found" }), { status: 404 });
    }

    // Verify ownership matches the verified identifier (either email or phone)
    if (store.owner_email !== verifiedIdentifier && store.owner_phone !== verifiedIdentifier) {
      return new Response(JSON.stringify({ error: "Unauthorized. You do not own this store." }), { status: 403 });
    }

    // Fetch custom name from settings if available
    const { data: storeSettings } = await supabaseAdmin
      .from(TABLES.SETTINGS)
      .select('pages_content')
      .eq('store_id', storeId)
      .single();

    let pc = storeSettings?.pages_content || {};
    if (typeof pc === 'string') { try { pc = JSON.parse(pc); } catch { pc = {}; } }
    
    const customName = pc.super_admin_custom_name || store.name || 'Store Owner';

    // 3. Mint Session
    const adminSessionToken = randomBytes(32).toString('hex');
    const superAdminId = getSuperAdminToken();

    // Set Cookies
    const host = new URL(request.url).hostname;
    const cookieDomain = host.includes('vyaparpe.in') ? '.vyaparpe.in' : (host.includes('localhost') ? 'localhost' : undefined);
    const cookieOpts = { 
      path: '/', 
      domain: cookieDomain,
      maxAge: 60 * 60 * 24 * 7, 
      httpOnly: true, 
      secure: request.url.startsWith("https"), 
      sameSite: 'lax' as const 
    };
    
    cookies.set('admin_auth', 'true', cookieOpts);
    cookies.set('admin_role', 'super_admin', cookieOpts);
    const superAdminPerms = JSON.stringify({
      orders: 'manage', products: 'manage', customers: 'manage', marketing: 'manage', blog: 'manage', reports: 'manage', settings: 'manage', staff: 'manage'
    });
    cookies.set('admin_permissions', encodeURIComponent(superAdminPerms), cookieOpts);
    cookies.set('admin_hierarchy', '0', cookieOpts);
    cookies.set('admin_name', encodeURIComponent(customName), cookieOpts);
    cookies.set('admin_id', superAdminId, cookieOpts);
    cookies.set('admin_signature', signAdminSession(superAdminId, 'super_admin', storeId, superAdminPerms), cookieOpts);
    cookies.set('admin_store', storeId, cookieOpts);
    cookies.set('admin_session_token', adminSessionToken, cookieOpts);

    // Determine the base host (removing 'www.' if present)
    const baseHost = request.headers.get('host')?.replace('www.', '') || host;
    const protocol = request.url.startsWith("https") ? 'https://' : 'http://';
    
    return new Response(JSON.stringify({ 
      success: true, 
      redirectUrl: store.subdomain ? `${protocol}${store.subdomain}.${baseHost}/admin` : '/admin'
    }), { status: 200 });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), { status: 500 });
  }
};
