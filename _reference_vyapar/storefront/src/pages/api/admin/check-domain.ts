import { TABLES } from '../../../lib/constants';
import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/database';
import { checkDomainStatusFromVercel } from '../../../lib/vercel';
import { getPermissionContext, canManageSection } from '../../../lib/permissions';

export const GET: APIRoute = async ({ request, locals, cookies }) => {
  try {
    const ctx = getPermissionContext(cookies);
    if (!canManageSection(ctx, "settings")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
    const storeId = locals.storeId;
    if (!storeId || storeId === '00000000-0000-0000-0000-000000000002') {
      return new Response(JSON.stringify({ error: 'Tenant context lost' }), { status: 400 });
    }

    const url = new URL(request.url);
    const domain = url.searchParams.get('domain');

    if (!domain) {
      return new Response(JSON.stringify({ error: 'Domain is required' }), { status: 400 });
    }

    const cleanDomain = domain.toLowerCase().trim();

    // Check status via Vercel Edge API
    const vercelRes = await checkDomainStatusFromVercel(cleanDomain);
    
    if (!vercelRes.success) {
      return new Response(JSON.stringify({ error: vercelRes.error }), { status: 400 });
    }

    // Only update DB status for the primary domain (if it matches what is saved in the DB)
    // First, fetch the store to see if this is the primary custom_domain
    const { data: store } = await supabaseAdmin.from(TABLES.STORES).select('custom_domain').eq('id', storeId).single();

    if (store && store.custom_domain === cleanDomain) {
        await supabaseAdmin.from(TABLES.STORES).update({ domain_status: vercelRes.status }).eq('id', storeId);
    }

    return new Response(JSON.stringify(vercelRes), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    console.error('[Check Domain API] Error:', err);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
};
