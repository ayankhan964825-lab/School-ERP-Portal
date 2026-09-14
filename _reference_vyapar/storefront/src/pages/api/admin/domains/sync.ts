import { TABLES } from '../../../../lib/constants';
import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../../lib/database';
import { getPermissionContext, canManageSection } from '../../../../lib/permissions';
import { storeContext } from "../../../../lib/storeContext";

export const POST: APIRoute = async ({ request, cookies , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    const ctx = getPermissionContext(cookies);
    if (!canManageSection(ctx, "super_admin")) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { 'Content-Type': 'application/json' } });
      }
    if (!supabaseAdmin) {
        return new Response(JSON.stringify({ error: "Database client not configured" }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    try {
        const { action, domain } = await request.json().catch(() => ({ action: 'sync_all' }));
    
        const VERCEL_TOKEN = import.meta.env.VERCEL_API_TOKEN || process.env.VERCEL_API_TOKEN;
        const VERCEL_PROJECT_ID = import.meta.env.VERCEL_PROJECT_ID || process.env.VERCEL_PROJECT_ID;
    
        // --- MOCK MODE FOR LOCAL DEV ---
        // If Vercel tokens are missing, we simulate the API to unblock local testing.
        const isMockMode = !VERCEL_TOKEN || !VERCEL_PROJECT_ID;
    
        if (action === 'sync_all') {
          // Find all stores with custom domains that are not fully active
          const { data: stores, error: fetchErr } = await supabaseAdmin
            .from(TABLES.STORES)
            .select('id, custom_domain, domain_status')
            .not('custom_domain', 'is', null)
            .neq('custom_domain', '');
    
          if (fetchErr || !stores) throw fetchErr || new Error("Failed to fetch stores");
    
          let syncedCount = 0;
          let errors = [];
    
          for (const store of stores) {
            if (isMockMode) {
              // Simulate successful sync in mock mode
              await supabaseAdmin.from(TABLES.STORES).update({ domain_status: 'active' }).eq('id', store.id);
              syncedCount++;
              console.log(`[MOCK VERCEL] Synced domain ${store.custom_domain}`);
              continue;
            }
    
            // REAL VERCEL API CALL
            try {
              const res = await fetch(`https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${VERCEL_TOKEN}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: store.custom_domain })
              });
              
              if (!res.ok && res.status !== 409) { // 409 means already exists, which is fine
                throw new Error(`Vercel API error: ${res.statusText}`);
              }
              
              // Verify configuration immediately
              const verifyRes = await fetch(`https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${store.custom_domain}`, {
                headers: { 'Authorization': `Bearer ${VERCEL_TOKEN}` }
              });
              const verifyData = await verifyRes.json();
              
              const newStatus = verifyData?.verified ? 'active' : 'pending';
              await supabaseAdmin.from(TABLES.STORES).update({ domain_status: newStatus }).eq('id', store.id);
              syncedCount++;
            } catch (err: any) {
              errors.push({ domain: store.custom_domain, error: err.message });
            }
          }
    
          return new Response(JSON.stringify({ 
            success: true, 
            message: `Synced ${syncedCount} domains. ${isMockMode ? '(MOCK MODE)' : ''}`,
            errors: errors.length > 0 ? errors : undefined
          }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
    
        if (action === 'verify_single' && domain) {
          if (isMockMode) {
            await supabaseAdmin.from(TABLES.STORES).update({ domain_status: 'active' }).eq('custom_domain', domain);
            return new Response(JSON.stringify({ success: true, message: "Domain verified (MOCK)" }), { status: 200, headers: { 'Content-Type': 'application/json' } });
          }
    
          // REAL VERCEL VERIFY CALL
          const verifyRes = await fetch(`https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${domain}/verify`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${VERCEL_TOKEN}` }
          });
          const verifyData = await verifyRes.json();
          
          const newStatus = verifyData?.verified ? 'active' : 'pending';
          await supabaseAdmin.from(TABLES.STORES).update({ domain_status: newStatus }).eq('custom_domain', domain);
    
          return new Response(JSON.stringify({ 
            success: true, 
            message: newStatus === 'active' ? "Domain is fully configured and active!" : "Domain DNS is still propagating or misconfigured.",
            status: newStatus
          }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
    
        return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    
      } catch (error: any) {
        console.error('Domain sync error:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
  });
};
