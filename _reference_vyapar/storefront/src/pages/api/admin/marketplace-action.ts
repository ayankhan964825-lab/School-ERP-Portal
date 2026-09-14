import { TABLES } from '../../../lib/constants';
import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/database';
import { getPermissionContext, canManageSection } from '../../../lib/permissions';
import { storeContext } from "../../../lib/storeContext";

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
        const { app_id, action } = await request.json();
    
        if (!app_id || !['approve', 'reject'].includes(action)) {
          return new Response(JSON.stringify({ error: "Invalid parameters" }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
    
        const newStatus = action === 'approve' ? 'approved' : 'rejected';
    
        // 2. Update KYC Application Status
        const { error: updateErr } = await supabaseAdmin
          .from(TABLES.MARKETPLACE_APPLICATIONS)
          .update({ status: newStatus })
          .eq('id', app_id);
    
        if (updateErr) throw updateErr;
    
        // TODO in Production: Send an email/SMS notification to the tenant here.
    
        return new Response(JSON.stringify({ 
          success: true, 
          message: `Application successfully ${newStatus}!` 
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    
      } catch (error: any) {
        console.error('Marketplace action error:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
  });
};
