import { TABLES } from '../../../lib/constants';
import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/database';
import { addCustomDomainToVercel, removeCustomDomainFromVercel } from '../../../lib/vercel';
import { storeContext } from "../../../lib/storeContext";
import { getPermissionContext, canManageSection } from '../../../lib/permissions';

export const POST: APIRoute = async ({ request, locals, cookies }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    try {
        const ctx = getPermissionContext(cookies);
        if (!canManageSection(ctx, 'settings')) {
            return new Response(JSON.stringify({ error: 'Forbidden: You do not have permission to manage domains.' }), { status: 403 });
        }

        const storeId = locals.storeId;
        if (!storeId || storeId === '00000000-0000-0000-0000-000000000002') {
          return new Response(JSON.stringify({ error: 'Tenant context lost' }), { status: 400 });
        }
    
        const { custom_domain, action } = await request.json();
    
        if (!custom_domain) {
          return new Response(JSON.stringify({ error: 'Domain is required' }), { status: 400 });
        }
    
        const cleanDomain = custom_domain.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    
        // Prevent Platform Hijacking via Domain Collision
        if (cleanDomain.includes('vyaparpe.com') || cleanDomain.includes('vyaparpe.in') || cleanDomain.includes('vercel.app')) {
          return new Response(JSON.stringify({ error: 'Platform domains cannot be used as custom domains.' }), { status: 403 });
        }
    
        const { data: store } = await supabaseAdmin.from(TABLES.STORES).select('custom_domain, redirect_domains').eq('id', storeId).single();
        let redirectDomains: string[] = store?.redirect_domains || [];
    
        if (action === 'remove') {
          const vercelRes = await removeCustomDomainFromVercel(cleanDomain);
          if (!vercelRes.success) {
            return new Response(JSON.stringify({ error: vercelRes.error }), { status: 400 });
          }
    
          await supabaseAdmin.from(TABLES.STORES).update({ custom_domain: null, domain_status: 'none' }).eq('id', storeId);
          return new Response(JSON.stringify({ success: true }), { status: 200 });
        }
    
        if (action === 'remove_redirect') {
          const vercelRes = await removeCustomDomainFromVercel(cleanDomain);
          if (!vercelRes.success) {
            return new Response(JSON.stringify({ error: vercelRes.error }), { status: 400 });
          }
    
          redirectDomains = redirectDomains.filter(d => d !== cleanDomain);
          await supabaseAdmin.from(TABLES.STORES).update({ redirect_domains: redirectDomains }).eq('id', storeId);
          return new Response(JSON.stringify({ success: true }), { status: 200 });
        }
    
        if (action === 'add_redirect') {
          if (!store?.custom_domain) {
            return new Response(JSON.stringify({ error: 'You must set a primary domain first before adding redirect domains.' }), { status: 400 });
          }
          
          if (redirectDomains.includes(cleanDomain) || store.custom_domain === cleanDomain) {
            return new Response(JSON.stringify({ error: 'Domain already exists for this store.' }), { status: 400 });
          }
    
          const vercelRes = await addCustomDomainToVercel(cleanDomain, store.custom_domain);
          if (!vercelRes.success) {
            return new Response(JSON.stringify({ error: vercelRes.error }), { status: 400 });
          }
    
          redirectDomains.push(cleanDomain);
          await supabaseAdmin.from(TABLES.STORES).update({ redirect_domains: redirectDomains }).eq('id', storeId);
          return new Response(JSON.stringify({ success: true, domain: cleanDomain }), { status: 200 });
        }
    
        // Default action: Add Primary Domain
        // 1. Tell Vercel Edge to bind this domain
        const vercelRes = await addCustomDomainToVercel(cleanDomain);
        if (!vercelRes.success) {
          return new Response(JSON.stringify({ error: vercelRes.error }), { status: 400 });
        }
    
        // 2. Save to our database for internal routing
        const { error: dbError } = await supabaseAdmin
          .from(TABLES.STORES)
          .update({ custom_domain: cleanDomain, domain_status: 'pending' })
          .eq('id', storeId);
    
        if (dbError) {
          // Rollback Vercel if DB fails
          await removeCustomDomainFromVercel(cleanDomain);
          return new Response(JSON.stringify({ error: dbError.message }), { status: 500 });
        }
    
        return new Response(JSON.stringify({ success: true, domain: cleanDomain }), { status: 200 });
      } catch (err: any) {
        console.error('[Update Domain API] Error:', err);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
      }
  });
};
